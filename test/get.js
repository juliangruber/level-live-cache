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

test('key is watched', function (t, db, source, cache) {
  t.plan(4);

  db.get('foo', function (err) {
    t.ok(err);
    source.put('foo', 'bar', function (err) {
      t.error(err);
      db.get('foo', function (err, value) {
        t.error(err);
        t.equal(value, 'bar');
      });
    });
  });
});

test('key is watched right number of times', function (t, db, source, cache) {
  t.plan(5);

  t.equal(db.ranges.length, 0);
  db.get('foo', function (err) {
    t.ok(err);
    t.equal(db.ranges.length, 1);
    db.get('foo', function (err) {
      t.ok(err);
      t.equal(db.ranges.length, 1);
    });
  });
});

test('double request result in only one operation', function (t, db, source, cache) {
  t.plan(6);

  source.put('foo', 'bar', function (err) {
    t.error(err);

    db.on('foo', function (value) {
      t.equal(value, 'bar', 'event emitted');
    });
    db.get('foo', function (err, value) {
      t.error(err);
      t.equal(value, 'bar', 'got value');
    });
    db.get('foo', function (err, value) {
      t.error(err);
      t.equal(value, 'bar', 'got value');
    });
  });
});

test('cache hit cleans up getting array', function (t, db, source, cache) {
  t.plan(4);

  cache.put('foo', 'bar', function (err) {
    db.get('foo', function (err, value) {
      t.error(err);
      t.equal(value, 'bar');
      t.equal(db.getting.length, 0);
    });
    t.equal(db.getting.length, 1);
  });
});
