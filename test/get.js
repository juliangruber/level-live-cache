var test = require('tape');
var Cache = require('..');
var MemDB = require('memdb');

test('watch key', function (t) {
  t.plan(4);

  var source = MemDB();
  var cache = MemDB();
  var db = Cache(source, cache);

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
