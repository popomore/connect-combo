var fs = require('fs');
var path = require('path');
var http = require('http');
var connect = require('connect');
require('should');
var sinon = require('sinon');

var combo = require('../index');

describe('combo', function() {

  var server;
  afterEach(function() {
    server.close();
  });

  describe('local', function() {
    var options = {
      directory: path.join(__dirname, './fixture')
    };

    it('should combo different directory', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000??a.js,b.js,c/d.js', function(err, data) {
          data.should.eql('define("a", function(){});define("b", function(){});define("d", function(){});');
          done();
        });
      });
    });
  
    it('should combo same directory', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000/c??d.js,e.js', function(err, data) {
          data.should.eql('define("d", function(){});define("e", function(){});');
          done();
        });
      });
    });

    it('should return 404 when not found', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000??a.js,c.js', function(err, data) {
          err.should.eql(404);
          done();
        });
      });
    });
  });

  describe('remote', function() {
    var options = {
      directory: path.join(__dirname, './fixture'),
      proxy: 'https://a.alipayobjects.com'
    };

    it('should combo different directory', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000??a.js,seajs/seajs/2.1.1/sea.js', function(err, data) {
          var seajs = fs.readFileSync(path.join(__dirname, './fixture/sea.js')).toString();
          data.should.eql('define("a", function(){});' + seajs);
          done();
        });
      });
    });

    it('should 404 when not found', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000??a.js,seajs/seajs/0.1.0/sea.js', function(err, data) {
          err.should.eql(404);
          done();
        });
      });
    });
  });

  it('should cache file from remote server', function(done) {
    var seajsPath = path.join(__dirname, './fixture/seajs/seajs/2.1.1/sea.js');
    var options = {
      directory: path.join(__dirname, './fixture'),
      proxy: 'https://a.alipayobjects.com',
      cache: true
    };

    fs.existsSync(seajsPath) && fs.unlinkSync(seajsPath);
    server = createServer(options, function() {
      request('http://127.0.0.1:3000??a.js,seajs/seajs/2.1.1/sea.js', function(err, data) {
        fs.existsSync(seajsPath).should.be.true;
        done();
      });
    });
  });

  it('should show log', function(done) {
    var options = {
      directory: path.join(__dirname, './fixture'),
      log: true
    };
    var spy = sinon.spy(console, 'log');

    server = createServer(options, function() {
      request('http://127.0.0.1:3000??a.js,b.js', function(err, data) {
        spy.calledWithMatch(/>> Found .*\/test\/fixture\/a.js/)
          .should.be.true;
        done();
      });
    });
  });

  it('should run next middleware when do not match combo', function(done) {
    server = createServer(function() {
      request('http://127.0.0.1:3000?a.js,b.js', function(err, data) {
        data.should.eql('not combo');
        done();
      });
    });
  });
});

function createServer(options, callback) {
  if (Object.prototype.toString.call(options) === '[object Function]') {
    callback = options;
    options = {
      directory: path.join(__dirname, './fixture')
    };
  }
  return connect()
    .use(combo(options))
    .use(function(req, res) {
      res.end('not combo');
    })
    .listen(3000, callback);
}

function request(url, callback) {
  http.get(url, function(res) {
    if (res.statusCode !== 200) {
      callback(res.statusCode);
      return;
    }
    var data = '';
    res.on('data', function(buf) {
      data += buf;
    });
    res.on('end', function() {
      callback(null, data.toString());
    });
  });
}
