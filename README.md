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

See [example]() 

## Option

- `directory` specify local directory base, default `process.cwd()`.

- `proxy` specify remote server, default `false`.

## License

MIT
