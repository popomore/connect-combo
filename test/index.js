var fs = require('fs');
var path = require('path');
var connect = require('connect');
var request = require('supertest');
require('should');
var sinon = require('sinon');

var combo = require('..');

describe('Combo', function() {

  describe('local', function() {
    var options = {
      directory: path.join(__dirname, './fixture')
    };

    it('should combo different directory', function(done) {
      var app = createServer(options);
      request(app)
        .get('/??a.js,b.js,c/d.js')
        .expect('Content-Type', 'application/javascript')
        .expect('define("a", function(){});\ndefine("b", function(){});\ndefine("d", function(){});')
        .end(done);
    });

    it('should combo same directory', function(done) {
      var app = createServer(options);
      request(app)
        .get('/c??d.js,e.js')
        .expect('Content-Type', 'application/javascript')
        .expect('define("d", function(){});\ndefine("e", function(){});')
        .end(done);
    });

    it('should return 404 when not found', function(done) {
      var app = createServer(options);
      request(app)
        .get('/??a.js,c.js')
        .expect(404, done);
    });

    it('should combo one file', function(done) {
      var app = createServer(options);
      request(app)
        .get('/??a.js')
        .expect('Content-Type', 'application/javascript')
        .expect('define("a", function(){});')
        .end(done);
    });

  });

  describe('remote', function() {
    var options = {
      directory: path.join(__dirname, './fixture'),
      proxy: 'http://static.alipayobjects.com'
    };

    it('should combo different directory', function(done) {
      var app = createServer(options);
      var widget = fs.readFileSync(path.join(__dirname, './fixture/widget.js')).toString();
      request(app)
        .get('/??a.js,arale/widget/1.0.0/widget.js')
        .expect('define("a", function(){});\n' + widget)
        .end(done);
    });

    it('should 404 when not found', function(done) {
      var app = createServer(options);
      request(app)
        .get('/??a.js,not-exist.js')
        .expect(404, done);
    });
  });

  describe('static', function() {
    var options = {
      directory: path.join(__dirname, './fixture'),
      static: true
    };

    it('should return right', function(done) {
      var app = createServer(options);
      request(app)
        .get('/a.js')
        .expect('define("a", function(){});', done);
    });

    it('should return 404 when not found', function(done) {
      var app = createServer(options);
      request(app)
        .get('/not-exist.js')
        .expect(404, done);
    });

    it('should return right with query', function(done) {
      var app = createServer(options);
      request(app)
        .get('/a.js?t=111')
        .expect('define("a", function(){});', done);
    });
  });

  describe('content type', function() {
    it('static', function(done) {
      var options = {
        directory: path.join(__dirname, './fixture'),
        static: true
      };
      var app = createServer(options);
      request(app)
        .get('/a.css')
        .expect('Content-Type', 'text/css')
        .end(done);
    });

    it('combo', function(done) {
      var options = {
        directory: path.join(__dirname, './fixture')
      };
      var app = createServer(options);
      request(app)
        .get('/??a.js,b.js')
        .expect('Content-Type', 'application/javascript')
        .end(done);
    });

    it('400', function(done) {
      var options = {
        directory: path.join(__dirname, './fixture')
      };
      var app = createServer(options);
      request(app)
        .get('/??a.js,b.css')
        .expect(400, done);
    });
  });


  it('url parse with query', function(done) {
    var options = {
      directory: path.join(__dirname, './fixture')
    };
    var app = createServer(options);
    request(app)
      .get('/??a.js?123,b.js?456&input_encoding=utf-8')
      .expect('define("a", function(){});\ndefine("b", function(){});', done);
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
    var app = createServer(options);
    request(app)
      .get('/??a.js,ajax/libs/jquery/1.5.1/jquery.min.js')
      .end(function() {
        spy.calledWithMatch(/>> Found .*\/test\/fixture\/a.js/)
          .should.be.true;
        console.log = log;
        done();
      });
  });

  it('should run next middleware when do not match combo', function(done) {
    var app = createServer();
    request(app)
      .get('/?a.js,b.js')
      .expect('not combo', done);
  });

  it('should return 400 when different ext', function(done) {
    var app = createServer();
    request(app)
      .get('/??a.js,a.css')
      .expect(400, done);
  });

  it('directory function', function(done) {
    var options = {
      static: true,
      directory: function(req) {
        var dir = req.url.split('?')[1].split('=')[1];
        return path.join(__dirname, 'fixture', dir);
      }
    };
    var app = createServer(options);
    request(app)
      .get('/d.js?dir=c')
      .expect('define("d", function(){});', done);
  });
});

function createServer(options) {
  if (!options) {
    options = {
      directory: path.join(__dirname, './fixture')
    };
  }
  return connect()
    .use(combo(options))
    .use(function(req, res) {
      res.end('not combo');
    });
}
