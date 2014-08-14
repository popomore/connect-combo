# connect-combo

Connect middleware for assets combo, resolve url like `http://127.0.0.1??a.js,b.js`.

[![Build Status](https://travis-ci.org/popomore/connect-combo.png?branch=master)](https://travis-ci.org/popomore/connect-combo)
[![Coverage Status](https://coveralls.io/repos/popomore/connect-combo/badge.png?branch=master)](https://coveralls.io/r/popomore/connect-combo?branch=master)

---

## Install

```
$ npm install connect-combo -g
```

## Usage

```
var app = connect()
  .use(combo())
  .listen(3000);
```

See [example](https://github.com/popomore/connect-combo/blob/master/examples/) 

## Option

- `directory` specify local directory base, default `process.cwd()`.

- `proxy` specify remote server, default `false`.

- `cache` cache file from remote server, default `false`.

- `log` show log on terminal, default `false`.

- `beforeProxy` handle request before send to proxy, default `null`.

## License

MIT
