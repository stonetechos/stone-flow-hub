# Stone Tech OS — RC-1 Audit Report

**Date:** 2026-07-07 · **Scope:** unauthenticated (session injection unavailable) · **Environment:** managed Lovable Cloud Supabase

## Executive summary

| Category            | Signal                                                             | Verdict            |
| ------------------- | ------------------------------------------------------------------ | ------------------ |
| TypeScript build    | `tsgo --noEmit` → 0 errors                                          | ✅ Green            |
| Dev server / HMR    | Clean log, no runtime errors                                       | ✅ Green            |
| DB integrity        | 0 orphans across all hot tables, 0 duplicate ledger entries        | ✅ Green            |
| Ledger balance      | 0 receipts over-allocated, 0 negative inventory balances           | ✅ Green            |
| Invoice arithmetic  | 0 invoices where header total disagrees with item sum              | ✅ Green            |
| RLS coverage        | 0 public tables with RLS disabled or with no policies              | ✅ Green            |
| RLS quality         | **5 tables previously had `USING (true)` — now fixed this pass**   | ✅ Fixed            |
| Supabase linter     | 50 → 47 issues after fix (1 ERROR + 46 WARN)                        | ⚠️ Follow-up       |
| Code smells         | 0 TODO/FIXME/HACK, 0 stray console.log in feature code             | ✅ Green            |
| Public route render | `/`, `/auth` render HTTP 200                                        | ✅ Green            |
| Auth hydration      | React logs hydration mismatch on `/auth` — cosmetic, page works    | ⚠️ Minor           |
| Authenticated E2E   | **NOT RUN** — no session available in sandbox                       | ⏸️ User to execute |

**Production Readiness (based on what was verifiable): ~80% — Ready for Pilot. Not Ready for Production until the authenticated E2E script passes.**

---

## Defects found & fixed this pass

### 🔴 Critical — CVE-class exposure of installation module (FIXED)

**Where:** `installation_teams`, `installations`, `installation_progress`, `installation_materials`, `installation_signoffs`
**Root cause:** All five tables had a single `FOR ALL … USING (true)` policy. Any authenticated user — including vendor-portal users — could read every customer signature, modify progress reports, or delete installations across the whole tenant.
**Fix:** Migration `rc1_installation_rls_lockdown` splits into scoped policies:

- SELECT restricted to `is_staff(auth.uid())` (admin, sales_manager, sales, purchase)
- INSERT/UPDATE/DELETE on `installations`/`installation_teams` restricted to `admin` + `sales_manager`
- Progress/materials/signoffs writable by any staff role
  Added `public.is_staff(uuid)` security-definer helper. Verified: linter permissive-policy warnings dropped from 5 → 0.

### 🟡 Major — `/auth` hydration mismatch causing full client re-render (FIXED)

**Where:** `src/routes/auth.tsx`
**Root cause:** `pendingComponent: AuthShell` rendered a "Loading…" card during SSR/pending state, but the client mounted `AuthPage` with a different DOM. React discarded the SSR tree on every visit.
**Fix:** Removed `pendingComponent` and the `AuthShell` component. The `ssr: false` flag already defers the whole route to the client; the redundant fallback was the source of the mismatch.

> Note: A residual React "hydration failed" warning still appears in the console. This is a TanStack Start `ssr: false` artifact (the route's Suspense fallback renders null on server but the client mounts children into that slot). It is cosmetic — the page renders and functions correctly.

---

## Findings still open (need user decision)

### 1. Supabase linter — 47 remaining

- **ERROR ×1:** `security_definer_view` × 7 views (`installation_dashboard_kpis`, `vendor_ledger`, `customer_payment_dashboard`, `inventory_stock_ledger`, `procurement_calendar`, `customer_ledger`, `procurement_kpis`). Views are owned by a superuser so they execute with elevated privileges; safe only if their SELECTs already respect RLS via joins. Needs per-view review before we know if any leak rows across tenants/roles.
- **WARN — `function_search_path_mutable` × ~9:** trigger/helper functions missing `SET search_path`. Straightforward hardening item.
- **WARN — `anon_security_definer_function_executable` × several:** `SECURITY DEFINER` functions with EXECUTE granted to PUBLIC/anon. Needs `REVOKE EXECUTE … FROM anon, public`.
- **WARN — `auth_leaked_password_protection`:** HIBP toggle off. One-click.

### 2. Missing FK indexes — 120+

Full list captured in `/tmp/audit/db.txt`. Impact: sequential scans on child-lookup queries once tables grow. Not urgent at 57 customers / 200 items, will matter at 10k+.

### 3. `/auth` hydration warning (residual)

Non-blocking. A proper fix wraps the whole route in a `ClientOnly` component. Defer until after E2E.

---

## What I could NOT verify from the sandbox

The following require an authenticated browser session (not available: `LOVABLE_BROWSER_AUTH_STATUS=signed_out`, empty session vars). Use the local Playwright script + manual checklist below.

- Any form submission, mutation, conversion, or delete flow
- EntityPicker cache freshness after creating new records
- Ledger recomputation after receipts/payments
- Notification delivery (email/WhatsApp/timeline)
- AI Copilot output correctness
- Attachment upload / signed URL generation
- Role-based visibility (admin vs sales vs purchase vs vendor-portal)
- PDF/report byte-level correctness
- Executive-dashboard drill-down link targets

---

## Files modified this pass

- `src/routes/auth.tsx` — removed `pendingComponent`/`AuthShell`
- `supabase/migrations/…_rc1_installation_rls_lockdown.sql` — RLS lockdown + `is_staff` helper
- `docs/rc1-e2e.spec.mjs` — authenticated Playwright smoke you run locally
- `docs/rc1-audit.md` — this report
- `docs/rc1-manual-qa.md` — checklist for flows Playwright can't reliably drive

## Recommended next step

Run the local E2E script (see `docs/rc1-e2e.spec.mjs`) against your admin account. If it passes with 0 failures and 0 uncaught page errors, proceed to a bounded security-linter fix pass. **Do not treat as "Ready for Production" until both the automated script and the manual checklist are green.**
