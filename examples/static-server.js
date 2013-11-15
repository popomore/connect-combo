var combo = require('../');
var path = require('path');
var connect = require('connect');

var dir = path.join(__dirname, 'sea-modules');

var app = connect()
  .use(combo({
    directory: dir,
    proxy: 'https://a.alipayobjects.com',
    cache: true,
    log: true,
    static: true
  }))
  .listen(3000);