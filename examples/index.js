var combo = require('../');
var path = require('path');
var connect = require('connect');

var app = connect()
  .use(combo({
    directory: path.join(__dirname, '../test/fixture'),
    proxy: 'https://a.alipayobjects.com'
  }))
  .use(function(req, res) {
    res.end('Hello from Connect!\n');
  })
  .listen(3000);