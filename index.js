var path = require('path');
var parse = require('url').parse;
var debug = require('debug')('connect-combo');
var mime = require('mime');
var combo = require('combo-url');
var proxy = require('urlproxy');
var pedding = require('pedding');
var Combine = require('combine-stream');

module.exports = combo;

var defaults = {
  // local directory
  directory: process.cwd(),

  beforeProxy: null,

  // remote server
  proxy: '',

  // cache remote file
  cache: false,

  // show log
  log: false,

  // serve as normal static server, also support proxy,
  // or you can use `connect.static` without proxy
  static: false
};

module.exports = function (options) {

  options = extend(defaults, options);

  var directory = options.directory;
  var getDir = typeof options.directory === 'string'?
    function() {return directory;} : options.directory;

  return function(req, res, next) {
    debug('Request %s', req.url);
    var url = combo.parse(decodeURIComponent(req.url));
    var exts = url ? getExt(url.combo) : [path.extname(req.url)];
    var ext = exts[0];

    var opt = {
      directory: getDir(req),
      cache: options.cache,
      proxy: options.proxy
    };

    // combo file
    if (url) {
      log('Request ' + req.url, options);

      debug('Combo path %s', url.combo);
      debug('Extension %s', exts);

      if (exts.length !== 1) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        return res.end('400 Bad Request');
      }

      var files = url.combo;
      var ready = pedding(files.length, hanldeSuccess);
      var error = pedding(1, handleError);

      var streams;
      try {
        streams = files.map(function(file) {
          return proxy(file, opt)
          .once('ready', ready)
          .once('error', error);
        });
      } catch(e) {
        return handleError();
      }

    } else if (options.static) {
      url = parse(req.url).pathname;
      log('Request ' + req.url, options);

      try {
        proxy(url, opt)
        .on('ready', function() {
          res.writeHead(200, {
            'Content-Type': mime.lookup(ext),
            'Date': new Date().toUTCString()
          });
        })
        .on('error', handleError)
        .pipe(res);
      } catch(e) {
        handleError();
      }
    } else {
      // next middleware
      next();
    }

    function hanldeSuccess() {
      res.writeHead(200, {
        'Content-Type': mime.lookup(ext),
        'Date': new Date().toUTCString()
      });
      new Combine(streams).pipe(res);
    }

    function handleError() {
      res.writeHead(404, {
        'Content-Type': mime.lookup(ext),
        'Date': new Date().toUTCString()
      });
      res.end('Not Found');
    }
  };
};

function log(str, options) {
  options.log && console.log('>> ' + str);
}

// get file extension
// support single file and combo file
function getExt(files) {
  return files.map(function(file) {
    return path.extname(file);
  }).filter(function(item, index, arr) {
    return index === arr.indexOf(item);
  });
}

function extend(target, src) {
  var result = {};
  for (var key in target) {
    if (target.hasOwnProperty(key)) {
      result[key] = src[key] || target[key];
    }
  }
  return result;
}
