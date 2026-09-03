# Stone Tech OS v1 — Release-Readiness Audit (read-only)

Verified against the live project this turn: production diagnostics on both hostnames, Supabase security scan + database linter, project monitoring error logs, function grants, the `profiles` schema, and the current preview runtime errors. Nothing below is speculative — every item is backed by one of those reads. No code was changed.

## Verdict

The `*.lovable.app` production deployment is healthy: all five server environment bindings report `true`, the schema drift that broke forced password change is gone (`profiles.force_password_change` now exists), and no dependency or connector findings remain. Four issues genuinely block or shadow a confident v1 release; the rest is polish.

---

## P0 — Must fix before public production

### 1. Custom domain `erp.stonetech.in` serves an unconfigured build
- Severity: critical | Module: Deployment / infrastructure
- Evidence: `https://stone-flow-hub.lovable.app/api/public/diagnostics/env-status` returns all `true`; `https://erp.stonetech.in/api/public/diagnostics/env-status` returns `supabase_url`, `supabase_publishable_key`, `supabase_service_role_key`, `cron_secret`, `lovable_api_key` all `false`.
- Why it matters: on the branded domain every server function, cron hook, AI feature and admin screen fails. If customers are pointed at `erp.stonetech.in`, the product is effectively down.
- Work: this is platform-side routing, not code. Re-attach the domain (remove and re-add in Project settings > Domains, confirm DNS points at Lovable rather than a generic Cloudflare proxy), republish, then re-check the diagnostics endpoint.
- Credits: ~5-15 (verification only) | Effort: 1-2 h, mostly waiting on DNS/propagation
- Order: 1

### 2. Users can re-activate their own deactivated account
- Severity: high | Module: Admin / Users & Roles (RLS)
- Evidence: security scan finding `profiles_self_update_sensitive_fields` — the "Users update own profile" UPDATE policy has no column restriction, so `is_active`, `department` and `job_title` are self-writable.
- Why it matters: privilege/lifecycle bypass. An admin deactivating a leaver does not actually revoke access; the user can flip `is_active` back with one API call. This directly undermines the user-lifecycle work already shipped.
- Work: migration adding a trigger (or a `WITH CHECK` comparing against the existing row) that blocks non-admins from changing `is_active`, `department`, `job_title`.
- Credits: ~20-30 | Effort: 2-3 h including a regression test
- Order: 2

---

## P1 — Should fix before production

### 3. `permission denied for function current_vendor_id` / `has_staff_access`
- Severity: medium-high | Module: Vendor portal, RFQs, quotes, purchase orders, staff-gated screens
- Evidence: monitoring finding `error_log_finding_7dfbfe...` (19x + 3x ERROR in Postgres logs). Confirmed by `pg_proc.proacl`: EXECUTE is granted only to `postgres`, `authenticated`, `service_role` — `anon` is excluded, and RLS policies on those tables call the functions unconditionally.
- Why it matters: any request arriving before the session hydrates (or on a partially-authenticated session) gets a raw Postgres permission error instead of an empty list or a sign-in prompt, so vendors/staff see broken pages rather than a clear state.
- Work: either grant EXECUTE to `anon` (the functions already return null/false safely for anonymous callers) or make the calling paths short-circuit before querying when there is no session. Prefer the grant — it is one migration and removes the whole error class.
- Credits: ~15-25 | Effort: 1-2 h
- Order: 3

### 4. Hydration mismatch on `/auth`
- Severity: medium | Module: Authentication
- Evidence: current preview runtime errors show React regenerating the tree — server emitted the `States.tsx` pending fallback while the client committed `<main>` from `auth.tsx:100`. The `pendingMinMs: 300` mitigation already in the route has not eliminated it.
- Why it matters: the sign-in page is the first screen every user sees; a full client re-render causes a visible flash and logs a console error on every load. Cosmetic in outcome, but it is the one place where a bad first impression is guaranteed.
- Work: make the route's pending and resolved shells structurally identical (render the `<main>` shell in the pending component too) rather than relying on a timing window.
- Credits: ~15-25 | Effort: 1-2 h including preview verification
- Order: 4

### 5. Public storage bucket allows listing
- Severity: medium | Module: Storage / documents
- Evidence: Supabase scan finding `SUPA_public_bucket_allows_listing` — a public bucket has a broad SELECT policy on `storage.objects`.
- Why it matters: anyone can enumerate every file in that bucket. Generated invoices/POs carry customer names and GST numbers; enumeration turns "unguessable URL" into "downloadable index".
- Work: narrow the SELECT policy to the specific prefixes that must be public (e.g. branding assets) and keep document objects behind signed URLs.
- Credits: ~15-25 | Effort: 1-2 h
- Order: 5

### 6. Staff can write audit entries for entities they never touched
- Severity: medium | Module: Activity log
- Evidence: scan finding `activity_log_fabricated_entries` — the `al insert staff self` policy only checks `actor_id = auth.uid()`, not that the actor can access `entity_id`.
- Why it matters: the activity log is the audit trail behind financial documents. If it can be fabricated, it is not evidence.
- Work: restrict INSERT to the security-definer trigger path (`log_activity`) and revoke direct client INSERT.
- Credits: ~15-25 | Effort: 1-2 h; needs a check that no client code inserts directly
- Order: 6

---

## P2 — Can safely ship

### 7. `SECURITY DEFINER` functions broadly executable
- Severity: low | Module: Database
- Evidence: database linter, ~14 warnings across lint rules 0028/0029.
- Why it matters: defence in depth only — the flagged functions already validate their caller. Tightening EXECUTE is hygiene, and overlaps with item 3, so it should be done as one deliberate grants pass, not piecemeal.
- Credits: ~25-40 | Effort: 3-4 h | Order: after v1

### 8. Extension installed in `public` schema
- Severity: low | Module: Database | Evidence: linter warning 0014.
- Why it matters: namespace hygiene; no exploit path in this app. Moving it risks breaking dependent functions, so it is not worth doing before a release.
- Credits: ~10 | Effort: 1 h | Order: after v1

### 9. Residual ESLint warnings and deferred SmartForms adoption
- Severity: low | Module: Cross-cutting
- Evidence: last sprint closed with 0 errors and 15 pre-existing warnings; the SmartForms sprint explicitly deferred line-item editors and `dirty` tracking on quote/estimate/receipt full-page forms.
- Why it matters: technical debt with no user-visible impact. CI is green.
- Credits: ~40-60 for the deferred forms | Effort: 1-2 days | Order: v1.1

---

## Minimum path to v1

Items 1 and 2 are the true gate. Items 3-6 are one combined RLS/grants migration plus one small auth-route fix and are worth folding into the same release — together roughly 80-130 credits and about a day of engineering. Everything in P2 can ship after.

## Technical notes

- Verified this turn: env-status on both hostnames; `information_schema.columns` confirms `profiles.force_password_change` and `is_active` exist (the older schema-drift monitoring finding is now stale); `pg_proc.proacl` confirms the missing `anon` EXECUTE grant; Supabase scan returned 2 `supabase` + 2 `supabase_lov` findings and 0 supply-chain findings.
- Items 2, 3, 5 and 6 are all database-policy changes and should land as a single reviewed migration rather than four separate ones.
