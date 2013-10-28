var path = require('path');
var fs = require('fs');
var async = require('async');
var format = require('util').format;
var url = require('url');
var protocol = {
  http: require('http'),
  https: require('https')
};

var defaults = {
  // local directory
  directory: process.cwd(),
  
  // remote server
  proxy: false
};

module.exports = function combo(options) {

  options = extend(defaults, options);

  return function(req, res, next) {
    var files = normalize(req.url);
    if (files && files.length) {
      async.map(files, function(item, done) {
        var filePath = path.join(options.directory, item);
        fs.readFile(filePath, function(err, data) {
          if (!err) {
            // find file from directory
            log('Found ' + filePath);
            done(null, data.toString());
          } else {
            log('Not Found ' + filePath);
            if (options.proxy) {
              // find file from remote server
              getRemote(url.resolve(options.proxy, item), done);
            } else {
              // not found
              done(err);
            }
          }
        });
      }, function(err, results){
        if (err) {
          res.writeHead(404, {'Content-Type': 'text/html'});
          res.end('404 Not Found');
        } else {
          res.end(results.join(''));
        }
      });
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

function getRemote(u, callback) {
  var parsed = url.parse(u);
  parsed.agent = false;
  parsed.method = 'GET';

  // don't check ssl
  parsed.secureOptions = require('constants').SSL_OP_NO_TLSv1_2;
  parsed.rejectUnauthorized = false;

  var request = protocol[parsed.protocol.replace(':', '')];

  var req = request.get(parsed, function(res) {
    if (res.statusCode !== 200) {
      log('Not Found ' + u);
      callback(new Error(res.statusCode));
      return;
    }

    var data = '';
    res.on('data', function(buf) {
      data += buf;
    });
    res.on('end', function() {
      log('Found ' + u);
      callback(null, data.toString());
    });
  }).on('error', function(e) {
    log('Not Found ' + u);
    callback(e);
  });
}

function log(str) {
  console.log('>> ' + str);
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
