var tape = require('tape');
var Cache = require('..');
var MemDB = require('memdb');

function test (name, fn) {
  tape.test(name, function (t) {
    var source = MemDB();
    var cache = MemDB();
    var db = Cache(source, cache);
    fn(t, db, source, cache);
  });
}

test('puts to the cache', function (t, db, source, cache) {
  t.plan(3);

  db.put('foo', 'bar', function (err) {
    t.error(err);
    cache.get('foo', function (err, value) {
      t.error(err);
      t.equal(value, 'bar');
    });
  });
});

test('puts to the source', function (t, db, source, cache) {
  t.plan(3);

  db.put('foo', 'bar', function (err) {
    t.error(err);
    process.nextTick(function () {
      source.get('foo', function (err, value) {
        t.error(err);
        t.equal(value, 'bar');
      });
    });
  });
});

