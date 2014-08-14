require('should');
var fs = require('fs');
var join = require('path').join;
var url = require('url');
var sinon = require('sinon');
var File = require('..').File;

describe('File', function() {

  var options;

  beforeEach(function() {
    options= {
      directory: join(__dirname, 'fixture'),
      proxy: 'http://static.alipayobjects.com',
      cache: false
    };
  });

  it('before proxy', function(done) {
    options.beforeProxy = function(urlPath, cb, next) {
      if (urlPath === 'beforeproxy.js') {
        this.emit('found');
        cb(null, 'beforeproxy');
      } else {
        next();
      }
    };

    var spy = sinon.spy();
    new File('beforeproxy.js', options)
      .on('found', spy)
      .end(function(err, data) {
        data.should.be.eql('beforeproxy');
        spy.calledOnce.should.be.true;
        done();
      });
  });

  it('should response from local', function(done) {
    var spy = sinon.spy();
    new File('a.js', options)
      .on('found', spy)
      .end(function(err, data) {
        data.should.be.eql('define("a", function(){});');
        spy.calledOnce.should.be.true;
        spy.calledWith(join(options.directory, 'a.js')).should.be.true;
        done();
      });
  });

  it('should response 404 from local', function(done) {
    options.proxy = '';
    var spy = sinon.spy();
    new File('c.js', options)
      .on('not found', spy)
      .end(function(err, data) {
        err.should.be.an.instanceof(Error);
        spy.calledOnce.should.be.true;
        spy.calledWith(join(options.directory, 'c.js')).should.be.true;
        done();
      });
  });

  it('should response from remote', function(done) {
    var seajs = fs.readFileSync(join(__dirname, './fixture/sea.js')).toString();
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    new File('seajs/seajs/2.1.1/sea.js', options)
      .on('not found', spy1)
      .on('found', spy2)
      .end(function(err, data) {
        data.should.be.eql(seajs);
        spy1.calledOnce.should.be.true;
        spy2.calledOnce.should.be.true;
        spy1.calledWith(join(options.directory, 'seajs/seajs/2.1.1/sea.js')).should.be.true;
        spy2.calledWith(url.resolve(options.proxy, 'seajs/seajs/2.1.1/sea.js')).should.be.true;
        done();
      });
  });

  it('should response 404 from remote', function(done) {
    var spy = sinon.spy();
    new File('seajs/seajs/2.1.1/not-exist.js', options)
      .on('not found', spy)
      .end(function(err, data) {
        err.should.be.an.instanceof(Error);
        spy.calledTwice.should.be.true;
        spy.calledWith(join(options.directory, 'seajs/seajs/2.1.1/not-exist.js')).should.be.true;
        spy.calledWith(url.resolve(options.proxy, 'seajs/seajs/2.1.1/not-exist.js')).should.be.true;
        done();
      });
  });

  it('should response from remote and cached', function(done) {
    options.cache = true;
    var file = 'seajs/1.3.1/sea.js';
    var seajs = fs.readFileSync(join(__dirname, './fixture/sea.js')).toString();
    var cached = join(__dirname, 'fixture', file);
    fs.existsSync(cached) && fs.unlinkSync(cached);

    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    var spy3 = sinon.spy();
    new File(file, options)
      .on('not found', spy1)
      .on('found', spy2)
      .on('cached', spy3)
      .end(function(err, data) {
        spy1.calledOnce.should.be.true;
        spy2.calledOnce.should.be.true;
        spy3.calledOnce.should.be.true;
        spy1.calledWith(join(options.directory, file)).should.be.true;
        spy2.calledWith(url.resolve(options.proxy, file)).should.be.true;
        spy3.calledWith(join(options.directory, file)).should.be.true;
        fs.existsSync(cached).should.be.true;
        fs.unlinkSync(cached);
        done();
      });
  });
});
