# Stone Tech OS — RC-1 Manual QA Checklist

Run through this after `docs/rc1-e2e.spec.mjs` passes.
Each item = one flow. Mark ✅ / ❌ / N/A. Log defects with route, action, expected, actual, screenshot.

## 1 · CRM foundation

- [ ] Create customer → appears in `/customers` list within 1s
- [ ] Same customer visible in **EntityPicker** on New Project / New Enquiry / New Estimate / New Quote / New Invoice / New Receipt within 1s (no page reload required)
- [ ] Edit customer → change reflects on Customer 360, Timeline, and any linked doc
- [ ] Archive customer with 0 dependencies → succeeds; row disappears from active list
- [ ] Attempt archive with dependencies → blocked with human-readable message listing modules

## 2 · Project & enquiry

- [ ] Create project on customer → shows in Customer 360 "Projects"
- [ ] Create enquiry against project → appears on Project timeline within 1s
- [ ] Add 3+ enquiry items with different products/units → totals update live
- [ ] Change enquiry stage → history row added, timeline updated

## 3 · Estimation & quote

- [ ] Create estimate from enquiry → items copy across
- [ ] Edit margin % / GST % → subtotal, GST, total recompute
- [ ] Add payment schedule (e.g. 40/40/20) → sum equals 100 %
- [ ] Approve estimate → status locks, customer payment schedules materialize, timeline event created
- [ ] Convert to quote → quote inherits items, document_lineage row exists

## 4 · RFQ → vendor quote → PO

- [ ] Send RFQ from enquiry to 3+ vendors → rfq_items + vendor_requests created
- [ ] Enter vendor quote (as staff on behalf of vendor) → totals correct
- [ ] Approve vendor quote → other quotes for same RFQ locked from edit
- [ ] Create PO from approved quote → items snapshot correctly, vendor ledger entry appears at PO status = sent

## 5 · GRN / inventory

- [ ] Create GRN against PO → items pre-fill from PO
- [ ] Enter accepted/rejected qty → `inventory_movements` insert (direction=in) and `vendor_ledger_entries` (credit) created
- [ ] Inventory list shows updated on-hand qty
- [ ] Reject partial qty → damaged qty tracked separately, ledger amounts match

## 6 · Manufacturing & QC

- [ ] Send SO to manufacturing → production orders created for each product line
- [ ] Advance production stage → status changes, files uploaded to stage persist
- [ ] Complete QC → results saved; failed checks block dispatch

## 7 · Dispatch

- [ ] Create dispatch against SO → items pre-fill
- [ ] Save dispatch → inventory_movements (direction=out), timeline entry on customer + project

## 8 · Installation (RLS fix verification)

- [ ] Flip SO supply_scope to "Supply + Installation" → installation row auto-created
- [ ] Add daily progress with photos → progress %, status, and attachments visible
- [ ] Record material dispatched/received/installed → inventory_movements posts correctly
- [ ] Capture customer sign-off with signature → installation marked complete
- [ ] **Log in as a sales user (not manager) → cannot delete an installation** (RLS test)
- [ ] **Log in as a vendor-portal user → `/installations` returns empty or 403** (RLS test)

## 9 · Invoice & receipt

- [ ] Convert quote → invoice → items + totals identical
- [ ] Record customer receipt with allocation split across multiple invoices → sum = allocated_amount
- [ ] Customer ledger balance updates by exactly the received amount
- [ ] Invoice status transitions draft → sent → partially_paid → paid → correct badges

## 10 · Notifications & timeline

- [ ] Send payment reminder from Customer Payment Centre → message_queue row created with correct template + variables
- [ ] Timeline on Customer 360 shows: enquiry, estimate, quote, SO, invoice, payment, installation, message
- [ ] Vendor 360 timeline shows: RFQ, vendor quote, PO, GRN, ledger entries, payments
- [ ] Notification bell badge count reflects unread events

## 11 · AI features

- [ ] Copilot answers a question referencing a real customer by name — verify the numbers it quotes match a `SELECT` you run against the DB
- [ ] AI Site Assistant on an installation returns scores / recommendations
- [ ] Executive daily brief renders sections and numbers matching KPI cards

## 12 · Dashboards

- [ ] Every KPI card on Executive dashboard deep-links to a filtered list that matches the count
- [ ] Analytics time-grain toggle (day/week/month/year) redraws chart without error
- [ ] Collections dashboard priority list ordering matches days-overdue
- [ ] Procurement calendar shows PO due dates and highlights overdue

## 13 · Reports & PDF

- [ ] Estimate PDF renders with company branding, items, terms, signature block
- [ ] Invoice PDF matches on-screen totals
- [ ] Installation certificate PDF includes customer signature image
- [ ] CSV exports from list pages open cleanly in Excel

## 14 · Search & keyboard

- [ ] Global search finds customer, project, invoice, product by name/code
- [ ] `Ctrl+K` opens the palette everywhere
- [ ] `/` focuses list-page search input

## 15 · Lifecycle & safe delete

- [ ] Archive customer / vendor / project / product → moves to Archived, list default filters hide them
- [ ] Restore → returns to Active
- [ ] Delete with dependencies → blocked with human message
- [ ] Delete with zero dependencies → row removed; no orphans (spot-check with `SELECT` on child tables)

## 16 · Role isolation (log in as each role)

| Role            | Should see                                            | Should NOT see                       |
| --------------- | ----------------------------------------------------- | ------------------------------------ |
| admin           | everything, including `/admin/users`                  | —                                    |
| sales_manager   | customers, quotes, SO, invoices, receipts, dashboards | admin settings, purchase-only fields |
| sales           | own customers, quotes, invoices, followups            | admin, cost data on purchase orders  |
| purchase        | vendors, RFQs, POs, GRNs                              | customer financials                  |
| vendor (portal) | only their own RFQs, POs, quotes                      | anything for other vendors, ERP UI   |

## 17 · Performance smoke

- [ ] Dashboard KPIs load < 2 s
- [ ] Customers list (57 rows demo) < 500 ms
- [ ] Global search < 500 ms
- [ ] Estimate PDF generation < 3 s

---

**Sign-off criteria:** 0 Critical, 0 Major open items across sections 1–16 before flipping to production. Minor items may be tracked and shipped over the first pilot week.
