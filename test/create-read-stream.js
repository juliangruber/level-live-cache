var tape = require('tape');
var Cache = require('..');
var MemDB = require('memdb');
var through = require('through');

function test (name, fn) {
  tape.test(name, function (t) {
    var source = MemDB();
    var cache = MemDB();
    var db = Cache(source, cache);
    fn(t, db, source, cache);
  });
}

test('reads data from source', function (t, db, source, cache) {
  t.plan(4);

  source.put('foo', 'bar', function (err) {
    t.error(err);
    db.createReadStream().pipe(through(write, end));

    function write (kv) {
      t.equal(kv.key, 'foo');
      t.equal(kv.value, 'bar');
    }

    function end () {
      t.ok(true, 'ended');
    }
  });
});

