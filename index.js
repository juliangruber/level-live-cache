var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var liveStream = require('level-live-stream');
var through = require('through');
var o = require('obj');
var Range = require('./lib/range');

module.exports = Db;

function Db (source, cache) {
  if (!(this instanceof Db)) return new Db(source, cache);
  Emitter.call(this);

  this.source = source;
  if (!source.createLiveStream) liveStream.install(source);
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
      fn(null, value);
      self.cache.put(key, value, self.error());
    });
  });
};

Db.prototype.put = function (key, value, fn) {
  var self = this;
  // todo: watchKey?
  self.cache.put(key, value, function (err) {
    fn(err);
    if (!err) self.source.put(key, value, self.error());
  });
};

Db.prototype.createKeyStream = function (opts) {
  return this.createReadStream(o(opts).set('values', false).get());
};

Db.prototype.createValueStream = function (opts) {
  return this.createReadStream(o(opts).set('keys', false).get());
};

Db.prototype.createReadStream = function (opts) {
  var range = Range(opts).findEncloser(this.ranges);

  if (!range) {
    this.watchRange(opts);
    // todo: watchRange is already creating a stream
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

Db.prototype.close = function (fn) {
  this.ranges.forEach(call('destroy'));
  this.ranges = [];
  if (fn) process.nextTick(fn);
};

Db.prototype.watchKey = function (key) {
  return this.watchRange({ start: key, end: key });
};

Db.prototype.watchRange = function (opts) {
  var r = new Range(opts);

  for (var i = 0; i < this.ranges.length; i++) {
    var c = this.ranges[i]; // candidate
    if (r.subRangeOf(c) || r.equals(c)) return;
    if (r.encloses(c)) {
      if (r.startsBefore(c)) widenStart(this, r, c);
      if (r.endsAfter(c)) widenEnd(this, r, c);
      return;
    }
  }

  addRange(this, r, opts);
};

function addRange (self, range, opts) {
  self.ranges.push(range);
  var live = self.source.createLiveStream(opts);
  range.push(live);
  live.pipe(self.cache.createWriteStream());
}

function widenStart (self, range, candidate) {
  var live = self.source.createLiveStream({
    start: range.start,
    end: candidate.start
  });
  candidate.unshift(live);
  candidate.start = range.start;
  live.pipe(self.cache.createWriteStream());
}

function widenEnd (self, range, candidate) {
  var live = this.source.createLiveStream({
    start: candidate.end,
    end: range.end
  });
  candidate.push(live);
  candidate.end = range.end;
  live.pipe(this.cache.createWriteStream());
}

Db.prototype.error = function () {
  return function (err) {
    if (err) this.emit('error', err);
  };
};

function call (m) {
  return function (o) {
    o[m]();
  }
}

