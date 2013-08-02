var levelup = require('levelup');
var memdown = require('memdown');
var Cache = require('..');
var memdown = function (l) { return new (require('memdown'))(l) };

var db = Cache(levelup('source', { db: memdown }));

db.put('foo', 'bar', function (err) {
  if (err) throw err;
  db.get('foo', function (err, value) {
    if (err) throw err;
    console.log('got: ' + value);
    db.close();
  });
});
