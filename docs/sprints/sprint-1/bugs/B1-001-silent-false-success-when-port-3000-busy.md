# B1-001 — Server logs "listening" and exits 0 when port 3000 is already in use

- **id:** B1-001
- **related_story:** S1-001
- **severity:** high
- **status:** open
- **found_in_pass:** 1
- **files:** `src/index.ts`

## Summary

When port 3000 is already taken, the app prints its normal success line,
`Time-Off server listening on http://localhost:3000`, writes nothing to stderr, and exits with
code 0. The bind never succeeded. A developer reading the output has no way to tell that the
process died, and any subsequent request they make is served by whatever stale process actually
owns the port.

This contradicts `design.md` section 6, row E1, which specifies that "the `listen` error
surfaces on stderr with a clear message and the process exits non-zero", and it violates the
`docs/ARCHITECTURE.md` review checklist item "No silent failures — errors surface clearly". It
is the strongest form of a silent failure: the failure path is indistinguishable from success.

## Repro

1. `npm start` in one terminal and leave it running. The server binds port 3000.
2. `npm start` again in a second terminal, from the same directory.
3. Observe the second process: stdout contains `Time-Off server listening on
   http://localhost:3000`, stderr is empty, and the process terminates immediately with exit
   code 0.

Observed on Node v22.20.0, express 5.2.1, macOS. Captured exit code:

```
$ node --experimental-strip-types src/index.ts > out 2> err &
$ wait; echo "EXITCODE=$?"
EXITCODE=0
$ cat out
Time-Off server listening on http://localhost:3000
$ cat err
(empty)
```

For contrast, plain `http.createServer().listen(3000)` on the same busy port throws
`Error: listen EADDRINUSE: address already in use :::3000` and exits non-zero, which is the
behaviour E1 describes.

## Expected

Per E1: a clear error on stderr identifying the port conflict, and a non-zero exit code. No
success line when no socket was bound.

## Cause

`express@5.2.1` registers the `app.listen` callback as an error handler as well as a listening
handler. From `node_modules/express/lib/application.js`:

```js
app.listen = function listen() {
  var server = http.createServer(this)
  var args = slice.call(arguments)
  if (typeof args[args.length - 1] === 'function') {
    var done = args[args.length - 1] = once(args[args.length - 1])
    server.once('error', done)
  }
  return server.listen.apply(server, args)
}
```

`src/index.ts` passes a zero-argument callback that unconditionally logs success:

```ts
app.listen(PORT, () => {
  console.log(`Time-Off server listening on http://localhost:${PORT}`);
});
```

On `EADDRINUSE` the callback is invoked as the error handler, so it logs the success line while
ignoring the `err` argument it was handed. Because Express attached that `error` listener, the
error is considered handled, nothing reaches stderr, the event loop drains and the process
exits 0.

## Notes for the fix

QA does not prescribe an implementation. Any fix has to make the success line conditional on an
actual bind and surface the error. Inspecting the callback's first argument, or attaching an
explicit `server.on("error", ...)` that logs and calls `process.exit(1)`, would both satisfy E1.
No new dependency is needed and no architecture rule is affected.
