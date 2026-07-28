# Sprint 1 — Open questions

## Q1 — ADR-004 and `design.md` disagree on the status code for a non-JSON `POST /login`

- **Raised by:** qa, pass 1
- **Date:** 2026-07-28
- **Stories affected:** S1-004 (and, indirectly, the S1-002 no-JavaScript fallback)
- **Status:** open

`ADR-004` and `design.md` specify two different responses for the same request, and the
implementation can only satisfy one of them. QA is not adjudicating this, because picking a
status code here is an API-contract decision that belongs to the architect and will be
inherited by every later route that validates a content type.

`ADR-004` states it twice. In the Decision section: "The server therefore mounts
`express.json()` and does not mount `express.urlencoded()`, so a genuine non-JavaScript form
post would be rejected as a **400** rather than silently half-working." In the Consequences
section: "with JavaScript disabled the user gets a **400** JSON body instead of a login."

`design.md` section 4 specifies the opposite in its API table, listing "`415` wrong content
type" among the `POST /login` errors, and its processing order says "A request with a non-JSON
content type is answered `415 { "error": "content-type must be application/json" }`."

The implementation follows `design.md`. `src/routes/auth.ts` guards with
`if (!req.is("application/json"))` and returns 415, which is confirmed empirically:

```
$ curl -s -w "\n[%{http_code}]\n" -X POST \
    -d 'email=employee@timeoff.local&password=employee123' http://localhost:3000/login
{"error":"content-type must be application/json"}
[415]
```

The same 415 is returned for `text/plain` and for a request with no `Content-Type` at all. Note
that the bodyless, content-type-less case is also the one `design.md` row E10 describes as a
400 ("empty body ... `400 { "error": "email and password are required" }`"), so the content-type
guard running first changes that row's outcome as well.

Neither the plan's acceptance criteria nor the BRD names a code for this case. S1-004's AC only
covers "Invalid JSON or missing fields return HTTP 400", which the implementation satisfies for
malformed JSON and for missing or non-string fields.

**Decision needed:** which document is authoritative, so that either `ADR-004` is amended to say
415, or `design.md` and `src/routes/auth.ts` are changed to answer 400 (and E10's boundary is
restated). The developer should not choose on its own during the rework pass.
