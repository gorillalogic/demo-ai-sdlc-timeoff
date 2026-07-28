# ADR-002 — Run TypeScript directly with Node's native type stripping

- **Status:** Accepted
- **Date:** 2026-07-28
- **Sprint:** 1
- **Drives stories:** S1-001

## Context

The architecture requires TypeScript on the backend and, in the same line, "no build step",
while NF6 requires that `npm install && npm start` be enough to run the system. Those two
constraints rule out the usual `tsc` compile into `dist/`, and the dependency rule rules out
adding a runner such as `tsx` or `ts-node` to the dependency list. Node itself resolves the
tension: since 22.6 it can strip TypeScript type annotations at load time behind
`--experimental-strip-types`, and since 23.6 the behaviour is on by default. Type stripping
erases types without transforming code, so it only accepts erasable TypeScript syntax.

## Decision

`npm start` runs `node --experimental-strip-types src/index.ts`. The package declares
`"engines": { "node": ">=22.6.0" }`. On Node 23.6 and later the flag is redundant but still
accepted, so a single script works across current Node versions. There is no `dist/`, no
bundler, no watch process, and no compile step in any script.

Because Node strips types rather than compiling them, all source must use erasable syntax only.
That means no `enum`, no `namespace`, no constructor parameter properties, no decorators and no
`export =`. Union string literal types and `as const` objects replace enums, and interfaces or
type aliases carry the shapes. Type-only imports use `import type` so they are removed cleanly.

`package.json` sets `"type": "module"` and every relative import carries an explicit `.ts`
extension, for example `import { store } from "./store.ts"`, which is what Node's ESM resolver
requires for stripped TypeScript. This is deterministic and avoids relying on module-syntax
detection.

A `tsconfig.json` is committed for editor support only. It sets `"noEmit": true`,
`"erasableSyntaxOnly": true`, `"allowImportingTsExtensions": true`, `"verbatimModuleSyntax":
true`, `"module": "nodenext"` and `"strict": true`. It is never invoked by `npm start`.

The dependency rule in `docs/ARCHITECTURE.md` governs runtime dependencies, the libraries that
add behaviour to the running server, and explicitly permits type-only devDependencies. The
package therefore declares
`typescript`, `@types/node`, `@types/express` and `@types/jsonwebtoken` as **devDependencies**,
purely so editors and an optional `npx tsc --noEmit` can see types. They contribute no code to
the running process, and deleting them would leave `npm start` working unchanged. No other
devDependency is permitted.

## Consequences

Startup is immediate, the code the reader opens is the code that runs, and there is no build
artefact to get stale. In exchange, `npm start` performs no type checking at all: a type error
surfaces in the editor or in an explicit `npx tsc --noEmit`, never at boot, and a genuinely
broken type will simply run. Developers on Node older than 22.6 cannot start the app, which the
`engines` field states but npm only warns about.

The erasable-syntax restriction is a real constraint on later sprints. Request status values
(`submitted`, `approved`, `rejected`, `cancelled`) and roles must be modelled as string literal
unions, not enums, and any code review should flag an `enum` as a defect against this ADR
rather than a style preference.

The devDependency allowance was originally an interpretation of an ambiguous hard rule. The
rule was amended to state the runtime-only scope outright, so the allowance is now sanctioned
rather than assumed. Should it ever be revoked, the fix is to delete the four packages and the
`tsconfig.json`; nothing else in the design changes.
