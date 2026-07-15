# Sprint 1 — Technical Design: App runs locally

Scope: stories S1-001, S1-002, S1-003 only. This sprint stands up the runnable
skeleton — server boot, health endpoint, static landing page, and a seeded set of
hardcoded users — with no authentication logic yet (deferred to sprint 2).

Governing rules: `docs/architecture.md` (hard rules) and ADR-001 (stack), ADR-002
(no-build TypeScript execution). Nothing in this design deviates from those rules.

## Assumptions

1. **TypeScript runtime (ADR-002).** The app runs `.ts` directly via Node native type
   stripping. `npm start` runs `node --experimental-strip-types src/index.ts`. This
   requires Node ≥ 22.6 (≥ 23.6 to run without the flag). This is the only way to
   honor both "all code is TypeScript" and "no build step" while keeping the three-
   dependency allowlist. Declared in `package.json` `engines`.
2. **Static front end location.** Vanilla HTML/CSS/JS lives in a top-level `public/`
   directory and is served by Express via the built-in `express.static` middleware
   (no new dependency). `GET /` returns `public/index.html`.
3. **Health endpoint placement.** S1-001 requires `src/routes/` to exist but be
   *empty initially*. Therefore `GET /health` is defined inline in `src/index.ts` for
   this sprint; `src/routes/` is created empty (a `.gitkeep`) and starts receiving
   endpoint files in sprint 2. This satisfies both ACs literally.
4. **No login submission in sprint 1.** The landing form has no client-side or server
   handler; the button does nothing yet (per S1-002 AC and backlog theme 2).
5. **CORS.** `cors` is an allowed/required dependency per architecture but is not
   exercised by any sprint-1 AC (FE and BE are same-origin). It will be wired in
   sprint 2 when the API is called from the browser. Not installed-and-unused is a
   risk; we install it now (it is on the allowlist) and enable it in `index.ts` so the
   boot path is exercised, but no sprint-1 AC depends on it.

## Components

| Component | File | Responsibility (sprint 1) |
|---|---|---|
| Server bootstrap | `src/index.ts` | Create Express app, enable JSON + CORS, serve `public/`, define `GET /health`, call `initSeed()`, listen on port 3000. |
| Store | `src/store.ts` | Export a single module-level in-memory `Map<string, unknown>` used by all modules. |
| Seed | `src/seed.ts` | Export `initSeed()` that populates the three hardcoded users into the store. |
| Routes dir | `src/routes/` | Empty placeholder (`.gitkeep`); endpoint files land here from sprint 2. |
| Landing page | `public/index.html`, `public/styles.css` | Static "Time-Off" landing page with a login form (email, password, submit). |

Boot sequence in `src/index.ts`: import `store`, call `initSeed()`, configure
middleware (`express.json()`, `cors()`, `express.static("public")`), register
`GET /health`, then `app.listen(PORT)` where `PORT = 3000`.

## Data model

The store is a top-level `Map`. Sprint 1 uses exactly one key.

- `store` : `Map<string, unknown>`
- `store.get("users")` : `Map<string /* email */, User>`

```
User {
  email:    string   // e.g. "employee@test.com"
  password: string   // plaintext, demo only
  role:     "employee" | "manager" | "hr"   // string-literal union (no enum, per ADR-002)
}
```

Seeded users (S1-003):

| email | password | role |
|---|---|---|
| employee@test.com | password123 | employee |
| manager@test.com | password123 | manager |
| hr@test.com | password123 | hr |

Retrieval contract for future sprints: `store.get("users").get(email)` returns the
`User` or `undefined`. `initSeed()` is idempotent — calling it twice re-seeds the same
three users without duplication (it sets a fresh `Map` under `"users"`).

## API surface (sprint 1)

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | `200` `{ "status": "ok" }` (JSON) |
| GET | `/` | none | `200` `public/index.html` (served static) |
| GET | `/styles.css`, other `public/*` | none | static assets |

No other endpoints exist yet. `POST /login` and the protected API arrive in sprint 2.
Per NF1, `/health` and the static landing page are the only unauthenticated surfaces
that will remain unauthenticated once auth exists.

## Edge cases

- **Unknown route.** Express default 404 for any path not matched by a route or a
  static file. Acceptable for sprint 1 (no custom error middleware required yet).
- **Port already in use.** `app.listen(3000)` emits `EADDRINUSE`; Node surfaces the
  error and the process exits non-zero — this is an acceptable, non-silent failure.
- **Node too old for type stripping.** If Node < 22.6, `npm start` fails loudly with a
  syntax/flag error. `engines` in `package.json` documents the requirement; the sprint
  README notes it.
- **`/health` content type.** Must be `application/json` — use `res.json(...)`, not
  `res.send(string)`, so the body is exactly `{"status":"ok"}`.
- **Static vs route precedence.** `express.static("public")` serving `/` must not
  shadow `/health`; register order is middleware first then routes, and paths do not
  collide, so both resolve correctly.
- **Seed before serve.** `initSeed()` runs before `app.listen` so the store is never
  observed empty by a request.
- **No submission logic.** The login form must not POST anywhere in sprint 1 (button
  is inert or `type="button"`); an accidental form submit that reloads the page is a
  minor defect to avoid via `preventDefault`/`type="button"`.

## Files per story

### S1-001 — Project Bootstrap with Health Endpoint
- **ADD:** `package.json` — `start` script = `node --experimental-strip-types src/index.ts`; dependencies exactly `express`, `jsonwebtoken`, `cors`; `type: "module"`; `engines.node >= 22.6`.
- **ADD:** `tsconfig.json` — editor type-checking only (not part of `npm start`); `module`/`moduleResolution` for NodeNext, `allowImportingTsExtensions`, `noEmit`.
- **ADD:** `src/index.ts` — Express bootstrap, middleware, inline `GET /health` returning `{ status: "ok" }`, `listen(3000)`.
- **ADD:** `src/store.ts` — export in-memory `Map`.
- **ADD:** `src/routes/.gitkeep` — creates the empty `src/routes/` directory.
- **ADD:** `.gitignore` — `node_modules`.

### S1-002 — Landing Page with Login Form
- **ADD:** `public/index.html` — "Time-Off" heading/title + login form (email input, password input, submit button labeled "Log In"). No submission logic.
- **ADD:** `public/styles.css` — vanilla CSS layout for the landing page and form.
- **MODIFY:** `src/index.ts` — add `express.static("public")` so `GET /` serves the landing page.

### S1-003 — Hardcoded User Seed
- **ADD:** `src/seed.ts` — export `initSeed()` that creates `Map<email, User>` for the three roles and stores it under key `"users"`.
- **MODIFY:** `src/index.ts` — import and call `initSeed()` during boot, before `listen`.

### Tests (all stories)
- **ADD:** `test/index.test.ts` — `node:test` covering S1-001 ACs (`GET /health` returns `{status:"ok"}` with 200, JSON content type) and S1-002 ACs (`GET /` serves `public/index.html` containing the Time-Off heading and a login form with email/password/submit).
- **ADD:** `test/seed.test.ts` — `node:test` covering S1-003 ACs (`initSeed()` populates three users with correct email/password/role, retrievable by email via `store.get("users").get(email)`, idempotent re-seed).

## AC traceability

- S1-001: `npm install && npm start` boots (package.json + ADR-002 runtime); listens on 3000 (`index.ts`); `GET /health` → `{status:"ok"}` 200 (inline route); deps allowlist (package.json); `src/store.ts` exports Map; all TS, no build (ADR-002); `src/routes/` exists empty (`.gitkeep`).
- S1-002: `GET /` shows Time-Off landing (`public/index.html` via static); login form with email+password+submit; vanilla HTML/CSS, no submission logic; heading shows "Time-Off".
- S1-003: `src/seed.ts` exports `initSeed()`; three users (employee/manager/hr) with email/password/role; called from `index.ts` at startup; stored under `"users"` as `Map<email,user>`; retrievable by email.
