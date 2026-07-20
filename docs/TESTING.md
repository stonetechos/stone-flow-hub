# Testing architecture

## Two TypeScript compiler contexts, on purpose

This repo type-checks production code and test code under **two separate
`tsc` configs**, and that split is intentional rather than incidental:

- **`tsconfig.json`** — the production config. Everything under `src/**`
  except test files and `testSupport/` is checked against this config. It
  never includes Bun's global types.
- **`tsconfig.test.json`** — extends `tsconfig.json` and includes only
  `src/**/*.test.ts`, `src/**/*.test.tsx`, and `src/**/testSupport/**/*.ts`.
  Test files import `describe`/`expect`/`test`/... from `"bun:test"`, so
  this config needs that module's ambient types resolvable — see below for
  exactly how.

### Why not just add `"bun"` to `compilerOptions.types`?

That was the first approach tried here, and it doesn't isolate what it
looks like it isolates. `"types": ["bun"]` loads bun-types' entry point
(`node_modules/bun-types/index.d.ts`), which itself references
`globals.d.ts`, `bun.d.ts`, `s3.d.ts`, `sql.d.ts`, `ffi.d.ts`, `redis.d.ts`,
and a dozen more files — hundreds of KB of ambient declarations for Bun
runtime APIs nothing in this test suite touches. Crucially, `globals.d.ts`
**redeclares the global `fetch`**, merging in a Bun-specific overload plus
a required static `preconnect` method that plain DOM `fetch` doesn't have.
TypeScript's global augmentations apply to the whole program being
checked, not just the files that reference them — so the moment any
included file pulls in bun-types' globals, `typeof fetch` changes meaning
for *every* file in that `tsc` run, including production files reached
transitively from a test file (e.g. `src/integrations/supabase/client.ts`,
imported by `resolve.test.ts` via `resolve.ts`). That's not test-only
isolation, it's a Bun global leaking into production code's types — the
exact thing this two-config split exists to prevent.

The fix: `src/testSupport/bun-test-types.d.ts` references
`node_modules/bun-types/test.d.ts` **directly**, instead of going through
bun-types' `index.d.ts`. `test.d.ts` is the file that declares the
`bun:test` module; its only outside dependency is a type-only
`import("./vendor/expect-type")` for `expectTypeOf`, a small vendored
type-testing library that lives entirely under
`bun-types/vendor/expect-type/` — confirmed by reading all five files in
that folder, none of which reference `globals.d.ts`, `bun.d.ts`, or touch
the global scope. Referencing `test.d.ts` alone gives every test file
exactly the types it imports, with nothing else from bun-types' much
larger surface leaking into the program. `tsconfig.test.json` itself no
longer lists `"bun"` in `types` at all.

The two-config split keeps the isolation boundary explicit: Bun's test
types are visible only to the files that actually import them, and nothing
else — not even other Bun ambient globals — leaks anywhere else.

### Why `"node"` IS listed in `tsconfig.test.json`'s `types`

This looks like the same thing the section above just argued against, but
it isn't, for two separate reasons — both checked directly, not assumed:

1. **It's genuinely needed, not incidental.** Test files transitively reach
   real production code that legitimately depends on Node: `client.ts`
   reads `process.env` as its SSR fallback, and `server-context.ts` imports
   `node:async_hooks` — both correct for this app's TanStack Start server
   functions, which do run under Node. Bun's runtime APIs (s3, redis, sql,
   ffi, shell), by contrast, are never used by the application itself —
   only `bun:test` is, which is why isolating those was correct but
   isolating Node globals from Node-dependent code would just break it.
2. **`@types/node` doesn't cause the same conflict `"bun"` did.**
   `node_modules/@types/node/web-globals/fetch.d.ts` guards its own
   `fetch`/`Request`/`Response`/`Headers` merge with a conditional —
   `typeof globalThis extends { onmessage: any } ? {} : undici.X` — that
   detects whether `lib.dom` is already loaded (it is, via this project's
   `lib: ["ES2022", "DOM", "DOM.Iterable"]`) and defers to DOM's own types
   instead of redeclaring them. It does not add a required property the
   way bun-types' unconditional `fetch` + static `preconnect` merge did.

Production's `client.ts`/`server-context.ts` already type-check today, but
only as a side effect: `vite.config.ts` (a production-only root file, not
part of the test config's `include`) imports `defineConfig` from
`@lovable.dev/vite-tanstack-config`, which imports types from `vite`,
whose `node_modules/vite/dist/node/index.d.ts` opens with
`/// <reference types="node" />` — confirmed by reading that file's first
line. That single directive force-includes all of `@types/node` into the
production program regardless of its own `types` restriction, the same
kind of mechanism that made `"bun"` leak everywhere before. Since
`tsconfig.test.json` never includes `vite.config.ts`, that path doesn't
exist for tests, so `"node"` has to be requested explicitly instead.

### Running each

```bash
npm run typecheck        # tsc --noEmit                        (production)
npm run typecheck:tests  # tsc --noEmit -p tsconfig.test.json  (tests)
```

CI runs both, independently, in `.github/workflows/ci.yml` — neither is
allowed to be weaker than the other, and a failure in one does not skip the
other.

### A gotcha `typecheck:tests` will surface that `bun test` won't

`tsconfig.json` has always excluded `*.test.ts`, so until `typecheck:tests`
existed, test files were never type-checked by `tsc` at all — only
executed by `bun test`, which doesn't type-check. That means latent type
errors can already be sitting in existing tests, waiting to surface the
first time `typecheck:tests` runs. The one found while wiring this config
up: calling a generic helper with an empty array literal and an
unannotated callback (`resolveByName([], needle, (r) => r.name)`) gives
TypeScript nothing to infer the generic type parameter from, so it
collapses to `never` and the callback's parameter fails to compile. Fix by
supplying the type parameter explicitly at the call site (`resolveByName<Row>([], ...)`)
rather than annotating the callback — it's the direct fix for what's
actually ambiguous (the empty array), not a workaround.

## Where test code lives

- **Test files stay colocated** beside the production file they test —
  e.g. `src/lib/vie/types.test.ts` next to `src/lib/vie/types.ts`,
  `src/lib/vie/planner/resolveEffectiveMode.test.ts` next to
  `src/lib/vie/planner/index.ts`. This repo does not use `__tests__`
  folders, and Milestone-1-and-later work should keep following that
  convention rather than introducing one.
- **Reusable test helpers** — fixtures, shared assertion wrappers, anything
  imported *by* more than one test file but not itself a test — live in a
  `testSupport/` folder alongside the code it supports, e.g.
  `src/lib/vie/testSupport/testUtils.ts`. A file belongs in `testSupport/`
  only once it's shared; a one-off helper used by a single test file can
  stay inline in that file until a second consumer actually shows up.

`testSupport/**` is included by `tsconfig.test.json` and excluded from
`tsconfig.json`, for the same Bun-isolation reason described above — these
helper modules commonly need `bun:test`'s `expect` (for shared assertion
helpers like `expectValidEntities`), so they're checked under the test
compiler context, not the production one.

## Unit tests vs. end-to-end tests

`bun test` is scoped to `src/` via `root = "src"` in `bunfig.toml`. Bun's
test runner otherwise recursively scans the entire package for anything
matching its default naming convention (`*.test.*`, `*.spec.*`, ...), which
would also sweep up files that merely happen to match that pattern but
aren't part of the unit suite at all — e.g. `docs/rc1-e2e.spec.mjs`, a
standalone Playwright smoke script (uses Playwright's library API
directly, not `@playwright/test`, so it's run with plain `node`, not a test
runner). Scoping `root` to `src/` means every current and future unit test
just needs to live under `src/` (which they already do, by convention) —
no per-file exclusion list to maintain as the docs folder or other
non-`src/` scripts grow.

Run the E2E smoke separately, on demand, never as part of `bun test` or CI:

```bash
npm run test:e2e   # node docs/rc1-e2e.spec.mjs — see the file's header
                    # for one-time local setup (installing playwright,
                    # required env vars) and what it covers
```

There are no integration tests yet. If/when one is added, it should
colocate under `src/` following the same `*.test.ts` convention as unit
tests — `root = "src"` already covers that case with no config change
needed. A separate `test:integration` script (or a naming convention like
`*.integration.test.ts` filtered via `bun test <pattern>`) is deliberately
not introduced now, since there's nothing yet for it to separate from
`bun test`.
