# Sprint 2 — Technical Design: Log in & log out

Covers stories S2-001 (login endpoint), S2-002 (auth middleware & token blocklist),
S2-003 (logout endpoint), and S2-004 (role-based home pages). It builds directly on
the Sprint 1 bootstrap (`src/index.ts`, `src/store.ts`, `src/seed.ts`, `public/`) and
complies with `docs/architecture.md`, ADR-001 (stack) and ADR-002 (no-build TS).

## Overview

Sprint 2 turns the seeded, unauthenticated skeleton into an app with sessions.
A user posts credentials to `POST /login` and gets a 24h HS256 JWT. A global auth
middleware guards every route except a small public allowlist, validates the Bearer
token, rejects blocklisted or invalid tokens, and attaches the decoded user to
`req.user`. `POST /logout` drops the presented token into an in-memory blocklist so it
can no longer be used. `GET /` becomes role-aware: it serves the static landing page
when the caller is unauthenticated and a server-rendered, role-specific home page when
the caller presents a valid token.

No new runtime dependency is introduced. `jsonwebtoken` and `cors` were already on the
ADR-001 allowlist; this sprint is the first to actually use `jsonwebtoken`.

## Components

All new/changed code stays in the flat layout mandated by `architecture.md`
(`src/{index,store,seed,auth}.ts` + `src/routes/`).

- **`src/auth.ts` (NEW).** The single home for auth logic:
  - `getSecret()` — returns `process.env.JWT_SECRET ?? "workshop-secret"`.
  - `signToken(user)` — `jwt.sign({ email, role }, getSecret(), { algorithm: "HS256", expiresIn: "24h" })`.
  - `verifyToken(token)` — `jwt.verify(token, getSecret(), { algorithms: ["HS256"] })`; throws on bad signature / expiry.
  - `getBlocklist()` — lazily initializes and returns the `Set<string>` under store key `"blocklist"`.
  - `authMiddleware(req, res, next)` — the global guard (see "Auth flow" below).
- **`src/routes/auth.ts` (NEW).** An Express `Router` exposing `POST /login` and
  `POST /logout`. Login validates the payload, looks the user up in the store, and
  returns a signed token. Logout reads the Bearer token and adds it to the blocklist.
- **`src/routes/home.ts` (NEW).** An Express `Router` exposing `GET /`. It performs
  *optional* auth: if a valid, non-blocklisted Bearer token is present it renders the
  role home page; otherwise it serves `public/index.html`.
- **`src/index.ts` (MODIFY).** Wires the pieces in the correct order: `cors`,
  `express.json`, `express.static("public", { index: false })`, the global
  `authMiddleware`, then `GET /health`, then the two routers.
- **`public/index.html` (MODIFY) + `public/app.js` (NEW).** Minimal browser glue so a
  human can actually log in during the demo (see Assumption 1).

## Data model

State continues to live under keys in the single in-memory `Map` from `src/store.ts`
(ADR-001). No files, no DB.

- `store["users"]`: `Map<email, User>` — unchanged from Sprint 1.
  `User = { email, password, role: "employee" | "manager" | "hr" }`.
- `store["blocklist"]`: `Set<string>` — **new**. Holds raw JWT strings that have been
  logged out. Lazily created by `getBlocklist()` on first access; reset on restart,
  which satisfies S2-003's "blocklist is reset when the server restarts".
- **JWT payload** (signed, not stored): `{ email, role, iat, exp }`. `exp` is 24h after
  `iat` via `expiresIn: "24h"`.
- **`req.user`** (per-request, set by middleware): `{ email, role }` taken from the
  verified JWT payload.

## API surface

| Method | Path | Auth | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | public | 200 `{ status: "ok" }` | — |
| POST | `/login` | public | 200 `{ token }` | 400 missing/invalid body, 401 bad credentials |
| POST | `/logout` | protected | 200 `{ message: "Logged out successfully" }` | 401 (no/invalid/blocklisted token) |
| GET | `/` | optional | 200 landing HTML (anon) or role home HTML (auth) | — |
| any other | * | protected | per route | 401 when token missing/invalid/blocklisted |

Static assets under `public/` (`styles.css`, `app.js`) are served publicly by
`express.static` before the guard runs.

### Auth flow (global middleware with public allowlist) — S2-002

`app.use(authMiddleware)` is registered once, before the route handlers, so every route
inherits it (satisfies "applied to the Express app globally"). The middleware carries an
explicit public allowlist:

```
PUBLIC = [ GET /health, POST /login, GET / ]
```

Logic:
1. If `req.method`/`req.path` matches an entry in `PUBLIC`, call `next()` (no token
   required). Static assets never reach here because `express.static` runs first.
2. Else require `Authorization: Bearer <token>`. Missing header, or a header that does
   not start with `"Bearer "` → `401`.
3. `verifyToken(token)`; a bad signature or expired token throws → `401`.
4. If `getBlocklist().has(token)` → `401` (`"token is blocklisted"`).
5. Attach `req.user = { email, role }` from the payload and call `next()`.

`GET /` is in the allowlist so it is never blocked, but its handler still parses the
token itself to decide landing vs. home (optional auth). This keeps the public landing
page reachable while letting an authenticated caller get their home page from the same
URL with no redirect (S2-004).

## Edge cases

- **Missing `email` or `password` on login** → `400` (hand-rolled check that both are
  present strings; no validator library per ADR-001).
- **Unknown email / wrong password** → `401`. Password comparison is a plain string
  equality against the seeded plaintext password (Assumption 2). Same status for both
  cases to avoid leaking which field was wrong.
- **`Authorization` header without `"Bearer "` prefix** → `401`.
- **Expired token** (past `exp`) → `jwt.verify` throws → `401`.
- **Tampered / wrong-secret token** → signature check fails → `401`.
- **Blocklisted token** → `401` even though the signature is still otherwise valid.
- **Re-login after logout** → the old token stays blocklisted; a fresh `POST /login`
  issues a brand-new token with a new `iat`, which is not in the blocklist and works
  (S2-003). (The new token differs from the old because `iat` advances; if two logins
  happen within the same second the payloads are identical and `jwt.sign` yields the
  same string, which is acceptable for the demo.)
- **`GET /` with an expired or blocklisted token** → treated as unauthenticated →
  landing page (the home handler swallows verify errors and falls back to landing).
- **Server restart** → `users` re-seeded by `initSeed()`, `blocklist` empty again; all
  previously issued tokens still verify by signature until their `exp`, but this is the
  documented in-memory demo behavior (NF6).

## Files per story

### S2-001 — Login Endpoint
- **ADD** `src/auth.ts` — `getSecret()`, `signToken(user)` (HS256, `expiresIn: "24h"`, payload `{ email, role }`).
- **ADD** `src/routes/auth.ts` — `Router` with `POST /login`: validate body (400), look up user in `store["users"]`, compare password (401 on mismatch), return `{ token }`.
- **MODIFY** `src/index.ts` — mount the auth router.

### S2-002 — Auth Middleware & Token Blocklist
- **MODIFY** `src/auth.ts` — add `verifyToken(token)`, `getBlocklist()`, and `authMiddleware` (public allowlist, Bearer parsing, verify, blocklist check, `req.user`).
- **MODIFY** `src/index.ts` — `app.use(authMiddleware)` registered globally (after `express.static("public", { index: false })` and `express.json`, before the routers); keep `GET /health` public via the allowlist.

### S2-003 — Logout Endpoint
- **MODIFY** `src/routes/auth.ts` — add `POST /logout` (protected): extract the Bearer token, `getBlocklist().add(token)`, return `{ message: "Logged out successfully" }`.

### S2-004 — Role-Based Home Pages
- **ADD** `src/routes/home.ts` — `Router` with `GET /`: optional-auth; serve `public/index.html` when anonymous, else render role home HTML (heading `"Employee Home"` / `"Manager Home"` / `"HR Home"`, the user's email, and a logout control) via a template string, direct `200`.
- **MODIFY** `src/index.ts` — set `express.static("public", { index: false })` so `GET /` is handled by the home router (not auto-served `index.html`); mount the home router.
- **MODIFY** `public/index.html` — reference `public/app.js` from the existing login form.
- **ADD** `public/app.js` — wire the login form (POST `/login`, store token in `localStorage`, request `GET /` with the `Authorization` header, swap in the returned home HTML) and the logout control (POST `/logout` with the header, clear `localStorage`, reload). Demo UX only (Assumption 1).

## Assumptions

1. **Browser navigation cannot send `Authorization` headers.** The S2-004 ACs are
   framed around the header and are exercised deterministically via tests/curl. For a
   human using the browser, `public/app.js` stores the token in `localStorage` after
   login and attaches it to a `fetch("/")` to retrieve and display the home page; the
   logout control fetches `POST /logout` with the header. This client glue is the
   minimum needed to make the demo usable and is kept intentionally small.
2. **Passwords are compared as plaintext** against the seeded values (`src/seed.ts`
   stores plaintext). No hashing library is allowed by ADR-001, and this is a workshop
   demo, so plaintext comparison is accepted.
3. **The blocklist lives under store key `"blocklist"` as a `Set<string>`**, lazily
   initialized by `getBlocklist()`. It is not seed data, so `initSeed()` is left
   untouched.
4. **Home pages are server-rendered from template strings**, not static
   `public/home-*.html` files, because the user's email must be injected server-side and
   the AC requires a direct `200` from `GET /` with no redirect. `express.static` is set
   to `{ index: false }` so it does not shadow the home route at `/`.
5. **`GET /` treats any non-valid token as anonymous** and returns the landing page,
   including expired or blocklisted tokens.

## Files per story (deviation — added during implementation)

- **MODIFY** `package.json` — `test` script gains `--test-concurrency=1`. Sprint 2 adds
  multiple test files that import `src/index.ts` (which calls `app.listen(3000)` at
  module load); Node's test runner isolates files into separate processes and runs them
  concurrently by default, so two files importing `src/index.ts` at once raced for port
  3000 (`EADDRINUSE`). Forcing serial file execution is the minimal fix; no new
  dependency, no change to `src/index.ts`'s hardcoded port.
