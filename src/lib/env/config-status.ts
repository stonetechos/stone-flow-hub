/**
 * Sprint 1.7, Part 1 — single source of truth for "is Supabase configured".
 *
 * Previously, `src/integrations/supabase/client.ts` lazily checked env vars
 * the first time any property on the `supabase` proxy was touched, and threw
 * a raw `Error("Missing Supabase environment variable(s): ...")`. Whichever
 * call site happened to be first to touch the client — often a
 * `useQuery`'s `queryFn` deep inside a page — caught that throw as its own
 * query error and rendered it verbatim (e.g. the Users & Roles page's
 * `{error ? <div>{toUserMessage(error)}</div> : ...}` block). That is how a
 * raw env-var error ended up inside page content instead of a proper
 * top-level configuration screen.
 *
 * This module computes the check exactly once, at module load — "once
 * during application startup" per the Part 1 spec — and every caller
 * (the root route's configuration gate, and `client.ts`'s lazy throw as a
 * defense-in-depth backstop for any code path that constructs the client
 * outside the gated tree) reads the same memoized result instead of
 * re-deriving it.
 */

export interface SupabaseConfigStatus {
  ok: boolean;
  missing: string[];
}

function computeSupabaseConfigStatus(): SupabaseConfigStatus {
  // Same source order as the previous check in client.ts: Vite's
  // build-time-replaced import.meta.env for the browser bundle, falling
  // back to process.env for SSR / server functions.
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  const missing = [
    ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
    ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ];

  return { ok: missing.length === 0, missing };
}

let cached: SupabaseConfigStatus | undefined;

/**
 * Returns whether the Supabase client can be constructed, computed once and
 * cached for the lifetime of the module (i.e. once per page load client-side,
 * once per isolate/request on the server). Never throws.
 */
export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  if (!cached) cached = computeSupabaseConfigStatus();
  return cached;
}

/** Test-only: clears the memoized result so a test can simulate a different
 * environment. Not imported anywhere outside `*.test.ts` files. */
export function __resetSupabaseConfigStatusForTests(): void {
  cached = undefined;
}
