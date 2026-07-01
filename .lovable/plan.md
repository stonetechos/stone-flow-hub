
## Goal

Add a full sales-to-cash flow to Stone Tech OS:
Enquiry → **Quote** (sent to customer) → on acceptance, convert to **Invoice** → generate a **Razorpay payment link** → customer pays via UPI/card/netbanking → payment auto-recorded against the project.

Razorpay is not one of Lovable's built-in providers, so we'll integrate it directly using your Razorpay account's API keys (BYOK).

---

## What you'll need (before I build)

1. A **Razorpay account** (razorpay.com → Sign up, complete KYC).
2. Two API keys from Razorpay Dashboard → Settings → API Keys:
   - `RAZORPAY_KEY_ID` (starts with `rzp_test_` or `rzp_live_`)
   - `RAZORPAY_KEY_SECRET`
3. A **webhook secret** you'll set when I configure the webhook URL in Razorpay.

I'll ask for these via the secrets prompt at the right moment — you won't need to paste them in chat.

---

## Data model (new tables)

- **`quotes`** — quote_no (`QUO-######`), enquiry_id, customer_id, project_id, status (draft/sent/accepted/rejected/expired), valid_until, subtotal, tax_amount, total, currency, notes, terms.
- **`quote_items`** — line items (product_id or free text, qty, unit_price, tax_pct, line_total).
- **`invoices`** — invoice_no (`INV-######`), quote_id (nullable — can invoice directly), project_id, customer_id, status (draft/sent/partial/paid/cancelled), issue_date, due_date, subtotal, tax_amount, total, amount_paid, balance_due, currency.
- **`invoice_items`** — mirrors quote_items shape.
- **`payments`** — invoice_id, amount, paid_at, method (razorpay/bank_transfer/upi_manual/cheque/cash), razorpay_payment_id, razorpay_link_id, reference_no (for manual), notes, recorded_by.
- **`payment_links`** — invoice_id, provider (razorpay), provider_link_id, short_url, status (created/paid/cancelled/expired), amount, expires_at.

All tables: sequence-based codes via existing `next_code()`, RLS scoped to authenticated staff, activity_log triggers, GRANTs.

---

## UI

- **Enquiry detail** → new "Create Quote" action. Opens a QuickForm to pick line items from your Products master (or free text) and set validity.
- **Quotes list + detail** (`/quotes`, `/quotes/$id`): status pipeline, "Send to customer" (records status only for v1; email/PDF later), "Mark accepted → Convert to Invoice", "Duplicate".
- **Invoices list + detail** (`/invoices`, `/invoices/$id`): shows totals, payment history, outstanding balance, "Generate Razorpay Link" button, "Record manual payment" button, "Send reminder" (v2).
- **Project Hub** gets two new tabs: **Quotes** and **Invoices** (filtered to that project).
- **Dashboard** gains two tiles: *Outstanding invoices (₹)* and *Payments this month (₹)*.

Progressive Disclosure is preserved — Quick Fill = customer/project/items/total; More Details = tax %, validity, terms; Advanced = notes, custom line descriptions.

---

## Razorpay integration (server-side only)

Three server functions in `src/lib/payments/`:

1. **`createRazorpayLink`** (protected) — takes `invoice_id`, calls Razorpay `POST /v1/payment_links` with amount, customer contact, invoice reference. Stores the returned `short_url` + `id` in `payment_links`. Returns the URL for the UI to copy/share via WhatsApp.
2. **`cancelRazorpayLink`** (protected) — cancels an unpaid link.
3. **Public webhook route** `/api/public/webhooks/razorpay` — verifies Razorpay's HMAC signature against `RAZORPAY_WEBHOOK_SECRET`, then on `payment_link.paid` inserts into `payments`, updates invoice `amount_paid` / `balance_due` / `status`, and appends to activity_log.

Never exposes the secret key to the browser. Webhook URL will be `https://project--<your-id>.lovable.app/api/public/webhooks/razorpay` — I'll give you the exact URL to paste into Razorpay Dashboard → Webhooks after building.

---

## Out of scope for v1 (do later)

- PDF generation and emailing of quotes/invoices (can add via Lovable Emails once v1 is stable).
- Advance/part-payment schedules (you flagged as a nice-to-have — I'll leave the `payments` table capable of multiple entries per invoice so this drops in cleanly).
- GST/e-invoicing/IRN — India compliance layer is a separate module.
- Credit notes and refunds.

---

## Build order

1. Migration: create the 6 tables + code sequences + triggers + RLS + GRANTs.
2. Domain slices: `src/lib/quotes/`, `src/lib/invoices/`, `src/lib/payments/` (schemas + api).
3. Quotes UI (list, detail, create-from-enquiry, convert-to-invoice).
4. Invoices UI (list, detail, record-manual-payment).
5. Razorpay server functions + webhook route + secrets prompt.
6. "Generate payment link" button on invoice detail + Project Hub tabs + Dashboard tiles.

Say the word and I'll start with step 1 (migration).
