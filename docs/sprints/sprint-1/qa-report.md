# Sprint 1 — QA Report

## Pass 1

**Date:** 2026-07-28
**Reviewed:** S1-001, S1-002, S1-003, S1-004, all at `status: testing`
**Environment:** Node v22.20.0, npm 10.9.3, express 5.2.1, macOS. `npm install` reported 99
packages audited, 0 vulnerabilities. The server was started with `npm start` and exercised with
`curl`; every claim below was observed, not inferred.

### Scope

Review was bounded to the files listed in `design.md` section 8, plus the developer addendum:
`package.json`, `tsconfig.json`, `.gitignore`, `README.md`, `src/index.ts`, `src/store.ts`,
`src/seed.ts`, `src/auth.ts`, `src/routes/health.ts`, `src/routes/auth.ts`, `public/index.html`,
`public/styles.css` and `public/app.js`. `node_modules/express/lib/application.js` was opened
once, as a direct import, to establish the cause of B1-001. Nothing under `src/` was modified.

Per the amendment to `docs/ARCHITECTURE.md` line 7, the dependency rule scopes `express`,
`jsonwebtoken` and `cors` to runtime dependencies and permits type-only devDependencies. The
five devDependencies (`typescript`, `@types/node`, `@types/express`, `@types/jsonwebtoken`,
`@types/cors`, the last added by the developer addendum) were checked against that rule and are
compliant, so no defect was filed for them.

### Test suite

There is no test suite. `npm test` fails with `Missing script: "test"` and no `test/` directory
exists. This is not a defect: `docs/ARCHITECTURE.md` says tests are written only if a story asks
for them, none of the four sprint 1 stories asks, and `design.md` section 7 records the decision
and prescribes manual verification instead. The manual verification described there was carried
out in full. As a substitute static check, `npx tsc --noEmit` was run against the committed
editor-only `tsconfig.json` and exits clean, which also confirms the addendum's claim that
`@types/cors` fixed the previously failing typecheck.

### Failure modes considered

Startup and process model: a second instance started while port 3000 is occupied (E1, defect
found, B1-001); startup on Node older than 22.6 (E2, `engines` present and both README sections
state the requirement); double seeding (E4, `seedUsers` calls `resetStore` first, so the map
holds exactly three users); in-memory state loss on restart (E3, inherent, no file or database
access anywhere in the tree).

Routing and content negotiation: unknown path (E5, `GET /nope` returns `404 {"error":"not
found"}` as JSON, never an HTML error page); wrong method on a known path (E7, `POST /health`
returns the JSON 404, no hand-rolled 405); browser navigation to the form action (E6,
`GET /login` returns the JSON 404, confirming only `POST /login` is registered); static asset
retrieval (`/styles.css` and `/app.js` both 200 with correct content types); path traversal
above the static root (`GET /../package.json` with `--path-as-is` returns 404, the file is not
served); CORS preflight (`OPTIONS /login` returns 204).

Health: 200 with `{"status":"ok"}` and `Content-Type: application/json; charset=utf-8`; still
200 when an `Authorization: Bearer garbage` header is attached (E8), confirming the header is
never inspected and NF1's exemption holds; the handler returns a literal and never touches the
store, so it cannot degrade into a readiness check.

Login input handling at the one trust boundary in the sprint: malformed JSON (E9, 400
`invalid json body` through the error handler, not a 500); empty JSON object, missing password
and `email: null` (E10, 400 `email and password are required`); non-string types including
`email: 123` and the NoSQL-shaped `password: {"$ne": ""}` (E11, rejected by the type check with
400 before any lookup, and the store is a `Map` compared with string equality so there is no
injection surface behind it); whitespace-only values (400); oversized and mis-encoded bodies
(not covered by the design, defect found, B1-002); non-JSON content types (415, see the open
question below).

Credential logic: mixed case and padded email matches (E12, `  Employee@TimeOff.Local  ` logs
in); padded password does not match (E13, exact comparison confirmed); unknown email and wrong
password return byte-identical `401 {"error":"invalid credentials"}` bodies, so the endpoint does
not enumerate users (E14); a successful response body contains only `token`, with no user record
and no password anywhere in it (E17).

Token contract: header is `{"alg":"HS256","typ":"JWT"}`; payload is exactly `{id, email, role}`
plus `iat` and `exp`, with no password field, matching ADR-003's projection and covering the
acceptance criterion that `id` and `role` be present; `exp - iat` is exactly 86400 seconds;
the token verifies with `workshop-secret` and is rejected with any other key (E15); with
`JWT_SECRET=custom-secret` set, `src/auth.ts` resolves that value, tokens verify with it and
fail against the default (E16). Only `src/auth.ts` imports `jsonwebtoken`, so theme 2's
verification and blocklist have a single place to land.

Frontend: `public/index.html` carries both `<title>Time-Off</title>` and `<h1>Time-Off</h1>`,
and the form is `<form id="login-form" method="POST" action="/login">` with `type="email"`,
`type="password"` and a submit button, so the S1-002 markup criteria hold literally.
`public/app.js` calls `preventDefault()`, posts JSON, and renders every branch through
`textContent`, never `innerHTML`, so no server-controlled string reaches the DOM as markup and
there is no XSS vector. Network failure and unparseable responses both render a visible message
rather than failing silently.

Design and ADR fidelity: the file layout matches `design.md` section 2 exactly, six backend
modules and three frontend files, no controller, service or repository layer, no dependency
injection. Middleware order in `src/index.ts` is `cors()`, `express.json()`,
`express.static("public")`, health router, auth router, JSON 404, four-argument error handler,
which is the order the design calls load bearing. Source is erasable-syntax only, with no
`enum`, `namespace`, parameter property or decorator, and every relative import carries an
explicit `.ts` extension, as ADR-002 requires. Runtime state exists only in `src/store.ts`; no
route file declares a module-level mutable variable. `public/app.js` keeps the issued token in a
module variable and does not write it to `localStorage` or redirect, which is what the design
scopes to this sprint.

Two items were considered and deliberately not filed. First, `express.static("public")` uses a
path relative to the process working directory, so a manual `node src/index.ts` from another
directory would not serve the page; `npm start` always runs from the package root, and the
design specifies this exact call, so it is not a defect. Second, `GET /`, `/styles.css` and
`/app.js` are unauthenticated while NF1 lists only `POST /login` and `GET /health` as exempt;
S1-002's acceptance criteria require an anonymous landing page and ADR-004 resolves the tension
explicitly, so this is a recorded interpretation rather than a drift. Both are noted here so a
later reviewer does not re-litigate them.

### Defects filed

| id | story | severity | summary |
|---|---|---|---|
| B1-001 | S1-001 | high | Server prints its "listening" line and exits 0 when port 3000 is already in use. Bind failure is entirely silent: nothing on stderr, exit code 0. Contradicts E1 and the "no silent failures" checklist rule. |
| B1-002 | S1-004 | low | The error middleware special-cases only `SyntaxError`, so body-parser client errors (413 payload too large, invalid `Content-Encoding`) are answered `500 internal server error` and logged as crashes. |
| B1-003 | S1-001 | low | `README.md` line 7 still claims the only credentials in the repo are `password123` and `@test.com` addresses, contradicting the credential table the same story added and the actual fixtures in `src/seed.ts`. |

### Bugs closed

None. This is the first pass of sprint 1; no bug files existed before it.

### Open question raised

`docs/sprints/sprint-1/questions.md` was created with one entry. `ADR-004` states twice that a
non-JSON `POST /login`, such as a no-JavaScript form post, is rejected with a 400, while
`design.md` section 4 specifies 415 and the implementation returns 415. The same guard also
changes the outcome that E10 describes for a bodyless request. No acceptance criterion or BRD
line names a code for this case, so QA did not adjudicate and did not file it as a bug: choosing
between the two is an API-contract decision for the architect, and it will be inherited by every
later route that validates a content type. The developer should not resolve it during the rework
pass.

### Verdict per story

| story | verdict | new status | bugs |
|---|---|---|---|
| S1-001 | fail | `in-progress` | [B1-001](bugs/B1-001-silent-false-success-when-port-3000-busy.md), [B1-003](bugs/B1-003-readme-contradicts-itself-on-demo-credentials.md) |
| S1-002 | pass | `done` | none |
| S1-003 | pass | `done` | none |
| S1-004 | fail | `in-progress` | [B1-002](bugs/B1-002-client-errors-reported-as-500.md) |

S1-002 and S1-003 met every acceptance criterion and every relevant design row under adversarial
probing. S1-001 delivers a working server, store and seed, and fails only on its startup failure
path and its README deliverable. S1-004's authentication logic itself is correct on every
criterion, including the token contract, the enumeration-safe 401 and the type validation; the
defect is in the shared error middleware that its trust boundary depends on.

Theme 1 in `docs/BACKLOG.md` stays `[IN PROGRESS]`: two stories are not `done` and three bugs
are `open`.
