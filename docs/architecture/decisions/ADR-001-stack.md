# ADR-001 — Stack: Node + TypeScript + Express, vanilla HTML/JS front end, in-memory store

- **Status:** Accepted
- **Date:** 2026-07-15
- **Sprint:** 1
- **Drivers:** S1-001, S1-002, S1-003

## Context

We are building the Time-Off Request System demo. `docs/architecture.md` fixes the
stack as hard rules, and the BRD (NF6) requires the whole system to run locally with
nothing more than `npm install && npm start`: no database, no files, no Docker, no
cloud. Sprint 1 must stand this stack up end to end (server boots, health endpoint,
landing page, seeded users).

## Decision

The stack is fixed for all sprints as follows.

**Backend.** Node with TypeScript, using Express as the only web framework. The
allowed runtime dependencies are exactly `express`, `jsonwebtoken`, and `cors`. No
ORM, no validation library, no logger, no test framework beyond the Node built-in
`node:test`. Logging is `console.log`.

**Frontend.** Vanilla HTML, CSS, and browser JavaScript served as static assets by
Express. No SPA framework, no bundler, no client build.

**Persistence.** A single in-memory `Map` exported from `src/store.ts`. All state
(users, and later requests and the JWT blocklist) lives under keys in that Map. State
resets on restart, which is acceptable for the demo.

**Layout.** Flat `src/` — `src/{index,store,seed,auth}.ts` plus a `src/routes/`
directory that holds one file per endpoint group. No controller/service/repository
layering.

**Runtime.** `npm install && npm start` only. Configuration comes from environment
variables with working defaults (e.g. `JWT_SECRET` defaults to `"workshop-secret"`),
so zero config is required to run.

## Consequences

- Trivially portable: any machine with a recent Node can run it.
- No durability, concurrency, or scaling story — this is a workshop demo, not
  production, and the BRD says so explicitly.
- The dependency allowlist is a review gate: introducing any other runtime library is
  a defect, even if convenient. Input validation, auth, and serialization are all
  hand-rolled against the standard library and the three allowed deps.
- Running TypeScript with no build step is a non-trivial consequence of "no build
  step" and is decided separately in ADR-002.
