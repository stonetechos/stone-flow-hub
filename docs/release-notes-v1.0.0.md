# Stone Tech OS v1.0.0 — Release Notes

Release date: 2026-07-07

## Modules shipped

CRM · Estimation Studio · RFQ & Vendor Management · Procurement · Manufacturing & QC · Inventory · Installation · Dispatch · Customer & Vendor Ledger · Payments & Receipts · Credit / Debit Notes · Executive Intelligence · Business Analytics · Forecast · Collections · Management Control Centre · Customer Intelligence · Vendor Intelligence · AI Copilot · Document Lineage · Timeline · Notification Queue · Vendor Portal · Reports.

## Migration summary

- 48 forward-only Postgres migrations (see `supabase/migrations/`).
- All `public.*` tables have RLS + role-scoped policies + explicit `GRANT`s.
- Latest migrations (RC-2 / RC-3):
  - `…_rc2_security_hardening.sql` — SECURITY DEFINER hardening, `search_path` pinned, anon EXECUTE revoked.
  - `…_rc3_perf_indexes.sql` — 21 measured indexes on hot list/filter/join paths.

## Known limitations

- **No `pg_cron`** on Lovable Cloud → schedule digest / reminders from an external scheduler pointing at `/api/public/hooks/*`.
- **Provider secrets optional**: without `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, or WhatsApp tokens the ERP still works — deliveries queue up in `notification_queue` with `status='pending'` until secrets are configured.
- **17 Supabase linter WARN** remain (`authenticated can execute SECURITY DEFINER`) — accepted risks, see `docs/rc2-security-report.md`.
- **`activity_log` not partitioned** — schedule a monthly range partition at ≥500 k rows.
- **Global search** is `ILIKE` only — enable `pg_trgm` if search latency exceeds 200 ms.

## Roadmap (post-v1.0.0)

1. Native cron + `pg_net` integration.
2. Retention/partitioning for `activity_log` and `notification_queue`.
3. Trigram search across customers / projects / products.
4. Native mobile installer app (Capacitor wrapper).
5. Multi-currency + FX gain/loss on ledger.
6. GST return export (GSTR-1 / 3B).
