# Stone Tech OS — Standard Operating Procedures

## Sales SOP
1. **Create customer** → `/customers/new` (auto-numbered).
2. **Create project** under customer → `/customers/{id}` → **New Project**.
3. **Log enquiry** → `/enquiries/new`, link to customer+project, set stage `new`.
4. **Build estimate** in Estimation Studio → `/estimates/new` from enquiry.
5. **Approve estimate** → RPC `approve_estimate(estimate_id)`; only one approved estimate per enquiry (enforced by `enforce_single_approved_quote` trigger).
6. **Send quote** → `/quotes/new` from estimate. PDF generated server-side, uploaded to `stonetech-files/quotes/`, signed URL emailed.
7. **Convert to Sales Order** on customer approval.

## Procurement SOP
1. **Raise RFQ** from SO or manually at `/rfqs/new`.
2. **Invite vendors** — auto-recommended via `recommend_vendors_for_rfq()` (based on `vendor_service_categories`, past performance).
3. **Receive vendor quotes** → `/rfqs/{id}` → **Vendor Quotes** tab.
4. **Create PO** → `create_po_from_vendor_quote(vq_id)` RPC (admin/purchase only). Lock is enforced via `procurement_lock_check`.
5. **GRN on delivery** → `/grns/new`, links back to PO items. Inventory auto-increments via `grn_item_after_ins` trigger.
6. **Vendor payment** → `/vendor-payments/new`; posts to `vendor_ledger` via `vendor_payment_after_ins` trigger.

## Manufacturing SOP
1. **Send to manufacturing** → `send_to_manufacturing(sales_order_id)` RPC creates `production_orders` + `production_stages`.
2. **Update stage progress** → `/manufacturing/{id}`.
3. **QC checklist** driven by `qc_templates` per family/stage. Failing items block stage completion.
4. **Move to ready-for-dispatch** when all stages `completed` and QC `passed`.

## Installation SOP
1. **Auto-created** from SO by `sync_installation_from_sales_order` trigger.
2. **Assign team** → `/installations/{id}`.
3. **Record daily progress + photos** (uploaded to `stonetech-files/installations/`).
4. **Consume materials** → `record_installation_material()` RPC (decrements inventory).
5. **Customer sign-off** → `/installations/{id}/signoff`; finalize via `finalize_installation_on_signoff` trigger which flips install status and opens the final invoice.

## Accounts SOP
1. **Raise invoice** → `/invoices/new` from SO / installation.
2. **Record receipt** → `/receipts/new`; allocations sync to `customer_ledger` via `trg_receipt_alloc_sync`.
3. **Payment schedule** built via `default_customer_payment_schedule()`; overdue items surface in `customer_payment_dashboard`.
4. **Credit / Debit notes** issued from customer 360.
5. **Reconcile** vendor and customer ledgers monthly from `/reports/ledger-reconciliation`.

## Emergency procedures
- **Lock a bad PO** → set `procurement_lock_overrides.locked=true`.
- **Void an invoice** → `status='cancelled'`; ledger auto-reverses.
- **Restore accidentally deleted entity** → use `purge_entity(false)` reversal (30-day soft delete window).
