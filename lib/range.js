var Emitter = require('events').EventEmitter;
var inherits = require('util').inherits;

module.exports = Range;

function Range (start, end) {
  if (!(this instanceof Range)) return new Range(start, end);
  Emitter.call(this);
  if (typeof start == 'object') {
    end = start.end;
    start = start.start;
  }
  this.start = start || '';
  this.end = end || '!';
  this.streams = [];
  this.synced = false;
}

inherits(Range, Emitter);

Range.prototype.push = function (stream) {
  this.streams.push(stream);
  stream.on('sync', set(this, 'synced', true));
};

Range.prototype.unshift = function (stream) {
  this.streams.unshift(stream);
  stream.on('sync', set(this, 'synced', true));
};

Range.prototype.destroy = function () {
  this.streams.forEach(call('destroy'));
  this.streams = [];
};

Range.prototype.findEncloser = function (ranges) {
  for (var i = 0; i < ranges.length; i++) {
    var candidate = ranges[i];
    if (candidate.encloses(this)) return candidate;
  }
  return false;
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
