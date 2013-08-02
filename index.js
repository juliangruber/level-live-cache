var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var map = require('map-stream');
var live = require('level-live-stream');
var levelup = require('levelup');
var memdown = function (l) { return new (require('memdown'))(l) };
var through = require('through');
var o = require('obj');

module.exports = Db;

function Db (source) {
  if (!(this instanceof Db)) return new Db(source);
  Emitter.call(this);

  this.clone = levelup('clone', { db: memdown });
  this.source = source;
  live.install(this.source);

  this.streams = [];
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
  self.clone.on('put', function (key, value) {
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

  self.clone.get(key, function (err, value) {
    if (!err) {
      self.getting.splice(self.getting.indexOf(key), 1);
      fn(null, value);
    }

    self.source.get(key, function (err, value) {
      self.getting.splice(self.getting.indexOf(key), 1);
      if (err) return fn(err);
      self.clone.put(key, value, fn);
    });
  });
};

Db.prototype.put = function (key, value, fn) {
  var self = this;
  self.clone.put(key, value, function (err) {
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




function Range (opts) {
  if (!(this instanceof Range)) return new Range(opts);
  Emitter.call(this);
  opts = opts || {};
  this.start = opts.start || '';
  this.end = opts.end || '!';
  this.streams = [];
  this.synced = false;
}

inherits(Range, Emitter);

Range.prototype.push = function (stream) {
  this.streams.push(stream);
  stream.on('sync', set(this, 'synced', true));
};

Range.prototype.destroy = function () {
  this.streams.forEach(call('destroy'));
};

Range.prototype.encloses = function (range) {
  return this.start <= range.start
    && this.end >= range.end;
};

Range.prototype.isSubRange = function (range) {
  if (this.equals(range)) return false;
  return this.start >= range.start && this.end <= range.end;
};

Range.prototype.equals = function (r) {
  return this.start == r.start && this.end == r.end;
};

Range.prototype.beginsAfter = function (r) {
  return this.start > r.start;
};

Range.prototype.beginsBefore = function (r) {
  return this.start < r.start;
};

Range.prototype.endsAfter = function (r) {
  return this.end > r.end;
};

Range.prototype.endsBefore = function (r) {
  return this.end < r.end;
};

Db.prototype.createReadStream = function (opts) {
  var range = this.enclosingRange(opts);

  if (!range) {
    this.watchRange(opts);
    this.source.createReadStream();
    return;
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
  this.streams.forEach(call('destroy'));
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
      this.ranges.push(r);

      if (r.startsBefore(range)) {
        var l = live(this.source, { start: r.start, end: range.start });
        r.push(l);
        l.pipe(this.cache.createWriteStream());
      }

      if (r.endsAfter(range)) {
        var l = live(this.source, { start: range.end, end: r.end });
        r.push(l);
        l.pipe(this.cache.createWriteStream());
      }

      range.destroy();
      this.ranges.splice(i, 1);
      return;
    }
  }

  // need to create new range
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

function set (o, k, v) {
  return function () {
    o[k] = v;
  };
}
