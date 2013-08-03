var levelup = require('levelup');
var MemDB = require('memdb');
var Cache = require('..');

var db = Cache(MemDB(), MemDB());

db.put('foo', 'bar', function (err) {
  if (err) throw err;
  db.get('foo', function (err, value) {
    if (err) throw err;
    console.log('got: ' + value);
    db.close();
  });
});
