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

test('caches data', function (t, db, source, cache) {
  t.plan(2);

  source.put('foo', 'bar', function (err) {
    t.error(err);
    // make sure client has data
    db.createReadStream().on('end', function () {
      cache.createReadStream().pipe(through(write, end));
      var res = [];
      function write (kv) { res.push(kv) }
      function end () {
        t.deepEqual(res, [{ key: 'foo', value: 'bar' }]);
      }
    });
  });
});

test('keeps client updated', function (t, db, source, cache) {
  t.plan(3);

  source.put('foo', 'bar', function (err) {
    t.error(err);

    // make sure client has data
    db.createReadStream().on('end', function () {
      source.put('bar', 'baz', function (err) {
        t.error(err);

        // wait until cache has data
        setTimeout(function () {
          var res = [];
          cache.createReadStream().pipe(through(write, end));
          function write (kv) { res.push(kv) }
          function end () {
            t.deepEqual(res, [
              { key: 'bar', value: 'baz' },
              { key: 'foo', value: 'bar' }
            ]);
          }
        }, 100);
      });
    });
  });
});

