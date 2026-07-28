# B1-002 — Body-parser client errors are reported to the client as 500 internal server error

- **id:** B1-002
- **related_story:** S1-004
- **severity:** low
- **status:** open
- **found_in_pass:** 1
- **files:** `src/index.ts`

## Summary

The error middleware in `src/index.ts` special-cases only `SyntaxError` from `express.json()`.
Every other error produced by the body parser at the `POST /login` trust boundary carries a
`status` of 4xx but is answered `500 { "error": "internal server error" }` and logged with
`console.error` as though the server had malfunctioned. A caller sending a body that is too
large, or a broken `Content-Encoding`, is told the server is broken rather than that the
request is.

`design.md` row E18 reserves the 500 path for an "unexpected exception anywhere in a handler".
A rejected oversized payload is an anticipated client error, not an unexpected exception, so
the current mapping misclassifies it. It also weakens the review-checklist expectation that
errors surface clearly: the response hides a 413 behind a 500 and the server log accumulates
noise that looks like a crash.

## Repro

With the server running:

1. Oversized body (the parser's default limit is 100kb):

```
node -e 'console.log(JSON.stringify({email:"employee@timeoff.local",password:"employee123",pad:"x".repeat(200000)}))' > /tmp/big.json
curl -s -w "\n[%{http_code}]\n" -X POST -H "Content-Type: application/json" --data @/tmp/big.json http://localhost:3000/login
```

Observed: `{"error":"internal server error"}` `[500]`. `err.status` on the thrown
`entity.too.large` error is 413.

2. Declared but invalid gzip encoding:

```
curl -s -w "\n[%{http_code}]\n" -X POST -H "Content-Type: application/json" -H "Content-Encoding: gzip" --data 'not-gzip' http://localhost:3000/login
```

Observed: `{"error":"internal server error"}` `[500]`. The underlying error is a 400.

Both cases also print a full stack trace on the server via `console.error`.

## Expected

A malformed or oversized request should be answered with a 4xx status and the sprint's standard
`{ "error": "<lowercase message>" }` body, and should not be logged as an internal failure. The
500 branch should remain for genuinely unexpected exceptions, per E18.

## Notes for the fix

The error handler currently branches only on `err instanceof SyntaxError && "body" in err`.
Honouring an existing numeric `err.status` / `err.statusCode` in the 4xx range before falling
through to the 500 branch would cover this whole family of parser errors in one place. No new
dependency and no design change is involved.
