# ADR-003 — JWT issuance: HS256, 24-hour expiry, default secret, stateless payload

- **Status:** Accepted
- **Date:** 2026-07-28
- **Sprint:** 1
- **Drives stories:** S1-004

## Context

F1.1 and F1.2 require login with email and password returning a JWT valid for 24 hours, NF4
fixes HS256 and a secret read from `process.env.JWT_SECRET` defaulting to `"workshop-secret"`,
and NF1 makes every endpoint except `POST /login` and `GET /health` authenticated. Sprint 1
only issues tokens; verification middleware, the logout blocklist and role-based routing arrive
with theme 2. This ADR fixes the token contract now so that later work consumes it rather than
redefining it.

## Decision

Token concerns live in `src/auth.ts` and nowhere else. That module exports the resolved secret
and a `signToken(user)` function; route files never call `jsonwebtoken` directly. The secret is
resolved once at module load as `process.env.JWT_SECRET ?? "workshop-secret"`, so a bare
`npm start` works with zero configuration, as NF4 explicitly requires.

Tokens are signed with `algorithm: "HS256"` and `expiresIn: "24h"`, which lets `jsonwebtoken`
compute the `exp` claim. The payload carries exactly the claims a later authorization check
needs and nothing more: `id`, `email` and `role`, where `role` is the union
`"employee" | "manager" | "hr"`. The password is never in the payload, and the payload is not a
copy of the user record; it is a deliberate projection.

The token is stateless. Nothing about a session is stored server side in this sprint, so a
valid unexpired token is accepted purely on signature and `exp`. Theme 2 adds the in-memory
blocklist for logout, which is the only stateful exception the architecture allows.

Credential checking compares the submitted password to the seeded plaintext password with a
plain string equality test, because no hashing dependency is permitted. Both an unknown email
and a wrong password return the same 401 body, `{ "error": "invalid credentials" }`, so the
endpoint does not confirm which emails exist. Email is matched case-insensitively after
trimming; the password is compared exactly, with no trimming.

## Consequences

Any consumer, the browser client in theme 2 or a `curl` invocation in a review, can decode the
token and read the user id and role without a round trip, which is what makes the later
role-based home page trivial. The mirror of that is that the payload is readable by anyone who
holds the token: it is signed, not encrypted, so nothing sensitive may ever be added to it.

The default secret means an unconfigured deployment signs tokens with a value published in this
repository. That is acceptable only because the system is a local workshop demo with fixture
users and no real data, and NF4 mandates it. It should be called out in the README rather than
quietly relied upon.

A 24-hour expiry with no refresh token means the client simply gets a 401 after a day and logs
in again. No refresh, rotation or sliding expiry is designed, and none should be added without
a new ADR.

Plaintext password comparison is a knowingly accepted deviation from normal practice, forced by
the dependency rule. It is confined to the login route and the seed file, so introducing hashing
later would touch two files.
