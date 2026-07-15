# ADR-003 — Stateless JWT auth with a global middleware and public-path allowlist

- **Status:** Accepted
- **Date:** 2026-07-15
- **Sprint:** 2
- **Drivers:** S2-001, S2-002

## Context

`architecture.md` fixes auth as `jsonwebtoken` HS256 with a secret that defaults to
`"workshop-secret"`, and NF1 requires every endpoint to be authenticated except
`POST /login` and `GET /health`. Sprint 2 (S2-001, S2-002) is the first sprint to
implement authentication. Two shapes need to be decided: how tokens are issued/verified,
and how the guard is wired into Express so "all routes inherit its behavior" while a
small set of routes stays public.

## Decision

**Token issuance and verification live in `src/auth.ts`.** `signToken(user)` produces an
HS256 JWT with payload `{ email, role }` and `expiresIn: "24h"`, yielding standard `iat`
and `exp` claims. `verifyToken(token)` verifies with `algorithms: ["HS256"]` and throws
on bad signature or expiry. The secret comes from `getSecret()`
(`process.env.JWT_SECRET ?? "workshop-secret"`), so `npm start` works with zero config.
The token is the whole session: no server-side session record is kept (revocation is
handled separately in ADR-004).

**A single global middleware guards the app.** `app.use(authMiddleware)` is registered
once, before the route handlers, so every route flows through it. The middleware holds an
explicit public allowlist of `GET /health`, `POST /login`, and `GET /`. For an allowlisted
request it calls `next()`; for anything else it requires an `Authorization: Bearer <token>`
header, rejects a missing header or one without the `"Bearer "` prefix with `401`, verifies
the token (`401` on failure), and on success attaches `req.user = { email, role }` before
calling `next()`. Static assets are served by `express.static` *before* this middleware, so
they never reach the guard and need no allowlist entry.

`GET /` is public in the allowlist but still parses the token inside its own handler to
decide landing vs. role home (optional auth, see ADR-005).

## Consequences

- The auth check is impossible to forget on a new route: routes are protected by default,
  and making one public is a deliberate edit to the allowlist. This matches the review
  checklist ("auth checks at every protected boundary").
- Stateless tokens mean no session table and horizontal-scale friendliness we do not need,
  but also mean a token cannot be revoked by itself before `exp` — addressed by the
  blocklist in ADR-004.
- All token handling is hand-rolled against `jsonwebtoken`; no additional dependency is
  introduced, keeping the ADR-001 allowlist intact.
- The default secret is intentionally weak and public. Acceptable for a local workshop
  demo only; production would require a real secret and this ADR would be revisited.
