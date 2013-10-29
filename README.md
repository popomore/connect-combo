# connect-combo

Connect middleware for assets combo

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

See [example](https://github.com/popomore/connect-combo/blob/master/examples/index.js) 

## Option

- `directory` specify local directory base, default `process.cwd()`.

- `proxy` specify remote server, default `false`.

- `cache` cache file from remote server, default `false`.

- `log` show log on terminal, default `false`.

## License

MIT
