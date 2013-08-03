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

test('writes to the cache', function (t, db, source, cache) {
  t.plan(2);

  var ws = db.createWriteStream();
  ws.write({ key: 'foo', value: 'bar' });
  ws.on('close', function (err) {
    cache.get('foo', function (err, value) {
      t.error(err);
      t.equal(value, 'bar');
    });
  });
  ws.end();
});

test('writes to the source', function (t, db, source, cache) {
  t.plan(2);

  var ws = db.createWriteStream();
  ws.write({ key: 'foo', value: 'bar' });
  ws.on('close', function (err) {
    source.get('foo', function (err, value) {
      t.error(err);
      t.equal(value, 'bar');
    });
  });
  ws.end();
});


