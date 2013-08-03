var test = require('tape');
var Range = require('../lib/range');
var Stream = require('stream');

test('start and end', function (t) {
  t.equal(Range({ start: 'start' }).start, 'start');
  t.equal(Range({ end: 'end' }).end, 'end');
  t.equal(Range().start, '');
  t.equal(Range().end, '!');
  t.end();
});

test('synced', function (t) {
  var s = new Stream();
  var r = Range();
  t.notOk(r.synced);
  r.push(s);
  s.emit('sync');
  t.ok(r.synced);
  t.end();
});

test('push', function (t) {
  var a = new Stream();
  var b = new Stream();
  var r = Range();
  t.equal(r.streams.length, 0);
  r.push(a);
  t.equal(r.streams[0], a);
  r.push(b);
  t.equal(r.streams[0], a);
  t.equal(r.streams[1], b);
  t.end();
});

test('unshift', function (t) {
  var a = new Stream();
  var b = new Stream();
  var r = Range();
  t.equal(r.streams.length, 0);
  r.unshift(a);
  t.equal(r.streams[0], a);
  r.unshift(b);
  t.equal(r.streams[0], b);
  t.equal(r.streams[1], a);
  t.end();
});

test('destroy', function (t) {
  t.plan(2);
  var s = new Stream();
  s.destroy = function () {
    t.ok(true);
  };
  var r = Range();
  r.push(s);
  r.destroy();
  t.equal(r.streams.length, 0);
});

// too lazy...
// encloses
// isSubRange
// equals
// beginsBefore
// beginsAfter
// endsBefore
// endsAfter