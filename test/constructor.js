var test = require('tape');
var Cache = require('..');
var MemDB = require('memdb');
var Emitter = require('events').EventEmitter;

test('constructor', function (t) {
  t.ok(Cache(MemDB(), MemDB()).source);
  t.ok(new Cache(MemDB(), MemDB()).source);
  t.ok(Cache(MemDB(), MemDB()) instanceof Emitter);
  t.end();
});

