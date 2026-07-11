# Preview Failure — Investigation Report

Read-only audit. No code changed.

## What I verified

- **Typecheck / prod build**: clean (per previous turns, still green — no new source files were touched since).
- **Vite dev server**: running normally on `:8080`, `curl /` returns 200 with valid shell. Only warnings in logs are deprecation notices for `createServerFn().inputValidator()` in `src/lib/ai/copilot.functions.ts` (non-fatal).
- **Latest security migration** (`20260710220321_*.sql`): only adds indexes and revokes `EXECUTE` on **trigger-only** SECURITY DEFINER functions (`trg_*`). Triggers fire under the definer, so REVOKE on `anon/authenticated/PUBLIC` cannot break normal CRUD. Not the cause.
- **Recent modules** (Workforce Intelligence, Executive Command Centre): route files present, `routeTree.gen.ts` regenerated, no module-scope side effects, no bad imports.
- **Reproduction via Playwright against `localhost:8080`**:
  - Unauthenticated navigation → `/` redirects to `/auth`, form renders correctly.
  - Only console noise is a **hydration mismatch on `/auth`**, which is *expected* and *not fatal*: `/auth` sets `ssr: false`, so the server renders `<Suspense fallback={null}/>` and the client renders `<AuthPage>`. React logs the mismatch and re-renders on the client — the page still works.

## What the user is seeing

Session replay shows: login succeeds → "Signed in" toast → then the root `ErrorComponent` ("This page didn't load") renders. That is the root route's `errorComponent` catching a thrown error **after** navigation to `/dashboard`. It is not a preview-proxy failure — an actual error is being thrown inside the authenticated tree post-login.

Because auth is `signed_out` in this sandbox (no injected Supabase session), Playwright cannot cross the `_authenticated` gate to reproduce the exact throw. Candidates worth checking with a live session:

1. `_authenticated/dashboard.tsx` queries (`getDashboardKpis`, `listRecentActivity`, `listTasks`) — one may be hitting a view/table whose privileges changed in earlier stabilization migrations (not the last one, but the RC-2 security batch that preceded it).
2. Any dashboard widget that calls a `createServerFn` requiring `requireSupabaseAuth` **before** the client bearer middleware attaches — e.g. Copilot/BusinessInsights auto-fetch on mount.
3. The Executive Command Centre / Workforce widgets aggregators (`getExecutiveKpis`, `getCommandCenter`, `WorkforceSummaryWidget`) — the dashboard imports `WorkforceSummaryWidget`; a schema mismatch there would throw at first render.

## Suspected root cause (highest probability)

An RLS/GRANT change from an earlier stabilization migration removed `SELECT` from `authenticated` on a table/view read by the post-login dashboard, so the first query in `/dashboard` throws → root `errorComponent` renders "This page didn't load". The last migration alone is safe; the cumulative effect of the RC-2 grant tightening is the likely culprit.

Not the preview proxy, not CSP, not Vite, not the hydration warning on `/auth`.

## Proposed next step (still read-only)

Before any fix, I need to see the real thrown error. Options:

1. **You reproduce once in the live Preview** with DevTools open and paste the network response body of the failing request (or the console stack). That pinpoints the failing table/RPC in seconds.
2. **Or** authorize me to log in via Playwright with a test account so I can capture it here.

Once we have the exact failing query, the fix is a targeted `GRANT` (or code) change — not another blanket migration.

## Files reviewed (no edits)

- `supabase/migrations/20260710220321_*.sql`
- `src/routes/__root.tsx`, `src/routes/auth.tsx`, `src/routes/index.tsx`
- `src/routes/_authenticated/route.tsx`, `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/dashboards/command-center.tsx`
- `src/start.ts`, `src/router.tsx`, `vite.config.ts`
- Vite daemon logs
