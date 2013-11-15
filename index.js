var path = require('path');
var async = require('async');
var format = require('util').format;
var mime = require('mime');
var log = require('./lib/log');
var File = require('./lib/file');


var defaults = {
  // local directory
  directory: process.cwd(),
  
  // remote server
  proxy: '',

  // cache remote file
  cache: false,

  // show log
  log: false
};

module.exports = function combo(options) {

  options = extend(defaults, options);

  return function(req, res, next) {
    var files = normalize(req.url);
    if (files && files.length) {
      log('Request ' + req.url, options);
      var exts = getExt(files);
      if (exts.length !== 1) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end('400 Bad Request');
      } else {
        async.map(files, function(item, done) {
          new File(item, options).end(function(err, data) {
            done(err, data);
          });
        }, function(err, results){
          if (err) {
            res.writeHead(404, {'Content-Type': 'text/html'});
            res.end('404 Not Found');
          } else {
            res.writeHead(200, {'Content-Type': mime.lookup(exts[0])});
            res.end(results.join(''));
          }
        });
      }
    } else {
      // next middleware
      next();
    }
  };
};

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

function getExt(files) {
  files = files.map(function(file) {
    var m = file.match(/\.([a-z]*)$/);
    return m ? m[1] : '';
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
