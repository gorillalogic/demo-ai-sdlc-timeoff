# QA Report — Sprint 1

## Pass 1

**Date:** 2026-07-15
**Reviewer:** QA agent (adversarial, report-only)
**Scope:** Stories at `status: testing` — S1-001, S1-002, S1-003. Review bounded to the
files listed in `design.md` "Files per story" (plus their direct imports).

### Test suite
`npm test` → 5 tests, 5 pass, 0 fail. Live boot verified independently
(`node --experimental-strip-types src/index.ts`): `GET /health` returns
`{"status":"ok"}` with 200 and `Content-Type: application/json`; `GET /` serves the
Time-Off landing page (200, `text/html`); `GET /styles.css` serves (200, `text/css`);
unknown route returns 404.

### Failure modes considered
- **Dependency allowlist drift (ADR-001).** `package.json` declares exactly `express`,
  `jsonwebtoken`, `cors`; no `devDependencies`; no transpiler. Clean.
- **Non-erasable TypeScript (ADR-002).** Scanned `src/` and `test/` for `enum`,
  `namespace`, and constructor parameter properties — none. All relative imports use
  explicit `.ts` extensions. ESM `type: "module"`. Clean.
- **Build step smuggled in.** `npm start` runs `.ts` directly via native type stripping;
  no `tsc`/emit; `tsconfig.json` is `noEmit` and editor-only. Clean.
- **Layout drift.** Flat `src/{index,store,seed}.ts` + `src/routes/.gitkeep` (empty);
  `/health` inline in `index.ts` per design assumption 3. No controller/service/repo
  layering. Clean.
- **Missing auth at a protected boundary (NF1).** Sprint 1 exposes only `/health`, `/`,
  and static assets — all intended-public per design/BRD; auth is deferred to sprint 2.
  No protected boundary exists yet, so no missing-authz defect.
- **Input/injection at trust boundaries.** No request input is processed in sprint 1;
  content served is static. No injection vector.
- **Silent failures.** `EADDRINUSE` and Node-too-old surface loudly (non-zero exit);
  `/health` uses `res.json` so the body is exact. Clean.
- **S1-002 accidental form submission.** Button is `type="button"`; no submit control,
  no client JS — the form cannot POST. Matches "no submission logic". Clean.
- **S1-003 seed contract.** `initSeed()` seeds three users (employee/manager/hr) with
  `email`/`password`/`role`, stored under key `"users"` as `Map<email, User>`,
  retrievable by email, idempotent re-seed. Verified by `test/seed.test.ts` and by code.

### Defects filed
None.

### Bugs closed
None (first pass; no prior bugs).

### Status per story
- **S1-001 — Project Bootstrap with Health Endpoint:** all ACs met; clean → `done`.
- **S1-002 — Landing Page with Login Form:** all ACs met; clean → `done`.
- **S1-003 — Hardcoded User Seed:** all ACs met; clean → `done`.
