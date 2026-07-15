# QA Report — Sprint 2 (Log in & log out)

## Pass 1

**Date:** 2026-07-15
**Scope:** S2-001, S2-002, S2-003, S2-004 (all at `status: testing`).
Reviewed only the files listed in `design.md` "Files per story" plus their direct
imports: `src/auth.ts`, `src/routes/auth.ts`, `src/routes/home.ts`, `src/index.ts`,
`src/store.ts`, `src/seed.ts`, `public/index.html`, `public/app.js`. Enforced
`docs/architecture.md` hard rules + Review Checklist and ADR-001..005.

### Test suite

`npm test` → **27 pass, 0 fail** (`node:test`, `--test-concurrency=1`). No failing
test, so no test-derived defect.

### Failure modes considered (adversarial)

- **NF1 — auth on every non-public boundary.** `authMiddleware` is registered globally
  (`app.use(authMiddleware)`) before all route handlers. Public allowlist is exactly
  `GET /health`, `POST /login`, `GET /` matched on both method AND `req.path`. Probed
  wrong-method variants (`GET /login`, `POST /health`) and trailing-slash variants
  (`/health/`, `/login/`): all fail closed (require a token). No unprotected route found.
  `POST /logout` is not on the allowlist and correctly requires a valid Bearer token.
- **express.static ordering.** `express.static("public", { index:false })` runs before
  the guard, but only serves `index.html`, `styles.css`, `app.js` — all intended-public
  assets. `{ index:false }` prevents it from shadowing the role-aware `GET /`. No
  protected resource is exposed by static serving.
- **Logout truly invalidates.** `POST /logout` adds the raw token to the store-backed
  `Set<string>` blocklist; middleware verifies signature THEN checks
  `getBlocklist().has(token)` → 401. Confirmed by tests: post-logout the same JWT is
  rejected on protected routes and `GET /` falls back to the landing page. Re-login
  after logout issues a working new token (test crosses a 1s boundary to dodge the
  documented same-second `iat` collision — an accepted demo edge case, not a defect).
- **Role escalation.** Sprint 2 introduces no role-gated actions (those arrive in later
  themes). Home pages differ only by a title looked up from a fixed `ROLE_TITLES` map;
  no manager/HR privilege exists yet to abuse. N/A this sprint.
- **XSS in server-rendered home pages (ADR-005).** `renderHome` interpolates `title`
  (from the fixed `ROLE_TITLES` map — safe) and `email`. The email in the JWT payload is
  set server-side by `signToken` from a looked-up seeded user, so the only interpolated
  user value is a seeded email. ADR-005 explicitly accepts this as negligible XSS surface
  for the demo and mandates escaping only for future user-controlled fields. No
  user-controlled field is rendered in Sprint 2. Not a defect. (The public default secret
  that would let a forged token carry a crafted email is an intentionally-accepted risk
  per ADR-003 "Consequences"; escalating it would contradict an accepted ADR, so no
  question is filed.)
- **Injection on login.** `POST /login` hand-rolls presence/type checks (`typeof ... ===
  "string"` and non-empty) → 400; unknown email / wrong password → 401 (same status,
  no field-level leak). No DB/command surface exists (in-memory `Map` lookup by key).

### ADR / design fidelity

- Layout is flat and matches ADR-001 / design.md: `src/{index,store,seed,auth}.ts` +
  `src/routes/{auth,home}.ts`. No controller/service/repo drift.
- Dependencies in `package.json` are exactly `express`, `jsonwebtoken`, `cors` — no
  unauthorized library added. `--test-concurrency=1` is a script flag, not a dependency.
- JWT is HS256, payload `{ email, role }`, `expiresIn: "24h"`, secret from
  `JWT_SECRET ?? "workshop-secret"` — matches ADR-003 and the S2-001 ACs.
- Blocklist is a `Set<string>` under store key `"blocklist"`, lazily created, in-memory
  (resets on restart) — matches ADR-004.
- `GET /` is a dedicated route with optional auth and no redirect, `{ index:false }` set
  — matches ADR-005.

### Defects filed

None.

### Bugs closed

None (no prior bugs).

### Status per story

| Story | Result | New status |
|---|---|---|
| S2-001 Login Endpoint | clean | done |
| S2-002 Auth Middleware & Blocklist | clean | done |
| S2-003 Logout Endpoint | clean | done |
| S2-004 Role-Based Home Pages | clean | done |

Every story is `done` and no bug is `open` or `fixed`, so backlog theme 2 is flipped to
`[DONE]`.
