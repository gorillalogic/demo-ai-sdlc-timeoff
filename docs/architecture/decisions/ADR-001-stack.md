# ADR-001 — Stack: Node + TypeScript + Express backend, vanilla HTML/JS frontend, in-memory store

- **Status:** Accepted
- **Date:** 2026-07-28
- **Sprint:** 1
- **Drives stories:** S1-001, S1-002, S1-003, S1-004

## Context

The Time-Off system is an internal demo application. `docs/ARCHITECTURE.md` fixes the stack as
hard rules: Node with TypeScript and Express on the backend, vanilla HTML and JavaScript on the
frontend, no build step, an in-memory `Map` store in `src/store.ts`, hardcoded users in
`src/seed.ts`, `jsonwebtoken` for HS256 auth, and only `express`, `jsonwebtoken` and `cors` as
runtime dependencies. NF6 in `docs/BRD.md` adds that the whole system, backend and frontend,
must run locally with nothing but `npm install` and `npm start`: no Docker, no database, no
cloud service, no environment file. This ADR records that stack as a decision so later sprints
have a single reference, and pins the specific versions and the process model that the rules
leave open.

## Decision

The application is a single Node process running Express 5 that serves both the JSON API and
the static frontend. There is no separate frontend server, no bundler and no transpile step;
see ADR-002 for how TypeScript sources are executed directly and ADR-004 for the static
frontend arrangement.

Runtime dependencies are exactly the three the architecture allows: `express` (5.x),
`jsonwebtoken` (9.x) and `cors` (2.x). Nothing else is added at runtime, in this sprint or in
later ones: no ORM, no validation library, no logging library, no password hashing library, no
test framework. Validation is written by hand at the request boundary, logging is `console.log`
per NF5, and if a later story asks for tests they use the built-in `node:test` runner.

State lives in module-level `Map` instances in `src/store.ts` and is lost on restart, which is
the expected behaviour. Users are seeded from a hardcoded array in `src/seed.ts`, one per role,
with plaintext passwords, because no hashing dependency is permitted and the data is fixture
data with no production analogue.

The file layout stays flat, as the architecture requires: `src/index.ts` wires the app,
`src/store.ts` holds state, `src/seed.ts` holds fixtures, `src/auth.ts` holds token concerns,
and one file per route group lives under `src/routes/`. There are no controller, service or
repository layers, and no dependency injection container. The server listens on port 3000.

## Consequences

The app is trivially runnable and readable, which is the point of the demo, and every reviewer
can trace a request from `src/index.ts` to a route file without indirection. The cost is that
there is no persistence, no password security, no request validation library and no structured
logging, so nothing in this repository is production ready and the README should keep saying
so. Hand-written validation means each route has to state its own rules explicitly, which is
acceptable at this scale but would not be at ten times the endpoint count.

Choosing Express 5 rather than 4 means `express.json()` and `express.urlencoded()` ship in the
box, path matching is stricter, and errors thrown from async handlers propagate to the error
middleware without a wrapper. Code examples written against Express 4 may not transfer verbatim.
