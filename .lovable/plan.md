
# Invoice Module Upgrade — Zoho-grade Indian GST Invoicing

Scope is large. This plan groups the 18 requirements into 6 shippable phases, all additive to the existing invoice/company/document/PDF stack. No data migration risk: every new column is nullable with a default, all existing rows keep their numbering, ledger links, Razorpay links, and receipts.

## Phase 1 — Company Master (multi-firm)

- Migration: extend `public.company_profiles`
  - Add: `display_name`, `alt_logo_url`, `primary_contact`, `secondary_contact`, `qr_code_url`, `msme_no`, `designation`, `invoice_footer`, `terms_and_conditions` (all nullable).
  - Drop the "single active" partial-unique index; replace with `is_active bool default true` on each row (multiple active firms allowed).
  - Backfill: existing single row keeps `is_active = true`.
- API (`src/lib/company/api.ts`): add `listActiveCompanyProfiles()`, keep `getActiveCompanyProfile()` returning first active (backward compat for anything not yet firm-aware).
- Hook: `useCompanyProfiles()` (list) + existing `useCompanyProfile()`.
- Settings > Company: convert single-form page into a list + edit view. Each firm supports logo, alt logo, signature, stamp, QR uploads (reuse existing storage bucket).
- Zod schema updated for new fields.

## Phase 2 — Invoice data model additions

Migration on `public.invoices` (all nullable, no backfill required):
- `company_profile_id uuid references public.company_profiles(id)`
- Billing/site split: `billing_address text`, `site_name text`, `site_address text`, `site_contact_name`, `site_contact_phone`
- Header extras: `customer_po_no`, `payment_terms`, `sales_executive_id uuid`
- Logistics (all optional): `transporter`, `vehicle_no`, `truck_no`, `lr_no`, `driver_name`, `driver_mobile`, `dispatch_date date`, `eway_bill_no`, `einvoice_irn`, `dispatch_remarks`
- Charges: `freight`, `packing`, `loading`, `unloading`, `other_charges`, `round_off` (numeric default 0)
- On `invoice_items`: `discount_pct numeric default 0`, `unit text`, `description text` (multiline). HSN/GST columns already exist from earlier GST migration.

Recalc trigger (`recalc_invoice_totals`) updated to include the new charge lines and round-off.

## Phase 3 — Document Engine refactor (future-ready)

Consolidate today's ad-hoc `renderDocHtml` + per-module doc builders behind a single reusable pipeline:

```
src/lib/documents/
  engine.ts        // existing — extended
  render.ts        // NEW: renders any DocumentModel → HTML
  pdf.ts           // NEW: real binary PDF (jsPDF + html2canvas, bundled)
  model.ts         // NEW: DocumentModel type (header/parties/items/totals/logistics/footer)
  adapters/
    invoice.ts     // NEW
    quote.ts       // (stubbed, uses same model)
    proforma.ts    // stub
    po.ts          // stub
    delivery-challan.ts
    credit-note.ts
    debit-note.ts
```

- Adapters read the invoice + selected `company_profile_id` and emit a `DocumentModel`.
- `renderDocumentHtml(model)` produces the branded A4 HTML (used for screen preview + email body).
- `renderDocumentPdf(model)` produces a real binary Blob using jsPDF (client-side; no server dep). Fixes the "Download PDF opens blank page" bug — download will be an actual `.pdf` file, not a `window.print()` shim.
- Old `src/lib/pdf/generator.ts` becomes a thin shim delegating to the new engine (backward compat for every other module still calling `printPdf`/`previewPdf`).

## Phase 4 — Invoice UI redesign

Route: `src/routes/_authenticated/invoices/$invoiceId.tsx`, `.edit.tsx`, `new.tsx`.

New sections (all inside existing `FormLayout`, no new design language):
1. **Invoice From** — `CompanyPicker` (dropdown of active company profiles). On change, invoice preview instantly reflects new logo/bank/signature/footer.
2. **Bill To / Site** — two side-by-side panels; Site defaults from Project, editable.
3. **Header grid** — Invoice #, Date, Due Date, Sales Exec (user picker), Project, Customer PO, Payment Terms.
4. **Items table** — Sr, Item, Description (textarea), HSN, Qty, Unit, Rate, Discount %, GST %, Amount. Reuses `LineItemsEditor` extended with the new columns.
5. **Charges & Totals** — Subtotal, Discount, Freight, Packing, Loading, Unloading, Other, Round Off, CGST, SGST, IGST, Grand Total. Rows only render when non-zero.
6. **Logistics (collapsible)** — all 10 optional fields; omitted from PDF when blank.
7. **Payment** — auto from Company Profile (Bank/UPI/QR + existing Razorpay link).
8. **Footer** — "For <Company Name>" + signature block auto-swapped by company.

Detail view mirrors edit view but read-only, with the same section order.

## Phase 5 — Workflow guardrails

Extend the existing status engine in `src/lib/invoices/`:
- Statuses: `draft → issued → partially_paid → paid → cancelled` (add `issued`; keep `sent` as alias for backward compat in DB).
- Guards: PDF **Download** allowed on any status; **Email / Share link / Razorpay create / Dispatch** blocked while `draft`. Enforced both in server functions and UI (buttons disabled + reason).
- Ledger untouched — receipts continue to drive `partially_paid`/`paid` via the existing recalc trigger. `cancelled` reverses ledger entries the same way current cancel path does.

## Phase 6 — Verification

- `bun run build` clean.
- `tsgo` clean.
- Existing invoice tests + new tests for:
  - Company Profile: multiple actives, patch flow.
  - Document engine: HTML snapshot for a fully-populated invoice; PDF Blob non-empty; blank logistics section absent from output.
  - Workflow guards: draft blocks email/razorpay; issued permits them.
- Manual QA checklist attached in `docs/invoice-upgrade-v2.md`.

## Technical notes (for engineers)

- Multi-firm: relaxing the "single active" invariant is a **breaking** conceptual change for `getActiveCompanyProfile()`. We keep the function (returns first active by name) so branding lookups outside invoices keep working; new invoice code paths use `company_profile_id` explicitly.
- PDF: jsPDF + html2canvas is bundled at build time (Worker-safe, no native deps). No new secrets.
- Backward compat: legacy invoices without `company_profile_id` fall back to the first active company (current behavior) — nothing to migrate.
- No changes to: numbering (`assign_invoice_code` trigger), receipts/allocations, `payment_links`, `payments`, Razorpay webhook, activity_log shape, RLS policies (new columns inherit table policy).

## Deliverables

- 2 migrations (company_profiles extension, invoices extension) with GRANT preservation.
- New: `src/lib/documents/{model,render,pdf}.ts` + adapters.
- Extended: `company/api.ts`, `company/hooks.ts`, `company/schema.ts`, `invoices/api.ts`, `invoices/schema.ts`.
- New UI: `CompanyPicker`, redesigned invoice form/detail, Settings > Companies list.
- Docs: `docs/invoice-upgrade-v2.md` (QA + migration notes).

Estimated size: ~25 files touched/added, 2 migrations. No destructive changes.

Reply **approve** to proceed, or tell me which phases to trim / reorder.
