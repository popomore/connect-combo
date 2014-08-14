var path = require('path');
var debug = require('debug')('connect-combo');
var async = require('async');
var mime = require('mime');
var parse = require('url').parse;
var File = require('./lib/file');

module.exports = combo;
module.exports.File = File;

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

function combo(options) {

  options = extend(defaults, options);

  var directory = options.directory;
  var getDir = typeof options.directory === 'string'?
    function() {return directory;} : options.directory;

  return function(req, res, next) {
    options.directory = getDir(req);

    debug('Request %s', req.url);
    var files = normalize(req.url);
    debug('Split %s', files);
    var exts = getExt(files);
    debug('Extension %s', exts);

    var isCombo = decodeURIComponent(req.url).indexOf('??') > -1;
    if (isCombo && files.length !== 0) {
      log('Request ' + req.url, options);

      if (exts.length !== 1) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end('400 Bad Request');
      } else {
        async.map(files, function(item, done) {
          var f = new File(item, options).end(done);
          logFile(f, options);
        }, function(err, results){
          if (err) {
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.end('404 Not Found');
          } else {
            res.writeHead(200, {
              'Content-Type': mime.lookup(exts[0]),
              'Date': new Date().toUTCString()
            });
            res.end(results.join('\n'));
          }
        });
      }
    } else if (options.static) {
      log('Request ' + req.url, options);

      var f = new File(files[0], options).end(function(err, data) {
        if (err) {
          res.writeHead(404, {'Content-Type': 'text/html'});
          res.end('404 Not Found');
        } else {
          res.writeHead(200, {
            'Content-Type': mime.lookup(exts[0]),
            'Date': new Date().toUTCString()
          });
          res.end(data);
        }
      });
      logFile(f, options);

    } else {
      // next middleware
      next();
    }
  };
}

// '/a??b.js,c/d.js' => ['a/b.js', 'a/c/d.js']
function normalize(url) {
  url = parse(url);
  var comboPath = extractComboPath(url.query);
  if (comboPath) {
    var base = url.pathname;
    return comboPath
      .split(',')
      .map(function(item) {
        item = parse(item).pathname;
        return path.join(base, item);
      });
  } else {
    return [url.pathname];
  }
}

// /??a.js,b.js&c=d => a.js,b.js
function extractComboPath(query) {
  if (!query) { return; }
  var ret;
  query.split('&')
    .forEach(function(item) {
      item = decodeURIComponent(item);
      if (!ret && item.charAt(0) === '?') {
        ret = item.substring(1).split('=')[0];
      }
    });
  return ret;
}

function logFile(file, options) {
  file
    .on('found', function(str) {
      log('Found ' + str, options);
    })
    .on('not found', function(str) {
      log('Not Found ' + str, options);
    })
    .on('cached', function(str) {
      log('Cached ' + str, options);
    });
}

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
