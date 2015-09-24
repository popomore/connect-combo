'use strict';

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
  if (!options.proxy) {
    options.proxy = [];
  }
  if (!Array.isArray(options.proxy)) {
    options.proxy = [options.proxy];
  }
  this.remotePaths = options.proxy.map(function(host) {
    return url.resolve(host, urlPath);
  });
}

util.inherits(File, events.EventEmitter);

File.prototype.end = function(cb) {
  var that = this;
  this.getLocal(function(err, data) {
    if (!err) {
      // find file from directory
      that.emit('found', that.localPath);
      cb(null, data);
    } else {
      that.emit('not found', that.localPath);
      if (that.options.beforeProxy) {
        that.emit('before proxy', that.localPath);
        that.options.beforeProxy.call(that, that.urlPath, cb, requestProxy);
      } else {
        requestProxy();
      }
    }

    function requestProxy() {
      if (that.remotePaths.length > 0) {
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
  fs.readFile(this.localPath, cb);
  return this;
};

File.prototype.getRemote = function(cb) {
  var that = this;
  mapRemoteUrl(this.remotePaths, this.request.bind(this), function(err, data) {
    if (err) {
      return cb(err);
    }
    if (that.options.cache) {
      mkdirp(that.localPath);
      fs.writeFile(that.localPath, data, function(err) {
        !err && that.emit('cached', that.localPath);
        cb(err, data);
      });
    } else {
      cb(null, data);
    }
  });
  return this;
};

File.prototype.request = function(url, cb) {
  var that = this;
  var opt = {
    gzip: true,
    followRedirect: false,
    rejectUnauthorized: false,
  };
  request(url, opt, function(err, data, res) {
    if (err) {
      that.emit('not found', url);
      return cb(err);
    }

    if (res.statusCode >= 300) {
      that.emit('not found', url);
      return cb(new Error(res.statusCode));
    }

    that.emit('found', url);
    cb(null, data);
  });
};

function mkdirp(filePath) {
  var dirname = path.dirname(filePath);
  var dirs = dirname.split('/');
  for (var i = 2; i <= dirs.length; i++) {
    var p = dirs.slice(0, i).join('/');
    !fs.existsSync(p) && fs.mkdirSync(p);
  }
}

function mapRemoteUrl(arr, fn, cb) {
  arr = arr.slice();

  series(arr, fn, cb);

  function series(arr, fn, cb) {
    if (arr.length === 0) {
      return cb(new Error('Can not get data from urls'));
    }
    var url = arr.shift();
    fn(url, function(err, data) {
      // 如果出错继续调用下一个
      if (err) {
        return series(arr, fn, cb);
      }
      cb(null, data);
    });
  }
}
