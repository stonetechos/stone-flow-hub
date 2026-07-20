# Stone Tech OS — Workflows (v1.0)

Canonical end-to-end business flows currently implemented. Every step lists
the UI entry point, the underlying tables, and the automation (trigger /
server-fn / cron) that fires.

## 1. Customer → Enquiry → Project

1. **Create Customer** — `/customers/new`. Writes `customers` (+ optional
   `customer_contacts`). `activity_log` INSERT trigger fires.
2. **Log Enquiry** — `/enquiries/new` with `EntityPicker` (customer). Writes
   `enquiries` + `enquiry_items`. Stage history seeded in
   `enquiry_stage_history`.
3. **Qualify → Convert to Project** — from `/enquiries/$id` action bar.
   Writes `projects` and links it back on the enquiry. `document_lineage`
   row created.

## 2. Estimate → Quote

1. **Create Estimate** — `/estimates/new`. Writes `estimates` +
   `estimate_items` + `estimate_cost_components` + optional
   `estimate_payment_schedules`. Sequence trigger stamps `EST-####`.
2. **Send / Approve** — `ApproveEstimateDialog`. Status transitions gated
   by `status-transitions.ts`.
3. **Convert to Quote** — server fn calls `create_quote_from_estimate()`.
   Writes `quotes` + `quote_items`. `document_lineage` row created,
   `activity_log` written on both sides.

## 3. Quote → Sales Order

1. **Approve Quote** — `/quotes/$id` action bar.
2. **Convert to Sales Order** — `create_sales_order_from_quote()`. Writes
   `sales_orders` + `sales_order_items`. Milestones seeded in
   `project_milestones` where applicable. Notification enqueued.

## 4. Sales Order → Purchase Orders / Manufacturing

- **Raise RFQ** (optional) — `/rfqs/new` scoped to a sales order. Vendors
  invited via `vendor_requests`; vendor portal (`/vendor/rfqs/$rfqId`)
  captures `vendor_quotes` + `vendor_quote_items`.
- **Create PO** — `/purchase-orders/new` (optionally from a vendor quote via
  `CreatePoFromQuoteDialog`). Writes `purchase_orders`. Vendor ledger
  entry queued.
- **Start Production** — `/manufacturing`. Writes `production_orders`,
  `production_stages`, `production_pieces`. Stage transitions logged;
  `production_stage_files` for artwork/QC evidence.

## 5. Goods Receipt (PO → GRN → Inventory)

1. **Create GRN** — `/grns` against a PO line. Writes `grns` + `grn_items`
   - `grn_inspections`.
2. **Trigger**: `AFTER INSERT` on `grn_items` posts a row into
   `inventory_movements` (positive quantity). Duplicate prevention via
   `UNIQUE (source_type, source_line_id)`.

## 6. Sales Order → Delivery Challan

1. **Prepare Dispatch** — `/dispatch` or from the sales-order detail. Writes
   `dispatches` + `dispatch_items`. Sequence trigger stamps `DC-####`.
2. **Trigger**: `AFTER INSERT` on `dispatch_items` posts a negative
   `inventory_movements` row. Duplicate prevention via UNIQUE constraint on
   `(dispatch_id, sales_order_item_id)`.
3. **Update Delivery Status** — status transitions (`prepared → in_transit →
delivered`) each write `activity_log` + enqueue notification.

## 7. Delivery → Installation

1. **Assign Installation Team** — `/installation-teams`. Writes
   `installation_teams`.
2. **Create Installation** — `/installations/new`. Writes `installations`.
3. **Daily Progress** — `DailyProgressDialog`. Writes
   `installation_progress`. Materials consumed via `RecordMaterialDialog`
   into `installation_materials`.
4. **Site Visits & QC** — `site_visits`, optional `qc_results`.
5. **Sign-off** — `SignoffDialog` + `SignaturePad`. Writes
   `installation_signoffs` + generates certificate PDF via
   `installation/certificate.ts`.

## 8. Invoice → Receipt

1. **Raise Invoice** — `/invoices/new` (typically `create_invoice_from_sales_order`).
   Writes `invoices` + `invoice_items`. Sequence trigger stamps `INV-####`.
2. **Payment Link** (optional) — `src/lib/payment-links/api.ts` +
   `/pay/$linkId` (public). Razorpay webhook at
   `/api/public/webhooks/razorpay` marks the link paid and inserts a
   `payments` row after HMAC verification.
3. **Record Receipt** — `/receipts` with `AllocationTable`. Writes `receipts`
   - `receipt_allocations`. Customer ledger view recomputes.
4. **Credit / Debit Notes / Refunds** — `credit_notes`, `debit_notes`,
   `refunds` for corrections; each linked back to the source invoice.

## 9. Follow-ups & Collections

- Automated: `/api/public/hooks/customer-payment-reminders` reads overdue
  invoices, enqueues `message_queue` rows via `notifications/dispatch`.
- Manual: `/followups` writes `followups` and updates lead scoring.

## 10. Communications

Every transition above writes an `activity_log` row (via trigger) and, where
a `message_templates` entry exists, enqueues a row into `message_queue` with
channel = `email | whatsapp | sms`. The dispatch server-fn
(`notifications/dispatch.server.ts`) picks up pending rows, calls the
provider (Resend for email, WhatsApp Business API), and writes results into
`message_delivery_events`. Failures stay queued; unsubscribes are honored
via `suppressed_emails` and `email_unsubscribe_tokens`.

## 11. Executive & Intelligence Loops (read-only)

- **Executive Command Centre** (`/dashboards/*`) aggregates KPIs, forecast,
  aging, and health from `src/lib/executive/*`.
- **AI Copilot** and **Business Insights** call server functions in
  `src/lib/ai/*` against the Lovable AI Gateway.
- **Workforce Intelligence** — nightly `/api/public/hooks/workforce-daily`
  refreshes `workforce_score_snapshots` and applies rule engine outcomes
  to `workforce_tasks`.

## Duplicate & Orphan Guarantees

- Sequence-stamped documents (EST/QUO/SO/PO/INV/RCT/DC/GRN) are unique by
  `number`.
- `activity_log` is deduped on `(entity_type, entity_id, action, actor_id,
created_at)` at the query layer; the v1.0 cleanup migration removed
  legacy backfill duplicates.
- `inventory_movements` is UNIQUE on `(source_type, source_line_id)`.
- `dispatch_items` is UNIQUE on `(dispatch_id, sales_order_item_id)`.
- `notification_deliveries` is UNIQUE on `(event_id, recipient)`.
