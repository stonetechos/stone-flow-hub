# Estimation Studio & Customer Receipts — Build Plan

This is a large, multi-week expansion of the frozen v1.0.0-beta.1. It touches DB schema, ~40 new files, and two external integrations (WhatsApp Cloud API, email provider). I'll ship it in phases so each phase is independently testable and existing Quotes/Payments keep working untouched.

## Guiding rules
- **Non-breaking**: existing `quotes`, `quote_items`, `payments`, `invoices` tables and routes stay as-is. New capabilities live in new tables and new routes (`/estimates`, `/receipts`). A feature flag toggles the new UI in nav.
- Existing quotations remain viewable/editable via the current `/quotes` module.
- All new tables get RLS + GRANT per project convention. All entity pickers use `EntityPicker`. All mutations use `src/lib/query-invalidation.ts`.

---

## Phase 1 — Estimation Studio (data + UI)

### DB (one migration)
- `estimates` — supersedes-optional wrapper: `estimate_no`, `template` enum (`material_supply`, `material_install`, `custom_articles`, `custom_manufacturing`), project_id, customer_id, status, currency, valid_until, notes, terms, totals (material_cost, manufacturing_cost, installation_cost, adhesives, chemicals, sealer, packing, freight, gst_amount, margin_pct, margin_amount, subtotal, total), payment_schedule jsonb, created_by, timestamps, is_demo.
- `estimate_items` — line items with `category` (material/manufacturing/installation/consumable/other), product_id, description, qty, unit, rate, tax_pct, line_total, sort_order.
- `estimate_cost_components` — per-estimate overrides for adhesives/chemicals/sealer/packing/freight (rate + qty + total).
- `estimate_payment_schedules` — label, pct, amount, due_offset_days.
- `estimate_documents` — generated artifacts (customer_pdf, cost_sheet_pdf, whatsapp_text, email_html) with version history.
- Trigger: recompute totals on item/component change (mirrors `recalc_quote_totals`).
- Optional link: `estimates.source_quote_id` and `quotes.estimate_id` for migration of legacy quotes on demand.

### API layer (`src/lib/estimates/`)
- `schema.ts` — zod schemas per template (fields conditionally required).
- `api.ts` — list/get/create/update/delete/status/duplicate; `convertEstimateToQuote` and `convertEstimateToInvoice` reuse existing RPC pattern.
- `calc.ts` — pure calculation engine: takes items + components + margin + gst → totals; used both client-side (live preview) and server-side (persist).
- `templates.ts` — template config: which categories/fields/components are visible per template.

### Routes / UI
- `/estimates` list, `/estimates/new?template=…`, `/estimates/$id`, `/estimates/$id/edit`.
- New Estimate wizard: Step 1 pick template → Step 2 customer/project (EntityPicker) → Step 3 items + auto components → Step 4 margin/GST/schedule → Step 5 preview & save.
- Live cost breakdown side panel using `calc.ts`.
- Payment schedule presets 75/25, 80/20, custom (rows must sum to 100%).
- "Convert to Quote/Invoice" buttons preserve existing downstream workflows.

### Document generation
- `src/lib/estimates/render/` — `customerPdf.ts`, `costSheetPdf.ts` (reuse `src/lib/pdf/generator.ts`), `whatsapp.ts`, `emailHtml.ts`.
- Editable preview dialog before send; final text stored in `estimate_documents` with version.

---

## Phase 2 — Customer Receipts

### DB
- `receipts` — receipt_no, customer_id, received_at, amount, mode enum (`cash`,`upi`,`neft`,`rtgs`,`imps`,`cheque`,`card`,`gateway`), reference_no, bank_ref, notes, unallocated_amount, is_demo.
- `receipt_allocations` — receipt_id, invoice_id, amount; trigger updates invoice `amount_paid`/`balance_due` (reuses `recalc_invoice_totals`).
- View `customer_ledger_v` — union of invoices (debit) and receipts (credit) ordered by date, running balance.

### API + UI
- `src/lib/receipts/{schema,api}.ts`.
- Routes `/receipts`, `/receipts/new`, `/receipts/$id`, and `/customers/$id` gets a Ledger tab + Unallocated Advances chip.
- Multi-invoice allocation UI: pick customer → list open invoices with allocation inputs; remainder auto-stored as unallocated advance.
- Existing `/payments` module remains for invoice-scoped quick payments; a helper migrates payments↔receipts as needed but no destructive change.

---

## Phase 3 — Notification queue + WhatsApp/Email delivery

### DB
- `message_templates` — key, channel (`whatsapp`|`email`), estimate_template scope, subject, body (handlebars-ish `{{customer.name}}`), version, is_active.
- `message_queue` — id, channel, to_address, template_key, rendered_subject, rendered_body, entity_type, entity_id, status (`pending`,`sending`,`sent`,`failed`,`retry`), attempts, last_error, provider_message_id, scheduled_at, sent_at.
- `message_events` — provider webhook events (delivered/read/bounced).

### Server routes / functions
- `createServerFn` `enqueueMessage`, `retryMessage`, `cancelMessage`.
- `/api/public/webhooks/whatsapp` — verify Meta signature, update `message_events`.
- `/api/public/webhooks/email` — Resend/SMTP bounce/complaint handler.
- Cron via pg_cron → `/api/public/cron/process-messages` every minute; drains queue with backoff (max 5 attempts).
- Secrets required (requested via `add_secret` when Phase 3 starts): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `RESEND_API_KEY` (or SMTP creds). Publishable/anon keys stay in code.

### UI
- Send dialog per estimate: choose channel → template preselected by estimate template → user edits rendered message → enqueue.
- `/settings/messaging` — manage templates + view queue with retry.
- Message history tab on Estimate detail (all versions, status pills).

---

## Rollout
1. Phase 1 behind nav flag; existing `/quotes` untouched.
2. Phase 2 ships with cross-link from Estimates → Convert → Invoice → Receipt.
3. Phase 3 last; without secrets, "Save & Copy" fallback still works.

## Out of scope for this plan
- Migrating existing quotes into estimates automatically (opt-in "Clone as Estimate" button only).
- Rewriting the current Payments module UI.

## What I need from you before I start
1. **Approve phased scope**, or tell me to compress phases.
2. **Email provider**: Resend (recommended, built-in connector) or SMTP creds?
3. **WhatsApp**: confirm you have a Meta WhatsApp Business Cloud app + phone number ID ready — I'll request the tokens via `add_secret` when Phase 3 begins.
4. **Currency/GST**: assume INR + Indian GST (CGST/SGST/IGST split on invoice, single GST% on estimate line) — OK?

Reply "go" (plus answers to 2–4) and I'll start Phase 1 migration.
