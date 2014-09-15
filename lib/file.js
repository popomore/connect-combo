var fs = require('fs');
var path = require('path');
var url = require('url');
var events = require('events');
var util = require('util');
var request = require('urllib').request;

module.exports = File;

function File(urlPath, options) {
  urlPath = url.parse(urlPath).pathname;
  this.options = options;
  this.urlPath = urlPath;
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
      if (that.options.beforeProxy) {
        that.emit('before proxy', that.localPath);
        that.options.beforeProxy.call(that, that.urlPath, cb, requestProxy);
      } else {
        requestProxy();
      }

      function requestProxy() {
        if (that.options.proxy) {
          // find file from remote server
          that.getRemote(cb);
        } else {
          // not found
          cb(err);
        }
      }
    }
  });
  return this;
};

File.prototype.getLocal = function(cb) {
  fs.readFile(this.localPath, cb);
  return this;
};

File.prototype.getRemote = function(cb) {
  var that = this;
  var opt = {
    gzip: true,
    followRedirect: false,
    rejectUnauthorized: false
  };
  request(this.remotePath, opt, function(err, data, res) {
    if (err) {
      that.emit('not found', that.remotePath);
      return cb(err);
    }

    if (res.statusCode >= 300) {
      that.emit('not found', that.remotePath);
      return cb(new Error(res.statusCode));
    }

    that.emit('found', that.remotePath);
    if (that.options.cache) {
      mkdirp(that.localPath);
      fs.writeFile(that.localPath, data, function(err) {
        !err && that.emit('cached', that.localPath);
        cb(err, data.toString());
      });
    } else {
      cb(null, data.toString());
    }
  });

  return this;
};

function mkdirp(filePath) {
  var dirname = path.dirname(filePath);
  var dirs = dirname.split('/');
  for (var i = 2; i <= dirs.length; i++) {
    var p = dirs.slice(0, i).join('/');
    !fs.existsSync(p) && fs.mkdirSync(p);
  }
}
