# Architecture — Hard Rules

- **Stack:** Node + TypeScript + Express (BE). Vanilla HTML/JS (FE). No build step.
- **Store:** in-memory `Map` in `src/store.ts`. Reset on restart is fine. No DB, no files.
- **Users:** hardcoded in `src/seed.ts` (one per role).
- **Auth:** `jsonwebtoken` HS256, secret defaults to `"workshop-secret"`. Logout = in-memory blocklist.
- **Deps:** `express`, `jsonwebtoken`, `cors` only. No ORM, validator, logger.
- **Run:** `npm install && npm start`. No Docker, no env files, no cloud.
- **Layout:** flat — `src/{index,store,seed,auth}.ts` + `src/routes/`. No controllers/services/repos.
- **API:** No pagination. Notifications via polling.
- **Tests:** only if a story asks. `node:test` only.

## Review Checklist

Every story is reviewed against this list before it can close. Any violation is a defect.

### Security
- Auth/authz checks at every protected boundary
- Input validation / sanitization at trust boundaries
- No injection vectors (SQL, XSS, command)

### Correctness vs ACs / BRD
- Every AC verifiable in code + tests
- BRD edge cases covered (boundary inputs, role-based rules, status transitions)
- No silent failures — errors surface clearly

### Design / ADR fidelity
- Code follows `design.md` component layout
- Stack and patterns match the ADRs (no drift to unauthorized libraries)
- No new patterns introduced where existing ones already solve the problem
