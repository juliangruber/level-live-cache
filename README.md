
# level-live-cache

An in-memory cache that keeps up to date with its source.

[![build status](https://secure.travis-ci.org/juliangruber/level-live-cache.png)](http://travis-ci.org/juliangruber/level-live-cache)

## Usage

```js
var MemDB = require('memdb');
var Cache = require('level-live-cache');

var source = MemDB(); // should be something like a multilevel client
var cache = MemDB();

var db = Cache(source, cache);
// the first db - the source - should be
// something like a multilevel client

db.put('foo', 'bar', function (err) {
  if (err) throw err;
  // this was written to the source and an in-memory cache
  
  db.get('foo', fucntion (err, value) {
    if (err) throw err;
    console.log(value); // => foo
    // this was read from the in-memory cache
  });
});

source.put('foo', 'baz', function (err) {
  if (err) throw err;
  // the source changed, but the cache was updated too
  setTimeout(function () {
    client.get('foo', function (err, value) {
      if (err) throw err;
      console.log(value); // => baz
    });
  }, 500);
});
```

## API

### Cache(source, cache)

Return a new levelup style db that caches `source` in `cache` and keeps both
up to date.

## Installation

With [npm](https://npmjs.org) do:

```bash
npm install level-live-cache
```

Then bundle for the browser with
[browserify](https://github.com/substack/node-browserify).

## License

(MIT)

Copyright (c) 2013 Julian Gruber &lt;julian@juliangruber.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
