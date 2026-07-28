# Sprint 1 — Technical Design

**Theme:** App runs locally
**Stories:** S1-001 (server + in-memory user store), S1-002 (landing page with login form),
S1-003 (`GET /health`), S1-004 (`POST /login` with JWT)
**ADRs introduced:** ADR-001 (stack), ADR-002 (no-build TypeScript execution), ADR-003 (JWT
issuance), ADR-004 (same-origin static frontend)

## 1. Overview

Sprint 1 delivers a single Node process that boots on `localhost:3000`, seeds three hardcoded
users into an in-memory store, serves a vanilla HTML landing page with a login form, answers an
unauthenticated health check, and issues 24-hour HS256 JWTs to users who present valid
credentials. Nothing is persisted, nothing is authenticated behind a middleware yet, and no
time-off request data exists: themes 2 and later add those. The sprint's real job is to
establish the skeleton every later story attaches to, which is why four ADRs come out of it and
almost no domain logic does.

The process model is deliberately trivial. `npm start` runs `node --experimental-strip-types
src/index.ts` (ADR-002), Express 5 mounts `cors()`, `express.json()`, the static middleware for
`public/`, then the two route groups, then a JSON 404 and a JSON error handler, and finally
listens on port 3000 after the seed has run. There is no build output, no watcher, no database
client and no second process.

## 2. Components

The layout is flat, as `docs/ARCHITECTURE.md` requires. Six backend modules and three frontend
files exist at the end of the sprint.

| Module | Responsibility | Exports (shape, not code) | Depends on |
|---|---|---|---|
| `src/index.ts` | Composition root: create the app, mount middleware in order, mount routes, register 404 and error handlers, seed the store, listen on 3000, log the startup line | none (entry point) | `store`, `seed`, `routes/health`, `routes/auth` |
| `src/store.ts` | The in-memory state. A module-level `Map<string, User>` of users plus small accessors | `User` type, `Role` type, `users` map, `getUserById`, `getUserByEmail`, `addUser`, `resetStore` | none |
| `src/seed.ts` | The three hardcoded fixture users and the function that loads them | `seedUsers()` | `store` |
| `src/auth.ts` | Everything that touches `jsonwebtoken`: resolved secret, token payload shape, signing | `JWT_SECRET`, `TokenPayload` type, `signToken(user)` | `jsonwebtoken`, `store` (type only) |
| `src/routes/health.ts` | `GET /health` | Express router | none |
| `src/routes/auth.ts` | `POST /login`: input validation, credential lookup, token issuance | Express router | `store`, `auth` |
| `public/index.html` | Landing page: "Time-Off" branding, login form, message area | — | `styles.css`, `app.js` |
| `public/styles.css` | Minimal styling, no framework | — | — |
| `public/app.js` | Intercepts the form submit, posts JSON to `/login`, renders success or error | — | — |

Two boundaries matter for later sprints. First, only `src/auth.ts` imports `jsonwebtoken`, so
theme 2 adds verification and the logout blocklist in one place. Second, only `src/store.ts`
holds mutable state, so route files stay free of module-level variables.

Middleware order in `src/index.ts` is load bearing and should not be rearranged casually:
`cors()` first, then `express.json()`, then `express.static("public")`, then `/health`, then
`/login`, then the 404 handler, then the four-argument error handler. Static before routes means
`GET /` resolves to `public/index.html` without a handler (ADR-004); the 404 and error handlers
last means every unmatched or failed request still produces JSON, satisfying NF2.

## 3. Data model

Only one entity exists in sprint 1. Request, notification and comment entities are out of scope
and must not be added here.

```
User
  id         string   stable fixture id, e.g. "u-emp-1"
  email      string   unique, lowercase, the login identifier
  password   string   plaintext fixture password (ADR-003)
  name       string   display name for the UI
  role       "employee" | "manager" | "hr"   string literal union, never an enum (ADR-002)
  managerId  string | null                   employee -> manager link, null for manager and hr
```

Storage is `const users = new Map<string, User>()` keyed by `id`. Lookup by email is a linear
scan over `users.values()` comparing lowercased emails; with three fixture users an index would
be pure ceremony. `resetStore()` clears the map and exists so a future `node:test` story can
rebuild state, not because any sprint 1 code calls it.

Seed data, one user per role as S1-001 requires:

| id | email | password | name | role | managerId |
|---|---|---|---|---|---|
| `u-emp-1` | `employee@timeoff.local` | `employee123` | Elena Employee | `employee` | `u-mgr-1` |
| `u-mgr-1` | `manager@timeoff.local` | `manager123` | Manuel Manager | `manager` | `null` |
| `u-hr-1` | `hr@timeoff.local` | `hr123` | Hilda HR | `hr` | `null` |

`seedUsers()` is idempotent: it clears the map before inserting, so calling it twice yields the
same three users. It is called once from `src/index.ts` before `listen`, so the startup log
never claims the server is ready before the fixtures exist.

## 4. API surface

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| `GET` | `/` | none | — | `200 text/html`, `public/index.html` | `404` JSON if the file is missing |
| `GET` | `/styles.css`, `/app.js` | none | — | `200` with the matching content type | `404` JSON |
| `GET` | `/health` | none | — | `200 application/json` `{ "status": "ok" }` | none |
| `POST` | `/login` | none | `application/json` `{ "email": string, "password": string }` | `200 application/json` `{ "token": "<JWT>" }` | `400` malformed or missing fields, `401` invalid credentials, `415` wrong content type |
| any | anything else | none | — | — | `404 application/json` `{ "error": "not found" }` |

Every error body in the sprint uses the same shape, `{ "error": "<lowercase message>" }`, so the
frontend has one branch to write and later sprints have one convention to follow.

`POST /login` processes a request in a fixed order, and the order is what the acceptance
criteria are checked against:

1. `express.json()` parses the body. A malformed JSON payload throws a `SyntaxError`, which the
   error handler converts to `400 { "error": "invalid json body" }`. A request with a non-JSON
   content type is answered `415 { "error": "content-type must be application/json" }`.
2. Presence and type validation. `email` and `password` must both be present, be strings, and be
   non-empty after trimming; otherwise `400 { "error": "email and password are required" }`.
   Unknown extra properties in the body are ignored rather than rejected.
3. Lookup by `email.trim().toLowerCase()`. Password compared with exact string equality, no
   trimming (ADR-003).
4. Unknown email and wrong password both return `401 { "error": "invalid credentials" }`, with
   no user enumeration and no token in the body.
5. On success, `signToken(user)` returns a JWT signed HS256 with `expiresIn: "24h"` over the
   payload `{ id, email, role }`, and the response is `200 { "token": "<JWT>" }`. No cookie is
   set; token storage is the client's problem and belongs to theme 2.

Health is intentionally dumb: it returns a literal object and never touches the store, so it
stays a liveness check and not an accidental readiness check.

## 5. Frontend behaviour (S1-002, S1-004)

`public/index.html` carries `<title>Time-Off</title>` and an `<h1>Time-Off</h1>`, so the
branding criterion holds whether the reviewer looks at the tab or the page. The form is
`<form id="login-form" method="POST" action="/login">` with `<input type="email" name="email"
required>`, `<input type="password" name="password" required>` and `<button type="submit">`,
which satisfies the markup criteria literally, plus an empty `<p id="message">` region for
feedback.

`public/app.js` attaches a `submit` listener, calls `preventDefault()`, and posts
`JSON.stringify({ email, password })` to `/login` with `Content-Type: application/json`. On a
200 it writes a success message and, for this sprint only, keeps the token in a module variable
so a demo can show it was issued; it does not store it in `localStorage`, does not redirect and
does not decode it, because the role-appropriate home page is theme 2's story and pre-building
it would be out of scope. On a 400 or 401 it renders `error` from the response body in the
message region. A network failure renders a generic "could not reach the server" message rather
than failing silently, per the architecture's no-silent-failures rule.

The page is served over the same origin as the API (ADR-004), so no CORS handling is needed on
the client.

## 6. Edge cases and error handling

| # | Situation | Expected behaviour | Story |
|---|---|---|---|
| E1 | Port 3000 already in use | The `listen` error surfaces on stderr with a clear message and the process exits non-zero. No silent retry, no fallback port. | S1-001 |
| E2 | Node older than 22.6 | `npm start` fails on the unknown flag. `engines` documents the requirement; the README states it. | S1-001 |
| E3 | Server restarted | Store is empty and re-seeded, so any state created at runtime is gone. This is the specified behaviour, not a bug. | S1-001 |
| E4 | `seedUsers()` called twice | Map is cleared first; still exactly three users, no duplicates. | S1-001 |
| E5 | Unknown path, for example `GET /nope` | `404` with a JSON body, never an HTML error page. | S1-002 |
| E6 | `GET /login` (browser navigation to the form action) | Falls through to the JSON 404, because only `POST /login` is registered. | S1-004 |
| E7 | Wrong method on a known path, for example `POST /health` | JSON 404. Express 5 does not auto-generate a 405 and none is hand-rolled. | S1-003 |
| E8 | `/health` called with no, or an invalid, `Authorization` header | Still `200`. The header is not inspected; NF1 exempts this endpoint. | S1-003 |
| E9 | Malformed JSON on `/login`, e.g. `{"email":` | `400 { "error": "invalid json body" }` via the error handler, not an unhandled 500. | S1-004 |
| E10 | Empty body, missing `password`, or `email: null` | `400 { "error": "email and password are required" }`. | S1-004 |
| E11 | Non-string types, e.g. `email: 123` or `password: { "$ne": "" }` | Rejected by the type check with `400`, before any lookup. Because the store is a `Map` and comparisons are string equality, there is no injection surface even if it were not. | S1-004 |
| E12 | Email with different casing or surrounding whitespace, e.g. `  Employee@TimeOff.local ` | Matches. Email is trimmed and lowercased before lookup. | S1-004 |
| E13 | Password with surrounding whitespace | Does not match. Passwords are compared exactly. | S1-004 |
| E14 | Unknown email vs. known email with wrong password | Identical `401 { "error": "invalid credentials" }` in both cases. No user enumeration. | S1-004 |
| E15 | `JWT_SECRET` unset | Falls back to `"workshop-secret"`, so a zero-config `npm start` issues valid tokens (NF4). | S1-004 |
| E16 | `JWT_SECRET` set to a different value between restarts | Previously issued tokens stop verifying in theme 2. Expected, documented, no migration path. | S1-004 |
| E17 | Response body of a successful login | Contains only `token`. The user record, and above all the password, is never serialised into a response. | S1-004 |
| E18 | Unexpected exception anywhere in a handler | The error middleware logs it via `console.error` and returns `500 { "error": "internal server error" }` without leaking a stack trace to the client. | all |

## 7. Assumptions

These were not stated in the plan and were resolved rather than escalated. Each is cheap to
reverse if the product owner disagrees.

The landing-page form carries `method="POST"` and `action="/login"` exactly as S1-002 requires,
while S1-004 requires `/login` to consume JSON, so the two criteria are reconciled by
progressive enhancement: the attributes are present as a fallback and `public/app.js` intercepts
the submit and sends JSON. With JavaScript disabled a submit produces a 400 JSON body. The
reasoning is recorded in ADR-004. This was judged a resolvable tension, not a conflict, so
`questions.md` was not opened.

Fixture emails use the `@timeoff.local` domain and obvious passwords because they are workshop
credentials meant to be typed by hand and read from a README, not secrets.

`managerId` is on the `User` type from the start, and the seeded employee points at the seeded
manager. It is unused in sprint 1. The justification is that "one user per role" is only a
meaningful fixture if the manager is somebody's manager, and adding the field later would mean
editing the seed anyway. No behaviour depends on it this sprint.

The port is the literal `3000` rather than `process.env.PORT ?? 3000`, because the acceptance
criterion names `localhost:3000` and the architecture forbids environment configuration.
`JWT_SECRET` is the single exception, and it is mandated by NF4.

No test files are added. `docs/ARCHITECTURE.md` says tests are written only when a story asks,
and none of the four stories does. Verification for this sprint is manual: `npm start`, then
`curl` against `/health` and `/login`, then the browser at `http://localhost:3000`.

## 8. Files per story

### S1-001 — Express server and in-memory user store

- **ADD** `package.json` — name, `"type": "module"`, `"engines": { "node": ">=22.6.0" }`,
  `"scripts": { "start": "node --experimental-strip-types src/index.ts" }`, dependencies
  `express`, `jsonwebtoken`, `cors`, devDependencies `typescript`, `@types/node`,
  `@types/express`, `@types/jsonwebtoken` (ADR-002)
- **ADD** `tsconfig.json` — editor-only, `noEmit`, `erasableSyntaxOnly`,
  `allowImportingTsExtensions`, `verbatimModuleSyntax`, `module: nodenext`, `strict`
- **ADD** `.gitignore` — `node_modules`
- **ADD** `src/store.ts` — `Role` and `User` types, `users` map, accessors, `resetStore`
- **ADD** `src/seed.ts` — the three fixture users and `seedUsers()`
- **ADD** `src/index.ts` — app creation, `cors()`, `express.json()`, JSON 404 handler, error
  handler, `seedUsers()`, `listen(3000)` with the startup log line
- **ADD** `README.md` section or file — how to run, the three credentials, the
  no-persistence caveat (append if a README already exists)
- **MODIFY** none
- **DELETE** none

### S1-002 — Landing page with login form

- **ADD** `public/index.html` — "Time-Off" title and heading, login form with email input,
  password input, submit button, `method="POST"`, `action="/login"`, message region
- **ADD** `public/styles.css` — minimal layout, no framework, no CDN
- **ADD** `public/app.js` — empty-ish in this story or a no-op listener; the fetch call lands in
  S1-004
- **MODIFY** `src/index.ts` — mount `express.static("public")` before the routes so `GET /`
  serves the page
- **DELETE** none

### S1-003 — `GET /health`

- **ADD** `src/routes/health.ts` — router returning `200 { status: "ok" }` as JSON
- **MODIFY** `src/index.ts` — mount the health router ahead of the 404 handler
- **DELETE** none

### S1-004 — `POST /login` with JWT

- **ADD** `src/auth.ts` — `JWT_SECRET` resolution, `TokenPayload` type, `signToken(user)` with
  HS256 and `expiresIn: "24h"` (ADR-003)
- **ADD** `src/routes/auth.ts` — `POST /login`: content-type guard, presence and type
  validation, case-insensitive email lookup, exact password comparison, 400/401 responses,
  `{ token }` on success
- **MODIFY** `src/index.ts` — mount the auth router
- **MODIFY** `public/app.js` — intercept the submit, `fetch` JSON to `/login`, render the
  success or error message
- **DELETE** none

### Developer addendum (S1-001)

- **MODIFY** `package.json` — add `@types/cors` to devDependencies. `src/index.ts` imports
  `cors`, and the original devDependency list omitted its type declarations, which made
  `npx tsc --noEmit` fail even though `npm start` was unaffected. `@types/cors` is a type-only
  package covered by the architecture's `@types/*` allowance, so this is an addition within the
  existing rule, not a new interpretation.

## 9. Compliance with `docs/ARCHITECTURE.md`

Stack, store, seeding, auth library, dependency list, run command, flat layout and the
tests-only-if-asked rule are all followed as written. No pagination and no notification design
appears, because no sprint 1 story needs either. The one interpretation, devDependencies for
type declarations, is argued in ADR-002 and is reversible by deleting four packages.

Against the review checklist: the only trust boundary in the sprint is `POST /login`, and it
validates content type, presence and types before touching the store, returns a uniform 401 to
avoid enumeration, and never echoes the user record. `/health` and `/` are unauthenticated by
specification (NF1). There is no SQL, no shell invocation and no `innerHTML` assignment of
server data in the frontend, so no injection vector is introduced. Every acceptance criterion in
the plan maps to a row in section 4, section 5 or section 6.
