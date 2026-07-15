# ADR-002 — Run TypeScript directly via Node native type stripping (no build step)

- **Status:** Accepted
- **Date:** 2026-07-15
- **Sprint:** 1
- **Drivers:** S1-001

## Context

`docs/architecture.md` and S1-001 both require that "all code is TypeScript" with
"no build step" — the app "runs directly via Node" via `npm start`. Historically
running `.ts` files meant a transpile step (`tsc`, `ts-node`, `esbuild`, `tsx`).
S1-001 also caps runtime dependencies at `express`, `jsonwebtoken`, `cors`, so a
transpiler dependency such as `ts-node` or `tsx` would violate the allowlist.

## Decision

Run the `.ts` files directly with Node's built-in type stripping. `package.json`
`start` script invokes Node with type stripping enabled
(`node --experimental-strip-types src/index.ts` on Node ≥ 22.6; on Node ≥ 23.6 type
stripping is on by default and the flag is a harmless no-op). No transpiler is added
to `dependencies` or `devDependencies`.

Because Node only strips types and does not transform TypeScript-specific runtime
constructs, all code must use **erasable-only** TypeScript: type annotations,
`interface`/`type`, and `import type`. Avoid `enum`, `namespace`, constructor
parameter properties, and other syntax that emits runtime code. Use ESM (`import` /
`export`) with explicit file extensions in relative imports (e.g.
`import { store } from "./store.ts"`).

A `tsconfig.json` is included solely for editor type-checking and IntelliSense; it is
never invoked to produce output and is not part of `npm start`.

## Consequences

- Zero-dependency execution of TypeScript: the allowlist stays intact.
- Requires a reasonably recent Node (≥ 22.6, ≥ 23.6 for flag-free). This is stated in
  `package.json` `engines` and in the sprint README/assumptions.
- The team gives up a handful of TS features (enums, namespaces, parameter
  properties). None are needed for this system; string-literal unions replace enums.
- No source maps and no emitted `dist/` — the running code is the source, which keeps
  the demo transparent.
