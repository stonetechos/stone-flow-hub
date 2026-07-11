## What I confirmed
- The signed-in Preview reaches `/dashboard`, authenticates successfully, and most dashboard database requests return `200`.
- The visible failure is the app’s root route error boundary: `This page didn't load`.
- The failure happens after the dashboard requests complete, so this is likely a client-render exception in the protected shell/dashboard, not a login or backend availability failure.

## Plan
1. Reproduce the signed-in `/dashboard` crash in build mode with the injected session and capture the exact exception/stack using Playwright.
2. Patch only the component/module causing the render-time crash. Primary suspects from the current route are:
   - `src/components/layout/AppShell.tsx` protected shell hooks/state
   - `src/routes/_authenticated/dashboard.tsx` dashboard render helpers
   - `src/components/dashboard/WorkforceSummaryWidget.tsx` role-gated widget
3. If the exception is caused by a post-security-migration permission/RLS change surfacing as an uncaught render error, convert that query path to render an inline `ErrorBlock`/safe fallback instead of crashing the whole route.
4. Re-test the signed-in Preview end-to-end at `/dashboard` and confirm the dashboard renders instead of the root error boundary.

## Scope guard
- No new security findings will be fixed or ignored.
- No database migrations unless the captured error proves the crash is caused by a missing grant/policy required by the existing dashboard.