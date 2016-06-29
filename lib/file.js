'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var events = require('events');
var util = require('util');
var request = require('urllib').request;
var mkdirp = require('mkdirp');

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
  urlPath = '/' + urlPath.replace(/^\//, '');
  this.remotePaths = options.proxy.map(function(host) {
    if (/\/$/.test(host)) {
      host = host.substring(0, host.length - 1);
    }
    return host + urlPath;
  });
}

util.inherits(File, events.EventEmitter);

File.prototype.end = function(cb) {
  var that = this;
  this.getLocal(function(err, data) {
    if (!err) {
      // find file from directory
      that.emit('found', that.localPath);
      cb(null, {
        headers: null,
        data: data,
      });
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
      mkdirp(path.dirname(that.localPath), function(err) {
        if (err) return cb(err);
        fs.writeFile(that.localPath, data.data, function(err) {
          !err && that.emit('cached', that.localPath);
          cb(err, data);
        });
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
    cb(null, {
      headers: shouldGetHeader(that.options) ? getOriginalHeader(res.headers) : null,
      data: data,
    });
  });
};

// if use combo as a pure proxy server, it can get headers from upstream
function shouldGetHeader(options) {
  return !options.cache && options.proxy && options.directory === '';
}

function getOriginalHeader(headers) {
  var allowedHeaders = ['access-control-allow-origin', 'cache-control'];
  return allowedHeaders.reduce(function(pre, curr) {
    if (headers[curr]) {
      pre[curr] = headers[curr];
    }
    return pre;
  }, {});
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
