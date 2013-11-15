var fs = require('fs');
var path = require('path');
var url = require('url');
var events = require('events');
var util = require('util');
var concat = require('concat-stream');
var protocol = {
  http: require('http'),
  https: require('https')
};

module.exports = File;

function File(urlPath, options) {
  this.options = options;
  this.localPath = path.join(options.directory, urlPath);
  this.remotePath = url.resolve(options.proxy, urlPath);
}

util.inherits(File, events.EventEmitter);

File.prototype.end = function(cb) {
  var that = this;
  this.getLocal(function(err, data) {
    if (!err) {
      // find file from directory
      that.emit('found', that.localPath);
      cb(null, data.toString());
    } else {
      that.emit('not found', that.localPath);
      if (that.options.proxy) {
        // find file from remote server
        that.getRemote(cb);
      } else {
        // not found
        cb(err);
      }
    }
  });
  return this;
};

File.prototype.getLocal = function(cb) {
  var localPath = this.localPath;
  fs.readFile(localPath, cb);
  return this;
};

File.prototype.getRemote = function(cb) {
  var that = this;
  var parsed = url.parse(this.remotePath);
  parsed.agent = false;
  parsed.method = 'GET';

  // don't check ssl
  parsed.secureOptions = require('constants').SSL_OP_NO_TLSv1_2;
  parsed.rejectUnauthorized = false;

  var request = protocol[parsed.protocol.replace(':', '')];

  var req = request.get(parsed, function(res) {
    if (res.statusCode >= 300) {
      that.emit('not found', that.remotePath);
      cb(new Error(res.statusCode));
      return;
    }
    res.pipe(concat(function(data) {
      that.emit('found', that.remotePath);
      if (that.options.cache) {
        writeFile(that.localPath, data, function(err) {
          !err && that.emit('cached', that.localPath);
        });
      }
      cb(null, data);
    }));
  }).on('error', function(err) {
    that.emit('not found', that.remotePath);
    cb(err);
  });
  return this;
};

function writeFile(filePath, data, cb) {
  var dirname = path.dirname(filePath);
  var dirs = dirname.split('/');
  for (var i = 2; i <= dirs.length; i++) {
    var p = dirs.slice(0, i).join('/');
    !fs.existsSync(p) && fs.mkdirSync(p);
  }
  fs.writeFile(filePath, data, cb);
}
