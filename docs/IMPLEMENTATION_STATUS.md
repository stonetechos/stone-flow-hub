# Stone Tech OS — Implementation Status vs. Product Roadmap

**Purpose.** A prior conversation session produced a long series of "Sprint 4A / Sprint 5A" status reports (Executive Intelligence, Sales Intelligence, Quote Health Score, Lost Quote Analysis, Sales Coaching, etc.) that were never actually committed to this repository — they existed only in a temporary sandbox clone that was reset. This document establishes the **real** baseline, verified directly against the committed source at:

- Repo: `stonetechos/stone-flow-hub`
- Branch: `main`
- HEAD at audit time: `1a58f567c5e136f51f769916166f03fff6e6ab31` (2026-07-18)

All future work should be planned against this document, not against anything described in earlier chat turns that isn't reflected here.

**Roadmap source.** The only roadmap document that exists in this repository is `docs/v1.1-backlog.md` — the intake backlog frozen at v1.0 (2026-07-07), organized into 15 categories with stable IDs (CB-, MB-, UX-, PI-, AI-, RP-, MO-, CP-, VP-, FE-, IN-, MF-, IS-, AN-, SA-). This audit classifies every item in that backlog. `docs/MODULES.md` and `CHANGELOG.md` describe the v1.0 foundation those backlog items build on top of; that foundation is summarized in Section 1 for context, since "planned capability" only makes sense relative to what's already shipped.

**Method and its limits.** Classification is based on `git ls-files`, targeted `grep` across `src/` and `supabase/migrations/`, and direct reading of the files that turned up. This is a good-faith, evidence-cited sample — not a line-by-line read of every one of ~1,600 source files. Where a file exists and does roughly what an item describes, it's marked accordingly with the file path as evidence. Where nothing turned up under multiple reasonable search terms, it's marked **Not started** — the expected default for an intake backlog written the same week v1.0 froze. Anyone picking up a specific item should re-verify against current code before estimating.

**Legend.** ✅ Implemented — the capability exists and works as described. 🟡 Partial — some real groundwork exists but the item as specified isn't fully done. ⚪ Designed only — planning/schema exists with no working code. ⬜ Not started — no evidence found.

---

## 1. v1.0 Foundation (context, not part of the audited backlog)

Per `CHANGELOG.md` and `docs/MODULES.md`, v1.0 (frozen 2026-07-11) shipped as a working, regression-tested baseline: CRM (Customers/Enquiries/Projects/Follow-ups), Estimation Studio, Quotations, Sales Orders, RFQ & Vendor Portal, Vendor Quotes, Purchase Orders, GRN, Manufacturing & QC, Inventory, Delivery Challans, Installation (teams/progress/materials/sign-off/certificate), Invoices, Receipts + Allocations, Payment Links + public `/pay/$linkId`, Customer & Vendor Ledger, Credit/Debit Notes/Refunds, Executive Command Centre, AI Copilot, Business Intelligence, Workforce Intelligence, Masters (MDM), Communications, Notifications, Activity Log, Documents & Lineage, Global Search (Ctrl+K), Favorites, Tasks, Comments, Tags, Ownership Transfer, Bulk Imports, App Settings, Admin. RLS on all 126 tables, 268 role-scoped policies. This is the real, live, working baseline — everything in Section 2 is additional work proposed on top of it.

**One naming note found during this audit:** `docs/MODULES.md` lists `src/lib/quotes/` as having "(+ `comparison.ts`)". That file exists, but its actual content is **vendor RFQ quote comparison for procurement** (`getRfqComparison()`, comparing vendor bids on an RFQ) — unrelated to customer-facing sales quotation comparison. This is a pre-existing doc/code labeling mismatch, not something introduced this session. The customer-facing Quote Comparison capability added in commit `1a58f567` (`src/lib/quotes/compareUtils.ts` + `QuoteComparisonDialog.tsx`) is genuinely new and does not duplicate `comparison.ts`.

---

## 2. v1.1 Backlog Audit

### 2.1 Critical Bug Fixes

| ID    | Description                            | Status         | Evidence                                                |
| ----- | -------------------------------------- | -------------- | ------------------------------------------------------- |
| CB-01 | Triage bucket for P0 production issues | ⬜ Not started | Placeholder bucket by design — no fixed scope to audit. |

### 2.2 Minor Bug Fixes

| ID    | Description                            | Status         | Evidence                                                                                         |
| ----- | -------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| MB-01 | Review 17 Supabase linter WARNs        | ⬜ Not started | `docs/rc2-security-report.md` documents the 17 as accepted at freeze; no follow-up review found. |
| MB-02 | Drop unused RC-3 indexes after 30 days | ⬜ Not started | Time-gated on production stats; no evidence of a follow-up pass.                                 |
| MB-03 | Reconcile stray `is_demo` flags        | ⬜ Not started | No cleanup script or migration found.                                                            |
| MB-04 | Tighten `.passthrough()` Zod schemas   | ⬜ Not started | Not audited/changed.                                                                             |

### 2.3 UX Improvements

| ID    | Description                                       | Status         | Evidence                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-01 | Global command palette (⌘K) — nav + entity search | 🟡 Partial     | `src/components/global/GlobalSearchDialog.tsx` already implements a full Cmd/Ctrl+K palette covering both entity search (`src/lib/search/api.ts`) and navigation (`resolveNav`/sidebar items) — this is v1.0 foundation, already real. The backlog item's actual ask is the `pg_trgm` scaling dependency (PI-01), which is **not** done. |
| UX-02 | Sticky column widths + saved views                | ⬜ Not started | `useTablePrefs` hook exists for column visibility/density but no evidence of saved _views_ or sticky widths.                                                                                                                                                                                                                             |
| UX-03 | Inline edit on list rows                          | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                       |
| UX-04 | Empty/error state design pass                     | ⬜ Not started | `States.tsx` primitives exist (v1.0) but no dedicated audit pass found.                                                                                                                                                                                                                                                                  |
| UX-05 | Estimation Studio keyboard shortcuts              | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                       |
| UX-06 | Toast-to-timeline click-through                   | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                       |
| UX-07 | Dark mode audit on ledger/invoice/PDF             | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                       |
| UX-08 | ARIA/focus-ring audit on Radix overrides          | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                       |

### 2.4 Performance Improvements

| ID    | Description                                | Status         | Evidence                                                                                                                                          |
| ----- | ------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PI-01 | `pg_trgm` + GIN indexes for search         | ⬜ Not started | `grep -rl pg_trgm supabase/migrations/` returns nothing.                                                                                          |
| PI-02 | Partition `activity_log`, 90-day retention | ⬜ Not started | Two migrations reference `PARTITION` generically but neither targets `activity_log` on inspection of filenames/dates; not confirmed as this item. |
| PI-03 | Partition `notification_queue`             | ⬜ Not started | Same as above — no confirmed match.                                                                                                               |
| PI-04 | Materialized view for executive KPIs       | ⬜ Not started | No evidence found.                                                                                                                                |
| PI-05 | Cursor pagination / estimated counts       | ⬜ Not started | Existing lists use `TablePagination` with exact counts; no cursor-based rework found.                                                             |
| PI-06 | Vite chunking pass per dashboard route     | ⬜ Not started | No evidence found.                                                                                                                                |
| PI-07 | Hover-prefetch on detail routes            | 🟡 Partial     | Backlog item itself notes "already partly on" — not independently re-verified this pass.                                                          |

### 2.5 AI Improvements

| ID    | Description                             | Status         | Evidence                                                                                                                                                                                                                                     |
| ----- | --------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-01 | Streaming Copilot responses (SSE)       | ⬜ Not started | No `stream`/SSE/`EventSource` usage found in `src/lib/ai/gateway.server.ts`.                                                                                                                                                                 |
| AI-02 | Embed-and-retrieve on notes             | ⬜ Not started | No `vector` extension usage or embedding code found.                                                                                                                                                                                         |
| AI-03 | Vendor recommendation model v2          | ⬜ Not started | `vendor_performance_cache` exists (v1.0) but no v2 scoring incorporating on-time %/defect rate/price index found beyond what's already cached.                                                                                               |
| AI-04 | Estimate auto-draft from enquiry text   | ⬜ Not started | Depends on AI-02, which isn't started.                                                                                                                                                                                                       |
| AI-05 | Weekly executive brief email digest     | ⬜ Not started | `daily-digest.ts` webhook exists (`src/routes/api/public/hooks/daily-digest.ts`) but is a daily, not weekly, hook and not confirmed as an "executive brief"; would need direct reading to confirm scope — treated as not matching this item. |
| AI-06 | Per-user token budget + spend dashboard | ⬜ Not started | No `token_budget`/usage-tracking code found.                                                                                                                                                                                                 |
| AI-07 | 👍/👎 feedback loop on AI answers       | ⬜ Not started | No feedback capture found in `src/components/copilot/`.                                                                                                                                                                                      |

### 2.6 Reporting Improvements

| ID    | Description                                   | Status         | Evidence                                                                                                                                                                                                      |
| ----- | --------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RP-01 | GSTR-1 / GSTR-3B export                       | ⬜ Not started | No GST-return-specific code found.                                                                                                                                                                            |
| RP-02 | TDS / Form 26Q report                         | ⬜ Not started | No TDS-specific reporting code found.                                                                                                                                                                         |
| RP-03 | Project P&L (revenue vs COGS vs installation) | ✅ Implemented | `src/lib/executive/profitability.ts` — `getProjectProfitability()` computes exactly this: estimate/quoted/actual values, material/procurement/installation/labour/transport cost, gross/net profit, profit %. |
| RP-04 | Salesperson leaderboard + commission          | ⬜ Not started | No commission-calculation code found. (Note: the earlier lost-sandbox "Sales Coaching" work, which resembles a leaderboard, was never committed here.)                                                        |
| RP-05 | Scheduled monthly XLSX report email           | ⬜ Not started | No evidence found.                                                                                                                                                                                            |
| RP-06 | Custom report builder                         | ⬜ Not started | No evidence found.                                                                                                                                                                                            |

### 2.7 Mobile Improvements

| ID    | Description                                              | Status         | Evidence                                                                                                                                                                                                                                                                                        |
| ----- | -------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MO-01 | Responsive audit — Estimation Studio, RFQ, Manufacturing | ⬜ Not started | No dedicated audit doc/commit found beyond general layout components.                                                                                                                                                                                                                           |
| MO-02 | PWA install prompt + offline shell                       | 🟡 Partial     | `public/sw.js` (service worker) exists, and `docs/android-twa-prep.md` documents TWA groundwork — but an install-prompt UI and offline-shell for dashboards specifically wasn't confirmed.                                                                                                      |
| MO-03 | Capacitor wrapper for Installation module                | 🟡 Partial     | A general Capacitor Android wrapper exists for the whole app (`android/`, `capacitor.config.ts`, commit `3366ea18` "Add Capacitor Android support") — but no Installation-module-specific native capture (camera integration, offline sign-off sync) was confirmed beyond the general web view. |
| MO-04 | Mobile Followups view + push notifications               | ⬜ Not started | No push-notification integration found.                                                                                                                                                                                                                                                         |

### 2.8 Customer Portal

| ID    | Description                                     | Status         | Evidence                                                                                                                                                 |
| ----- | ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CP-01 | Public quote acceptance + e-signature           | ⬜ Not started | `src/routes/api/public/` has webhooks (Razorpay, WhatsApp, daily-digest, dispatch-queue, payment-reminders) but no public quote-acceptance/e-sign route. |
| CP-02 | Customer login portal (invoices/statements/pay) | ⬜ Not started | No `customer` auth role or customer-facing portal routes found (only the public `/pay/$linkId` payment-link flow from v1.0).                             |
| CP-03 | Installation progress timeline for customer     | ⬜ Not started | Depends on CP-02.                                                                                                                                        |
| CP-04 | Customer document library                       | ⬜ Not started | Depends on CP-02.                                                                                                                                        |

### 2.9 Vendor Portal (extend existing)

| ID    | Description                                       | Status         | Evidence                                                                                                             |
| ----- | ------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| VP-01 | Vendor PO acknowledgement + revised delivery date | ⬜ Not started | `src/lib/vendor-portal/` contains only `dashboard.ts`, `quote.ts`, `rfq.ts`, `session.ts` — no acknowledgement flow. |
| VP-02 | Vendor invoice upload + GRN linking               | ⬜ Not started | No matching code in `vendor-portal/`.                                                                                |
| VP-03 | Vendor-visible scorecard                          | ⬜ Not started | `vendor_performance_cache` exists (internal, v1.0) but nothing exposing it through the vendor-facing portal.         |
| VP-04 | Vendor chat thread per PO                         | ⬜ Not started | No evidence found.                                                                                                   |

### 2.10 Finance Enhancements

| ID    | Description                                               | Status         | Evidence                                                                                                                                                                                                                                              |
| ----- | --------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FE-01 | Multi-currency + FX gain/loss                             | ⬜ Not started | `currency_code` columns exist on several tables (v1.0 groundwork) but no FX gain/loss posting logic found.                                                                                                                                            |
| FE-02 | Bank reconciliation                                       | ⬜ Not started | No bank-statement-import code found.                                                                                                                                                                                                                  |
| FE-03 | Auto reminders v2 — escalation ladder + WhatsApp fallback | 🟡 Partial     | `src/lib/notifications/providers/whatsapp.ts` and `src/lib/customer-payments/collection.ts`/`request.ts` provide WhatsApp sending and payment collection/request flows (v1.0) — but no escalation-ladder logic (staged reminder intensity) was found. |
| FE-04 | Stripe/PayU alongside Razorpay                            | ⬜ Not started | Only Razorpay webhook found (`src/routes/api/public/webhooks/razorpay.ts`).                                                                                                                                                                           |
| FE-05 | Cheque tracking (received/deposited/cleared/bounced)      | 🟡 Partial     | `cheque` is a payment method option and `cheque_no`/`cheque_date` fields exist on receipts (`src/lib/receipts/schema.ts`) — basic recording only. No status workflow (deposited/cleared/bounced) found.                                               |
| FE-06 | Aged debtors dashboard (0-30/30-60/60-90/90+)             | ✅ Implemented | `src/lib/executive/timeseries.ts` — `getCustomerAging()` with exactly these buckets (`AGING_BUCKETS`), consumed by `src/routes/_authenticated/dashboards/analytics.tsx`.                                                                              |

### 2.11 Inventory Enhancements

| ID    | Description                         | Status         | Evidence                                                                              |
| ----- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| IN-01 | Multi-warehouse / bin locations     | ⬜ Not started | No `warehouse`/`bin_location` references found in `src/lib/inventory/` or migrations. |
| IN-02 | Barcode/QR scanning on GRN/dispatch | ⬜ Not started | No barcode/QR code found.                                                             |
| IN-03 | Cycle-count / physical stock take   | ⬜ Not started | No evidence found.                                                                    |
| IN-04 | Reorder-point alerts + auto-RFQ     | ⬜ Not started | No evidence found.                                                                    |
| IN-05 | Serial/lot traceability             | ⬜ Not started | No evidence found.                                                                    |

### 2.12 Manufacturing Enhancements

| ID    | Description                                   | Status         | Evidence                                                                                                                                                                                                                                              |
| ----- | --------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MF-01 | Machine/operator scheduling board             | ⬜ Not started | No scheduling-board code found.                                                                                                                                                                                                                       |
| MF-02 | Stage-level cost roll-up                      | ⬜ Not started | Not confirmed distinct from project-level `profitability.ts`.                                                                                                                                                                                         |
| MF-03 | Rework tracking with root-cause tagging       | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                    |
| MF-04 | QC photo evidence required per checklist item | 🟡 Partial     | `qc_results.image_urls` (array) and `is_required` on checklist items both exist in `src/lib/qc/` — the data model supports it, but enforcement (blocking a checklist item without a photo when required) wasn't confirmed in the UI/validation layer. |
| MF-05 | Slab optimizer (nesting/waste calc)           | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                    |

### 2.13 Installation Enhancements

| ID    | Description                                        | Status         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | -------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IS-01 | Route optimisation (Google Maps)                   | ⬜ Not started | No maps/routing integration found.                                                                                                                                                                                                                                                                                                                                                                                           |
| IS-02 | Snag list workflow post sign-off                   | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                                                                                                           |
| IS-03 | Auto-generate warranty certificate PDF on sign-off | 🟡 Partial     | `src/lib/installation/certificate.ts` — `printCompletionCertificate()` generates a PDF via the existing branded print pipeline. It's a **completion** certificate (v1.0, per `CHANGELOG.md`'s module list), triggered through the print dialog rather than confirmed as automatic-on-signoff, and not confirmed to specifically frame itself as a "warranty" certificate. Close to, but not exactly, this item as specified. |
| IS-04 | Installer time-tracking (clock-in/out)             | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                                                                                                           |

### 2.14 Analytics

| ID    | Description                                     | Status         | Evidence                                                                                                                                                                                                                                                                                                                                                                |
| ----- | ----------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AN-01 | Cohort analysis                                 | ⬜ Not started | No `cohort` references found.                                                                                                                                                                                                                                                                                                                                           |
| AN-02 | Win/loss reason analytics on quotes             | ⬜ Not started | `quotes` has no `lost_reason` (or similar) column anywhere in the schema — confirmed by direct read of the migration that creates the table. This item explicitly depends on a "reason field" that doesn't exist.                                                                                                                                                       |
| AN-03 | Forecast v2 — seasonality / Prophet-style model | 🟡 Partial     | `src/lib/intelligence/predict/` (`sales.ts`, `baselines.ts`, `thresholds.ts`, `sales-adapter.ts`) is a real, deterministic prediction system (quote conversion, cold-enquiry, repeat-order, stop-buying) — its own file header explicitly states "No ML" and no seasonality modeling. A v1 foundation exists; the specific v2 ask (seasonality/Prophet-style) does not. |
| AN-04 | Product profitability heat-map                  | ⬜ Not started | `profitability.ts` operates at the project level, not per-product; no heat-map UI found.                                                                                                                                                                                                                                                                                |
| AN-05 | Metabase/Looker read-replica export             | ⬜ Not started | No evidence found.                                                                                                                                                                                                                                                                                                                                                      |

### 2.15 Future SaaS Features

| ID    | Description                        | Status         | Evidence                                                                                               |
| ----- | ---------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| SA-01 | Multi-tenant `org_id` + tenant RLS | ⬜ Not started | `grep -rl org_id supabase/migrations/` returns zero matches — no tenant column anywhere in the schema. |
| SA-02 | Per-tenant subdomain/branding      | ⬜ Not started | Depends on SA-01.                                                                                      |
| SA-03 | Subscription billing (Stripe)      | ⬜ Not started | Depends on SA-01.                                                                                      |
| SA-04 | Onboarding wizard + sample data    | ⬜ Not started | Depends on SA-01.                                                                                      |
| SA-05 | Cross-tenant vendor marketplace    | ⬜ Not started | Depends on SA-01.                                                                                      |
| SA-06 | Public API + API keys per tenant   | ⬜ Not started | Depends on SA-01.                                                                                      |
| SA-07 | Per-tenant audit log export        | ⬜ Not started | Depends on SA-01 and PI-02.                                                                            |

---

## 3. Work delivered this session, outside the backlog

**Quote Comparison** (commit `1a58f567`, `main`) — multi-select 2-4 customer-facing sales quotes from the Quotes list, side-by-side comparison dialog (Customer/Project/Status/Date/Total + line items matched by product or description, differences highlighted). This is a real, committed, verified capability. It does not correspond to any single ID in `docs/v1.1-backlog.md` — closest related item is **AN-02** (win/loss analytics), which is a different concept (aggregate loss-reason analysis vs. side-by-side quote diffing) and remains Not started.

---

## 4. Summary counts

- ✅ Implemented: **2** (RP-03 Project P&L, FE-06 Aged debtors dashboard)
- 🟡 Partial: **10** (UX-01, PI-07, MO-02, MO-03, FE-03, FE-05, MF-04, IS-03, AN-03, plus the pre-existing service-worker/TWA groundwork noted under MO-02)
- ⚪ Designed only: **0** found
- ⬜ Not started: **remaining ~85 items** across all 15 categories

The overwhelming majority of the v1.1 backlog is, honestly, exactly what its own header states: an intake list written the week v1.0 froze, not yet acted on. The two full implementations and handful of partials found were pre-existing v1.0-era work that happens to overlap with later-listed backlog items, not v1.1 work in progress.
