# Stone Tech OS — Database (v1.0)

Backend: Supabase (Lovable Cloud), Postgres 15. All application data lives in
the `public` schema. `auth`, `storage`, `realtime`, `supabase_functions` and
`vault` schemas are Supabase-managed and never modified by the app.

## Totals (v1.0 baseline)

| Metric                          | Count                                  |
| ------------------------------- | -------------------------------------- |
| Tables (public)                 | 126                                    |
| Triggers (public, non-internal) | 199                                    |
| Functions (public)              | 127                                    |
| RLS policies (public)           | 268                                    |
| Indexes (public)                | 468                                    |
| Forward-only migrations         | 159 files under `supabase/migrations/` |

## Table Groups

See `docs/MODULES.md` for the full per-module table list. Broad groupings:

- **CRM**: `customers`, `customer_contacts`, `customer_tags`, `enquiries`,
  `enquiry_items`, `enquiry_stage_history`, `enquiry_tags`, `projects`,
  `project_milestones`, `project_notes`, `project_tags`, `followups`.
- **Sales**: `estimates`, `estimate_items`, `estimate_cost_components`,
  `estimate_payment_schedules`, `estimate_documents`, `quotes`,
  `quote_items`, `sales_orders`, `sales_order_items`.
- **Procurement**: `rfqs`, `rfq_items`, `vendor_requests`, `vendor_quotes`,
  `vendor_quote_items`, `vendor_rfq_views`, `stage_recommendations`,
  `purchase_orders`, `grns`, `grn_items`, `grn_inspections`.
- **Vendors**: `vendors`, `vendor_contacts`, `vendor_capabilities`,
  `vendor_products`, `vendor_product_categories`, `vendor_stone_types`,
  `vendor_finishes`, `vendor_service_categories`, `vendor_service_links`,
  `vendor_tags`, `vendor_users`, `vendor_performance_cache`,
  `vendor_ledger_entries`, `vendor_payments`.
- **Manufacturing / QC / Inventory**: `production_orders`,
  `production_stages`, `production_pieces`, `production_stage_files`,
  `manufacturing_stages`, `qc_templates`, `qc_template_items`,
  `qc_results`, `inventory_items`, `inventory_movements`.
- **Fulfilment**: `dispatches`, `dispatch_items`, `installations`,
  `installation_progress`, `installation_materials`,
  `installation_signoffs`, `installation_teams`, `site_visits`.
- **Money**: `invoices`, `invoice_items`, `receipts`, `receipt_allocations`,
  `payments`, `payment_links`, `customer_payment_schedules`,
  `credit_notes`, `debit_notes`, `refunds`.
- **MDM**: `products`, `product_images`, `product_similar`,
  `product_technical_docs`, `product_veneer_specs`, `product_price_history`,
  `product_categories`, `product_families`, `stone_types`, `stone_colours`,
  `stone_origins`, `thicknesses`, `surface_finishes`, `edge_finishes`,
  `quality_grades`, `packaging_types`, `uoms`.
- **Communications**: `message_queue`, `message_templates`,
  `message_delivery_events`, `notification_deliveries`, `notification_events`,
  `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`,
  `suppressed_emails`.
- **Workforce**: `employees`, `employee_documents`, `designations`, `kras`,
  `workload_capacities`, `workforce_tasks`, `workforce_rule_assignments`,
  `workforce_score_snapshots`.
- **Platform**: `profiles`, `user_roles`, `tasks`, `comments`, `tags`,
  `favorites`, `activity_log`, `document_lineage`, `file_objects`,
  `owner_notes`, `ownership_transfers`, `bulk_imports`, `app_settings`,
  `entity_sequences`, `procurement_lock_overrides`.

## Relationships

Every child row uses a UUID `*_id` foreign key to its parent
(`customers.id`, `projects.id`, `enquiries.id`, `estimates.id`, `quotes.id`,
`sales_orders.id`, `purchase_orders.id`, `invoices.id`, `receipts.id`,
`dispatches.id`, `installations.id`, `production_orders.id`, …). Cascading
delete is intentionally avoided on business documents; deletion is gated by
`SafeDeleteDialog` + `dependencies.ts` checks. Cross-cutting join tables
(`*_tags`, `receipt_allocations`, `dispatch_items`, `sales_order_items`,
`invoice_items`, `estimate_items`, `quote_items`, `grn_items`,
`workforce_rule_assignments`, `vendor_service_links`, etc.) enforce their
own uniqueness constraints where duplicates would cause double-counting.

## Triggers (representative, 199 total)

- **Sequence numbering**: `entity_sequences` + `BEFORE INSERT` triggers
  stamp human-readable numbers (EST-, QUO-, SO-, PO-, INV-, RCT-, DC-, GRN-).
- **`updated_at`**: `update_updated_at_column()` `BEFORE UPDATE` on every
  business table.
- **Activity logging**: `AFTER INSERT/UPDATE/DELETE` on business documents
  writes into `activity_log` with the actor's `auth.uid()`.
- **Document lineage**: parent→child links written on convert flows
  (estimate→quote, quote→sales-order, sales-order→invoice/dispatch,
  purchase-order→grn).
- **Inventory movements**: `AFTER INSERT/UPDATE` on `grn_items` and
  `dispatch_items` posts into `inventory_movements`.
- **Notification enqueue**: `AFTER INSERT/UPDATE` on money + fulfilment
  documents enqueues into `message_queue` / `notification_deliveries`.
- **Workforce daily rollup**: nightly `pg_cron`-style hook
  (`/api/public/hooks/workforce-daily`) refreshes
  `workforce_score_snapshots` and `workload_capacities`.

## Functions (127 total)

- **Security definers**: `has_role(uuid, app_role)` (canonical), plus
  privileged helpers hardened with `SET search_path = public` and
  `REVOKE EXECUTE FROM anon`.
- **Convert helpers**: `create_quote_from_estimate`,
  `create_sales_order_from_quote`, `create_invoice_from_sales_order`,
  `create_dispatch_from_sales_order`, `create_grn_from_purchase_order`.
- **Sequence helpers**: `next_entity_sequence(entity, prefix)`.
- **Reporting / KPI aggregators**: dashboard tiles, executive command centre,
  vendor / customer intelligence, procurement KPIs, workforce scoring.

## RLS Strategy

- **RLS enabled on every `public.*` table**. Zero exceptions.
- **Roles** live only in `public.user_roles` and are checked through
  `public.has_role(auth.uid(), 'admin' | 'manager' | 'sales' | 'operations' | …)`.
  Roles are never stored on `profiles` or `users`.
- **User-owned tables** scope policies to `auth.uid() = <owner column>`.
- **Team / workspace-shared tables** (all business documents in this ERP) use
  role-based policies via `has_role()`.
- **Vendor portal tables** additionally check `vendor_users.user_id`.
- **Public read-only endpoints** (payment link display, email unsubscribe)
  use narrow `TO anon` SELECT policies on specific columns only.
- **`GRANT`** is issued explicitly for every table:
  `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<t> TO authenticated;
GRANT ALL ON public.<t> TO service_role;` (+ `TO anon` only where a
  matching policy exists).

## Indexes (468 total)

Covered by `..._rc3_perf_indexes.sql` (see `docs/rc3-performance-report.md`).
Primary hot paths indexed: list filters (`status`, `stage`, `customer_id`,
`project_id`, `vendor_id`, `created_at DESC`), joins on document lineage,
`activity_log(entity_type, entity_id, created_at DESC)`, and
`message_queue(status, scheduled_for)`.

## Storage

- Bucket: `stonetech-files`, private, RLS-scoped.
- Uploads go through `src/lib/attachments/api.ts`; every object row lives
  in `file_objects` with owner + entity link.

## Migrations

Additive, forward-only. Rollback = deploy previous build (schema stays
compatible). See `supabase/migrations/` (159 files, oldest → v1.0 baseline
`20260711185413_...` — historical `activity_log` duplicate cleanup).
