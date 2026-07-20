/**
 * Ambient module declaration for `bun:test` — scoped to ONLY what test
 * files actually need (the `describe`/`test`/`expect`/`mock`/... API),
 * not the whole `bun-types` package.
 *
 * Why not just add `"bun"` to tsconfig.test.json's `compilerOptions.types`?
 * bun-types' own entry point (node_modules/bun-types/index.d.ts) pulls in
 * globals.d.ts, bun.d.ts, s3.d.ts, sql.d.ts, ffi.d.ts, redis.d.ts, and more
 * — hundreds of KB of ambient declarations for Bun runtime APIs nothing in
 * this project's test suite uses. Several of those files redeclare global
 * symbols the production code also relies on — e.g. globals.d.ts merges a
 * Bun-specific overload onto the global `fetch`, adding a required static
 * `preconnect` method that plain DOM `fetch` doesn't have — and once any
 * included file pulls those declarations into the program, they apply
 * globally to every file `tsc` checks under that config, including
 * production files reached transitively from a test file (like
 * src/integrations/supabase/client.ts, which supplies its own fetch
 * implementation typed against `typeof fetch`). See docs/TESTING.md.
 *
 * test.d.ts's own `declare module "bun:test"` block is self-contained (its
 * one dependency, the `JestMock` namespace, is declared inside the same
 * file) — it doesn't reference the `Bun` namespace or touch the global
 * scope at all, so referencing it directly, and only it, gives every test
 * file the `bun:test` types it imports from without leaking anything else
 * into the program.
 */
/// <reference path="../../node_modules/bun-types/test.d.ts" />
export {};
