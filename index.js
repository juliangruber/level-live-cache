var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var live = require('level-live-stream');
var through = require('through');
var o = require('obj');
var Range = require('./lib/range');

module.exports = Db;

function Db (source, cache) {
  if (!(this instanceof Db)) return new Db(source, cache);
  Emitter.call(this);

  this.source = source;
  live.install(this.source);
  this.cache = cache;

  this.getting = [];
  this.ranges = [];
  this.putEvents();
}

inherits(Db, Emitter);

// 1) ensure watching
// 2) handle cache
// 3) handle db

Db.prototype.putEvents = function () {
  var self = this;
  self.cache.on('put', function (key, value) {
    self.emit(key, value);
  });
};

Db.prototype.get = function (key, fn) {
  var self = this;
  self.watchKey(key);

  if (self.getting.indexOf(key) > -1) {
    self.once(key, fn.bind(null, null));
    return;
  }
  self.getting.push(key);

  self.cache.get(key, function (err, value) {
    if (!err) {
      self.getting.splice(self.getting.indexOf(key), 1);
      fn(null, value);
      return;
    }

    self.source.get(key, function (err, value) {
      self.getting.splice(self.getting.indexOf(key), 1);
      if (err) return fn(err);
      self.cache.put(key, value, fn);
    });
  });
};

Db.prototype.put = function (key, value, fn) {
  var self = this;
  self.cache.put(key, value, function (err) {
    fn(err);
    if (!err) {
      self.source.put(key, value, function (err) {
        if (err) self.emit('error', err);
      });
    }
  });
};

Db.prototype.createKeyStream = function (opts) {
  return this.createReadStream(o(opts).set('values', false).get());
};

Db.prototype.createValueStream = function (opts) {
  return this.createReadStream(o(opts).set('keys', false).get());
};

Db.prototype.createReadStream = function (opts) {
  var range = this.enclosingRange(opts);

  if (!range) {
    this.watchRange(opts);
    return this.source.createReadStream(opts);
  }

  return range.synced
    ? this.cache.createReadStream(opts)
    : this.source.createReadStream(opts);
};

Db.prototype.createWriteStream = function (opts) {
  var tr = through();
  tr.pipe(this.source.createWriteStream(opts));
  tr.pipe(this.cache.createWriteStream(opts));
  return tr;
};

Db.prototype.close = function () {
  this.ranges.forEach(call('destroy'));
};

Db.prototype.watchKey = function (key) {
  return this.watchRange({ start: key, end: key });
};

Db.prototype.enclosingRange = function (opts) {
  var r = new Range(opts);
  for (var i = 0; i < this.ranges.length; i++) {
    if (this.ranges[i].encloses(r)) return this.ranges[i];
  }

  return false;
}

Db.prototype.watchRange = function (opts) {
  var r = new Range(opts);

  // backwards because we're removing things
  for (var i = this.ranges.length - 1; i > -1; i--) {
    var range = this.ranges[i];

    if (r.isSubRange(range) || r.equals(range)) return true;

    if (r.encloses(range)) {
      if (r.startsBefore(range)) {
        var l = live(this.source, { start: r.start, end: range.start });
        range.unshift(l);
        range.start = r.start;
        l.pipe(this.cache.createWriteStream());
      }

      if (r.endsAfter(range)) {
        var l = live(this.source, { start: range.end, end: r.end });
        range.push(l);
        range.end = r.end;
        l.pipe(this.cache.createWriteStream());
      }

      return;
    }
  }

  // need to add new range
  this.ranges.push(r);

  var l = live(this.source, opts);
  r.push(l);
  l.pipe(this.cache.createWriteStream());

  return false;
}

Db.prototype.error = function () {
  return this.emit.bind(this, 'error');
};

function call (m) {
  return function (o) {
    o[m]();
  }
}

