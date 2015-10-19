'use strict';

require('should');
var fs = require('fs');
var join = require('path').join;
var url = require('url');
var sinon = require('sinon');
var File = require('..').File;
var fixture = join(__dirname, 'fixture');

describe('File', function() {

  var options;

  beforeEach(function() {
    options = {
      directory: fixture,
      proxy: 'http://static.alipayobjects.com',
      cache: false,
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
        if (err) return done(err);
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
        if (err) return done(err);
        data.toString().should.be.eql('define("a", function(){});');
        spy.calledOnce.should.be.true;
        spy.calledWith(join(options.directory, 'a.js')).should.be.true;
        done();
      });
  });

  it('should response 404 from local', function(done) {
    var options = {
      directory: fixture,
      cache: false,
    };
    var spy = sinon.spy();
    new File('c.js', options)
      .on('not found', spy)
      .end(function(err) {
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
        if (err) return done(err);
        data.toString().should.be.eql(seajs);
        spy1.calledOnce.should.be.true;
        spy2.calledOnce.should.be.true;
        spy1.calledWith(join(options.directory, 'seajs/seajs/2.1.1/sea.js')).should.be.true;
        spy2.calledWith('http://static.alipayobjects.com/seajs/seajs/2.1.1/sea.js').should.be.true;
        done();
      });
  });

  it('should response from remote with multi url', function(done) {
    options = {
      directory: fixture,
      proxy: [
        'http://pic.alipayobjects.com',
        'http://static.alipayobjects.com',
      ],
      cache: false,
    };
    var seajs = fs.readFileSync(join(__dirname, './fixture/sea.js')).toString();
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    new File('seajs/seajs/2.1.1/sea.js', options)
      .on('not found', spy1)
      .on('found', spy2)
      .end(function(err, data) {
        if (err) return done(err);
        data.toString().should.be.eql(seajs);
        spy1.calledTwice.should.be.true;
        spy2.calledOnce.should.be.true;
        spy1.calledWith(join(options.directory, 'seajs/seajs/2.1.1/sea.js')).should.be.true;
        spy2.calledWith('http://static.alipayobjects.com/seajs/seajs/2.1.1/sea.js').should.be.true;
        done();
      });
  });

  it('should response when proxy is not only host', function(done) {
    options = {
      directory: fixture,
      proxy: 'http://static.alipayobjects.com/seajs',
      cache: false,
    };
    var seajs = fs.readFileSync(join(__dirname, './fixture/sea.js')).toString();
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    new File('seajs/2.1.1/sea.js', options)
      .on('not found', spy1)
      .on('found', spy2)
      .end(function(err, data) {
        if (err) return done(err);
        data.toString().should.be.eql(seajs);
        spy1.calledOnce.should.be.true;
        spy2.calledOnce.should.be.true;
        spy1.calledWith(join(options.directory, 'seajs/2.1.1/sea.js')).should.be.true;
        spy2.calledWith('http://static.alipayobjects.com/seajs/seajs/2.1.1/sea.js').should.be.true;
        done();
      });
  });

  it('should response 404 from remote', function(done) {
    var spy = sinon.spy();
    new File('seajs/seajs/2.1.1/not-exist.js', options)
      .on('not found', spy)
      .end(function(err) {
        err.should.be.an.instanceof(Error);
        spy.calledTwice.should.be.true;
        spy.calledWith(join(options.directory, 'seajs/seajs/2.1.1/not-exist.js')).should.be.true;
        spy.calledWith('http://static.alipayobjects.com/seajs/seajs/2.1.1/not-exist.js').should.be.true;
        done();
      });
  });

  it('should response from remote and cached', function(done) {
    options.cache = true;
    var file = 'seajs/1.3.1/sea.js';
    var cached = join(__dirname, 'fixture', file);
    fs.existsSync(cached) && fs.unlinkSync(cached);

    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    var spy3 = sinon.spy();
    new File(file, options)
      .on('not found', spy1)
      .on('found', spy2)
      .on('cached', spy3)
      .end(function(err) {
        if (err) return done(err);
        spy1.calledOnce.should.be.true;
        spy2.calledOnce.should.be.true;
        spy3.calledOnce.should.be.true;
        spy1.calledWith(join(options.directory, file)).should.be.true;
        spy2.calledWith(url.resolve('http://static.alipayobjects.com', file)).should.be.true;
        spy3.calledWith(join(options.directory, file)).should.be.true;
        fs.existsSync(cached).should.be.true;
        fs.unlinkSync(cached);
        done();
      });
  });

  it('should get ttf', function(done) {
    var len = fs.readFileSync(join(fixture, 'a.ttf')).length;
    var spy = sinon.spy();
    new File('a.ttf', options)
      .on('found', spy)
      .end(function(err, data) {
        if (err) return done(err);
        spy.calledOnce.should.be.true;
        new Buffer(data).length.should.eql(len);
        spy.calledWith(join(options.directory, 'a.ttf')).should.be.true;
        done();
      });
  });
});
