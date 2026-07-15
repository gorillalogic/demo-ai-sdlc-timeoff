# ADR-004 — Logout via an in-memory JWT blocklist

- **Status:** Accepted
- **Date:** 2026-07-15
- **Sprint:** 2
- **Drivers:** S2-003

## Context

F1.3 / S2-003 require logout to invalidate the current session. But ADR-003 makes JWTs
stateless: a validly signed token stays valid until its `exp` regardless of any server
action. `architecture.md` explicitly prescribes the resolution: "Logout = in-memory
blocklist." This ADR records how that blocklist is shaped and where it lives, given the
store rules from ADR-001 (single in-memory `Map`, no DB, no files, reset on restart).

## Decision

Logout adds the presented raw JWT string to an in-memory blocklist, and the auth
middleware rejects any token found in it.

The blocklist is a `Set<string>` stored under key `"blocklist"` in the shared
`src/store.ts` `Map`, accessed through `getBlocklist()` in `src/auth.ts`, which lazily
creates the Set on first use. `POST /logout` (a protected route, so it only runs for a
valid token) extracts the Bearer token and calls `getBlocklist().add(token)`, returning
`{ message: "Logged out successfully" }`. The auth middleware, after verifying a token's
signature, checks `getBlocklist().has(token)` and returns `401` on a hit.

Because the Set lives only in memory, a server restart empties it, which is the expected
demo behavior. After logout, the same token is refused, but a fresh `POST /login` issues a
new token that is not in the blocklist and works normally.

## Consequences

- Real, immediate revocation for the current session with no persistence layer.
- The blocklist grows unbounded for the lifetime of the process (no eviction of tokens
  past their `exp`). Harmless for a demo that resets on restart; a production version would
  evict expired entries or store a per-user token version instead.
- Revocation state is not durable and not shared across processes. Consistent with NF6
  (in-memory, single process, reset on restart) and out of scope to change.
- Keeps the blocklist under the same store Map as every other piece of state, so there is
  one persistence mechanism to reason about (ADR-001).
