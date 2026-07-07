# Phase 3 — Commercial Automation & Customer Communication

Additive only. No existing schema, API, or route is broken. Every new UI surface is either fully wired or hidden behind a `coming_soon` flag (no placeholder UIs).

## 1. Conversion pipeline (Estimate → … → Payment)

Reuse existing modules; add explicit converters + a shared `document_lineage` table so every conversion preserves history, attachments, comments, revisions, and communications.

```text
estimate ─▶ quote ─▶ sales_order ─▶ production_order ─▶ dispatch ─▶ invoice ─▶ receipt/payment
```

- New table `document_lineage(source_type, source_id, target_type, target_id, converted_by, converted_at, meta)`.
- New server functions in `src/lib/lineage/api.ts`:
  - `convertEstimateToQuote(estimateId)` — already partially exists; standardize + write lineage.
  - `convertQuoteToSalesOrder(quoteId)` — exists in `sales-orders/api.ts`; add lineage.
  - `convertSalesOrderToProduction(soId)`, `convertDispatchToInvoice(dispatchId)` — add lineage rows.
- Attachments/comments/messages queried by `(entity_type, entity_id)` union across the lineage chain, so opening any document shows the full history.
- "Related documents" panel added to Estimate / Quote / SO / Invoice detail pages (read-only, no workflow change).

## 2. Send-from-ERP (WhatsApp + Email)

One shared `<SendDocumentDialog />` component wired into detail pages for: Estimate, Quotation, Purchase Order, Sales Order, Invoice, Receipt, Dispatch. Uses the existing `message_queue` + provider registry from Phase 2.

- Server fn `enqueueDocumentMessage({ entity_type, entity_id, channel, template_id, to, overrides })` renders the template with the document context, allows user edit before send, then enqueues via existing queue.
- Logs every send into `message_queue` (already has date/user/recipient/channel/status/body). Add columns if missing: `read_at`, `failed_reason`, `provider_message_id`.
- Delivery/read webhooks: `/api/public/webhooks/whatsapp` and `/api/public/webhooks/email` update `message_delivery_events` (already exists) and roll status forward.
- Payment/Follow-up reminders: extends the existing followups + payments modules with a "Send Reminder" action that uses the same dialog.

## 3. Dynamic templates with Stone Tech placeholders

- Extend `message_templates` with `entity_type` (estimate|quote|so|invoice|receipt|dispatch|reminder|followup) and `template_kind` (supplier_only|supplier_installer|custom_articles|veneers|panels|murals|sculptures|generic).
- Handlebars-style resolver `src/lib/notifications/render.ts` implementing the full placeholder set: `{{CustomerName}} {{ProjectName}} {{EstimateNo}} {{QuotationNo}} {{Material}} {{StoneType}} {{SurfaceFinish}} {{EdgeFinish}} {{Area}} {{SqFt}} {{Quantity}} {{InstallationCost}} {{MaterialCost}} {{GST}} {{Advance}} {{Outstanding}} {{DispatchDate}} {{InvoiceAmount}} {{PaymentLink}}` etc.
- Seed the 7 Stone Tech templates (Supplier Only, Supplier + Installer, Custom Stone Articles, Veneers, Panels, Murals, Sculptures) as editable rows on `/message-templates`.
- Preview + test-send inside the templates editor (no code changes needed to tweak wording).

## 4. Customer Timeline

New route `/customers/$customerId/timeline` (add tab on customer detail — non-invasive). Union query across:
`enquiries, estimates, quotes, sales_orders, invoices, receipts, payments, dispatches, site_visits, followups, message_queue, comments, tasks`.

- `src/lib/customer-timeline/api.ts` — returns a normalized `TimelineEvent[]` sorted desc.
- Filters by channel / type. Read-only feed.

## 5. Payment links

- New table `payment_links(id, provider, entity_type, entity_id, customer_id, amount, currency, status, url, provider_ref, created_by, created_at, expires_at)`.
- Provider interface already exists (`src/lib/payments-provider/types.ts`). Add adapters:
  - `razorpay.ts`, `cashfree.ts`, `stripe.ts` — each `createPaymentLink()`. Adapters are behind `coming_soon` flag until credentials are configured under `/notification-settings` → new Payments tab.
  - Manual mode (no gateway): system generates an ERP-hosted link that just shows bank details + UPI QR (fully functional).
- `SendDocumentDialog` gets an "Attach payment link" toggle that resolves `{{PaymentLink}}`.
- Webhooks: `/api/public/webhooks/payments/$provider` mark link paid and auto-create a `receipt` row via existing receipts API.

## 6. Branding — Stone Tech (Granite & Teal)

- New `src/lib/branding/index.ts` centralizing brand tokens (colors, typography, logo URL) sourced from `app_settings`.
- PDF renderer (`src/lib/pdf/`) gets a Stone Tech header/footer template — applied to all document PDFs.
- Email renderer gains a shared HTML shell (`src/lib/notifications/email-shell.tsx`) with the brand.
- WhatsApp previews in `SendDocumentDialog` render brand chrome around the message body.

## 7. Production rule

- No placeholder screens. Every new button either performs its action or is disabled with a `Coming Soon` badge (drives off a `feature_flags` map in `app_settings`).
- Flags initially ON: send-email, send-whatsapp (Meta Cloud), customer timeline, manual payment links, conversion buttons, lineage panel.
- Flags initially OFF (`Coming Soon`): Razorpay, Cashfree, Stripe live gateways (until secrets configured), WhatsApp read receipts on providers that don't support them.

## Technical additions

**New tables** (single migration): `document_lineage`, `payment_links`. Alter `message_queue` (add `read_at`, `failed_reason`, `provider_message_id` if absent). Alter `message_templates` (add `entity_type`, `template_kind`). RLS + GRANTs included; owner-read + service_role write.

**New routes:**
- `/customers/$customerId/timeline`
- `/settings/branding`
- `/settings/payment-providers`
- `/api/public/webhooks/whatsapp`
- `/api/public/webhooks/email`
- `/api/public/webhooks/payments/$provider`
- `/pay/$linkId` (public payment landing)

**New server functions** (in `src/lib/*/api.ts`):
- `lineage.recordConversion`, `lineage.getChain`
- `notifications.enqueueDocumentMessage`, `notifications.retry`, `notifications.markRead`
- `paymentLinks.create`, `paymentLinks.get`, `paymentLinks.markPaid`
- `customerTimeline.list`

**New components:** `SendDocumentDialog`, `RelatedDocumentsPanel`, `CustomerTimeline`, `TemplateEditor` (extends existing), `PaymentLinkChip`.

**Automations:** conversion buttons write lineage; payment webhook auto-creates receipt; delivery webhooks update message status; failed messages retried by existing pg_cron.

## Deliverable

Completion report at the end listing every new route, table, API, server function, automation, and any residual v1.0.0 blockers (e.g. gateway credentials still required from user).

## Confirm to proceed

Reply **go** and I ship it in one pass. Otherwise tell me which sections to trim.
