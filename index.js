var path = require('path');
var async = require('async');
var mime = require('mime');
var File = require('./lib/file');

module.exports = combo;
module.exports.File = File;

var defaults = {
  // local directory
  directory: process.cwd(),
  
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

    if (isCombo(req.url)) {
      log('Request ' + req.url, options);
      var files = normalize(req.url);
      var exts = getExt(files);
      if (exts.length !== 1) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end('400 Bad Request');
      } else {
        async.map(files, function(item, done) {
          var f = new File(item, options).end(function(err, data) {
            done(err, data);
          });
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
            res.end(results.join(''));
          }
        });
      }

    } else if (options.static) {
      log('Request ' + req.url, options);
      var file = req.url;
      var f = new File(file, options).end(function(err, data) {
        if (err) {
          res.writeHead(404, {'Content-Type': 'text/html'});
          res.end('404 Not Found');
        } else {
          res.writeHead(200, {
            'Content-Type': mime.lookup(getExt(file)[0]),
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
  var m = url.split(/\?\?/);
  if (m.length === 2) {
    var base = m[0];
    return m[1]
      .split(',')
      .map(function(item) {
        return path.join(base, item);
      });
  }
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

function isCombo(url) {
  return /\?\?/.test(url);
}

// get file extension
// support single file and combo file
function getExt(files) {
  files = Array.isArray(files) ? files : [files];
  files = files.map(function(file) {
    return path.extname(file);
  }).reduce(function(p,c){
    if (!Array.isArray(p)) p = [p];
    if (c !== '' && p.indexOf(c) === -1) p.push(c);
    return p;
  });
  return Array.isArray(files) ? files : [files];
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
