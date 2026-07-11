# Changelog

All notable changes to Stone Tech OS. Dates use ISO-8601. Versions follow
`MAJOR.MINOR.PATCH`.

## [1.0.0] — 2026-07-11 — **Foundation Freeze**

Official v1.0 baseline: "Stone Tech OS v1.0 Foundation". All future work
compares against this checkpoint.

### Business modules shipped
CRM (Customers, Enquiries, Projects, Follow-ups) · Estimation Studio ·
Quotations · Sales Orders · RFQ & Vendor Portal · Vendor Quotes ·
Purchase Orders · GRN · Manufacturing & QC · Inventory · Sales Orders →
Delivery Challans · Installation (teams, progress, materials, sign-off,
certificate) · Invoices · Receipts + Allocations · Payment Links + public
`/pay/$linkId` · Customer & Vendor Ledger · Credit / Debit Notes / Refunds
· Executive Command Centre · AI Copilot · Business Intelligence ·
Workforce Intelligence · Masters (MDM) · Communications (queue, templates,
providers) · Notifications · Activity Log · Documents & Lineage · Global
Search (Ctrl+K) · Favorites · Tasks · Comments · Tags · Ownership Transfer
· Bulk Imports · App Settings · Admin (users, roles).

### Foundation (RC-1 → v1.0)
- Full regression sweep across every module (auth, list, create, edit,
  status transitions, attachments, comments, timeline, deep links).
- Static: clean typecheck, clean production build, zero circular imports.
- Console hygiene sweep across all public routes (no unhandled rejections,
  no hydration mismatches, no render loops).
- Route architecture: every route uses `<FormLayout>` (edit), `<DataToolbar>`
  + `<DataTableShell>` + `<TablePagination>` (list), `<EntityPicker>` (all
  entity selects), `<ConfirmDialog>` / `<SafeDeleteDialog>` (destructive
  actions).

### Security (RC-2)
- RLS enabled on every `public.*` table (126 / 126).
- 268 role-scoped policies via `public.has_role(auth.uid(), …)`.
- SECURITY DEFINER hardening: `search_path = public` pinned, anon EXECUTE
  revoked, 17 documented WARN accepted (see `docs/rc2-security-report.md`).
- Auth: HIBP on, email verification on, anonymous sign-in off, Google OAuth
  via Lovable broker.

### Performance (RC-3)
- 21 hot-path indexes across list filters, joins, and lineage.
- Total: 468 indexes across `public`.

### Data integrity (v1.0 close-out)
- One-time migration `20260711185413_*` removed 260 historical duplicate
  `activity_log` rows from two known backfills (`2026-07-06`, `2026-07-10`).
  Trigger logic untouched.
- Verified zero duplicates / orphans across Estimates, Quotes, SOs, POs,
  Invoices, Receipts, Dispatches, Inventory.

### Fixes closing v1.0
- `src/lib/nav/preferences.ts` — render loop caused by `useSyncExternalStore`
  returning fresh objects; snapshots are now stable and only recompute on
  storage change.
- Route params: aligned `$id` → correct `$invoiceId` / `$receiptId` /
  `$projectId` / `$customerId` etc. across:
  - `src/routes/_authenticated/ledger/$customerId.tsx`
  - `src/routes/_authenticated/receipts/$receiptId.tsx`
  - `src/routes/_authenticated/masters/qc-templates.tsx`
  - `src/routes/_authenticated/projects/$projectId.tsx`
  - `src/routes/_authenticated/workforce-intelligence/employees/index.tsx`

### Documentation added
- `docs/ARCHITECTURE.md`
- `docs/MODULES.md`
- `docs/DATABASE.md`
- `docs/WORKFLOWS.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `CHANGELOG.md` (this file)

Historical RC reports remain in `docs/rc1-*.md`, `docs/rc2-*.md`,
`docs/rc3-*.md`, `docs/rc4-*.md`, `docs/release-notes-v1.0.0.md`.

### Known limitations at v1.0
- No native `pg_cron` on Lovable Cloud — schedule external hits against
  `/api/public/hooks/*`.
- Provider secrets optional: without `RAZORPAY_*`, `RESEND_API_KEY`, or
  WhatsApp tokens, deliveries queue in `message_queue` (status = `pending`).
- 17 Supabase linter WARN accepted (SECURITY DEFINER, documented).
- `activity_log` not partitioned — schedule monthly partition at ≥500 k rows.
- Global search uses `ILIKE`. Enable `pg_trgm` if latency > 200 ms.

### Roadmap
- **v1.5 (planned)**
  - Native cron + `pg_net` integration when available.
  - `activity_log` monthly range partitioning + retention.
  - `pg_trgm` global search across customers / projects / products.
  - Additional dashboard widgets (revenue cohorts, vendor scorecard v2).
- **v2.0 (planned)**
  - Native mobile installer app (Capacitor wrapper).
  - Multi-currency + FX gain/loss on ledger.
  - GST return export (GSTR-1 / 3B).
  - Fine-grained per-field permissions.
