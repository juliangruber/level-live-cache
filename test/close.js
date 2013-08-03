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

test('close works sync', function (t, db, source, cache) {
  t.plan(3);
  db.get('foo', function (err) {
    t.ok(err);
    t.equal(db.ranges.length, 1);
    db.close();
    t.equal(db.ranges.length, 0);
    // todo: test if streams were destroyed
  });
});

test('close calls callback asyncly', function (t, db, source, cache) {
  t.plan(2);
  var closed = false;
  db.close(function () {
    closed = true;
    t.ok(true);
  });
  t.notOk(closed);
});

