var fs = require('fs');
var path = require('path');
var http = require('http');
var connect = require('connect');
require('should');
var sinon = require('sinon');

var combo = require('../index');

describe('Combo', function() {

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
        request('http://127.0.0.1:3000??a.js,b.js,c/d.js', function(err, data, res) {
          res.headers['content-type'].should.be.eql('application/javascript');
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
      proxy: 'http://static.alipayobjects.com'
    };

    it('should combo different directory', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000??a.js,arale/widget/1.0.0/widget.js', function(err, data) {
          var widget = fs.readFileSync(path.join(__dirname, './fixture/widget.js')).toString();
          data.should.eql('define("a", function(){});' + widget);
          done();
        });
      });
    });

    it('should 404 when not found', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000??a.js,not-exist.js', function(err, data) {
          err.should.eql(404);
          done();
        });
      });
    });
  });

  describe('static', function() {
    var options = {
      directory: path.join(__dirname, './fixture'),
      static: true
    };

    it('should return right', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000/a.js', function(err, data) {
          data.should.eql('define("a", function(){});');
          done();
        });
      });
    });

    it('should return 404 when not found', function(done) {
      server = createServer(options, function() {
        request('http://127.0.0.1:3000/not-exist.js', function(err, data) {
          err.should.eql(404);
          done();
        });
      });
    });
  });

  it('should show log', function(done) {
    var log = console.log;
    var spy = sinon.spy();
    console.log = function() {
      spy.apply(null, arguments);
    };
    var options = {
      directory: path.join(__dirname, './fixture'),
      proxy: 'http://ajax.googleapis.com',
      cache: true,
      log: true
    };

    server = createServer(options, function() {
      request('http://127.0.0.1:3000??a.js,ajax/libs/jquery/1.5.1/jquery.min.js', function(err, data) {
        spy.calledWithMatch(/>> Found .*\/test\/fixture\/a.js/)
          .should.be.true;
        console.log = log;
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

  it('should return 400 when different ext', function(done) {
    server = createServer(function() {
      request('http://127.0.0.1:3000??a.js,a.css', function(err, data) {
        err.should.eql(400);
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
      callback(null, data.toString(), res);
    });
  });
}
