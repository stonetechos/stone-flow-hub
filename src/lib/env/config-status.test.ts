/**
 * Sprint 1.7, Part 1/12 — smoke test for the config-status module that
 * backs the global "Stone Tech OS isn't configured yet" screen. This only
 * asserts the module loads and returns a well-shaped result under the test
 * runner's environment; the interesting branches (missing vs present env
 * vars) are exercised by the manual QA note in docs/authentication.md,
 * since flipping `import.meta.env`/`process.env` mid-test-run risks
 * exactly the kind of cross-test pollution documented in
 * src/lib/vie/testSupport/moduleMocks.ts for `mock.module()` — this
 * module doesn't use `mock.module()`, but re-exercising both branches
 * would require re-importing the module fresh per branch, which bun:test
 * doesn't support cleanly for a plain ESM import.
 */
import { describe, test, expect } from "bun:test";
import { getSupabaseConfigStatus, __resetSupabaseConfigStatusForTests } from "./config-status";

describe("getSupabaseConfigStatus", () => {
  test("returns a well-shaped, memoized result", () => {
    __resetSupabaseConfigStatusForTests();
    const first = getSupabaseConfigStatus();
    expect(typeof first.ok).toBe("boolean");
    expect(Array.isArray(first.missing)).toBe(true);
    expect(first.ok).toBe(first.missing.length === 0);

    // Memoized: same object identity until explicitly reset.
    const second = getSupabaseConfigStatus();
    expect(second).toBe(first);
  });

  test("__resetSupabaseConfigStatusForTests forces recomputation", () => {
    const before = getSupabaseConfigStatus();
    __resetSupabaseConfigStatusForTests();
    const after = getSupabaseConfigStatus();
    expect(after).not.toBe(before);
    expect(after).toEqual(before);
  });
});
