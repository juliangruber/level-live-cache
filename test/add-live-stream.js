var test = require('tape');
var Cache = require('..');
var MemDB = require('memdb');

test('adds live stream to source', function (t, db, source, cache) {
  var source = MemDB();
  var cache = MemDB();
  var db = Cache(source, cache);
  t.ok(source.createLiveStream);
  t.end();
});

test('doesn\'t add live stream if already exists', function (t) {
  var fn = function () {};
  var source = MemDB();
  source.createLiveStream = fn;
  var cache = MemDB();
  var db = Cache(source, cache);
  t.equal(source.createLiveStream, fn);
  t.end();
});
