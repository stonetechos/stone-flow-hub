/**
 * Sprint 1.7.1, Parts 2 & 5 — Application Identity + build metadata.
 *
 * This is the Tenant-facing product layer — Stone Tech OS specifically — as
 * distinct from `./platform.ts` (the Platform Owner, Vedora Vision). See
 * docs/authentication.md § Platform architecture for the full Platform
 * Owner vs Tenant Company split (Part 3 of this sprint).
 *
 * Supersedes `src/lib/branding/platform.ts` (Sprint 1.7).
 */
import { PLATFORM_NAME } from "./platform";

export const APPLICATION_NAME = "Stone Tech OS";

/** Short category line for Settings › About. */
export const APPLICATION_CATEGORY = "Enterprise ERP Platform";

/**
 * From CHANGELOG.md's "v1.0.0 — Foundation Freeze" entry — package.json has
 * no `version` field, so CHANGELOG.md is the one place in the repo that
 * names an actual, shipped release. Update this alongside new CHANGELOG.md
 * entries; do not derive it from anything else.
 */
export const APPLICATION_VERSION = "1.0.0";

/** Login screen / footer-style attribution. */
export const POWERED_BY_LINE = `${APPLICATION_NAME} · Powered by ${PLATFORM_NAME}`;

/** Settings › About "built by" line. */
export const BUILT_BY_LINE = `Built by ${PLATFORM_NAME}`;

// ---------------------------------------------------------------------
// Build-time metadata (Part 5). Injected by vite.config.ts's `define`
// block at build time — see that file for exactly how each value is
// computed and why every one of them is allowed to end up `undefined`
// rather than fabricated.
//
// `bun test` never runs Vite's define pass, so these identifiers are
// simply undeclared there. `typeof x !== "undefined"` is safe against an
// undeclared identifier (unlike referencing it directly, which would throw
// a ReferenceError) — that's what makes these guards work in both the
// built app and the test runner.
// ---------------------------------------------------------------------
declare const __BUILD_TIME__: string | undefined;
declare const __GIT_COMMIT_HASH__: string | undefined;
declare const __DB_SCHEMA_VERSION__: string | undefined;

/** ISO timestamp of when this bundle was built. `null` when Vite's define
 * pass didn't run for the current execution context (e.g. `bun test`). */
export const BUILD_TIME: string | null =
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : null;

/** Short git commit hash the running bundle was built from. `null` when
 * unavailable (e.g. no git repository present at build time) — never
 * fabricated. */
export const GIT_COMMIT_HASH: string | null =
  typeof __GIT_COMMIT_HASH__ !== "undefined" ? __GIT_COMMIT_HASH__ : null;

/**
 * "Build Version" for Settings › About. This repo has no separate build
 * numbering scheme distinct from the build timestamp, so the timestamp
 * doubles as the build identifier rather than inventing a numeric build
 * counter that doesn't otherwise exist. `null` when unavailable, same as
 * the other build constants.
 */
export const BUILD_VERSION: string | null = BUILD_TIME;

/**
 * Filename-prefix timestamp of the most recently added file under
 * supabase/migrations/ as of build time — the closest genuine proxy this
 * repo has for "database schema version" (there is no separate
 * schema-version table or constant to read instead). `null` when
 * unavailable.
 */
export const DB_SCHEMA_VERSION: string | null =
  typeof __DB_SCHEMA_VERSION__ !== "undefined" ? __DB_SCHEMA_VERSION__ : null;

/** Copyright line for this product's Platform Owner attribution. Takes the
 * year as a parameter — see `platformCopyrightLine` in `./platform.ts` for
 * why. */
export function copyrightLine(year: number): string {
  return `© ${year} ${PLATFORM_NAME}`;
}
