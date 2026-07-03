# Module 2 — Vendor Collaboration & Procurement

Additive extension of Module 1. Nothing existing changes structurally; new schema, new routes under a separate `_vendor` layout, plus internal comparison views inside existing RFQ pages.

## 1. Additive Database Migration

New enums, tables, and helper functions — **no** renames, drops, or column removals. All new tables follow the four-step pattern (CREATE → GRANT → ENABLE RLS → POLICY).

**New enum**
- `vendor_portal_role` (`vendor_owner`, `vendor_member`)
- `notification_event` (10 events listed in brief)
- `notification_channel` (`email`, `whatsapp`, `sms`, `push`) — future-ready
- `notification_status` (`pending`, `sent`, `failed`)

**New tables**
- `vendor_users` — links `auth.users` ↔ `vendors` with a portal role; a user can only belong to one vendor.
- `vendor_rfq_views` — one row per (rfq_vendor, user) with `viewed_at` for "unread" state and Vendor Viewed timeline event.
- `notification_events` — event ledger (event, entity, payload jsonb, actor, created_at). Written by triggers + server fns.
- `notification_deliveries` — one row per (event, channel, recipient) with status, provider_id, error, sent_at. Worker table for the delivery layer.
- `vendor_performance_cache` — nightly / on-write snapshot: avg_response_hours, avg_dispatch_days, completion_pct, delay_pct, purchase_value, approval_pct, last_order_at, last_rfq_at, score, is_preferred. Recomputed by a SECURITY DEFINER function called from triggers.

**Extend existing tables (additive columns only)**
- `rfq_vendors`: `first_viewed_at timestamptz`, `submitted_at timestamptz`, `revision_requested_at timestamptz`, `revision_note text`.
- `vendor_quotes`: `freight_amount numeric`, `dispatch_days int`, `gst_included boolean`, `stock_available boolean`, `quote_pdf_file_id uuid` (fk `file_objects`), `submitted_at`, `approved_at`, `rejected_at`, `revision_of uuid` (self-fk).

**Helper functions**
- `public.is_vendor_user(_user_id uuid, _vendor_id uuid) returns boolean` — SECURITY DEFINER, used inside vendor-scoped RLS to avoid recursion.
- `public.current_vendor_id() returns uuid` — reads vendor_users for `auth.uid()`.
- `public.recalc_vendor_performance(_vendor_id uuid)` — writes cache row.
- `public.log_notification_event(_event, _entity_type, _entity_id, _payload)` — inserts into `notification_events`.

**RLS**
- Staff (`has_staff_access`) keeps existing broad access on all new/extended rows.
- Vendor users: SELECT on their `rfqs`/`rfq_vendors`/`rfq_items`/`enquiries` (via `rfq_vendors.vendor_id = current_vendor_id()`), SELECT/INSERT/UPDATE their own `vendor_quotes` while `status in ('draft','submitted')` and `due_date >= today`, SELECT on `purchase_orders` where `vendor_id = current_vendor_id()`, SELECT on `dispatches` linked to their POs, SELECT on `file_objects` attached to any of the above (RLS via joins in policy).
- `vendor_users` self-read only, admin write.

## 2. Server Functions (`createServerFn` + `requireSupabaseAuth`)

Grouped by domain, each with Zod validators. All internal actions verify `has_staff_access`; vendor actions verify `current_vendor_id()`.

- `src/lib/vendor-portal/session.functions.ts` — `getVendorContext` (vendor id, role, company).
- `src/lib/vendor-portal/rfq.functions.ts` — `listVendorRfqs(filters)`, `getVendorRfq(id)`, `markRfqViewed(rfqVendorId)`.
- `src/lib/vendor-portal/quote.functions.ts` — `submitVendorQuote(input)`, `updateVendorQuote(id, input)`, `withdrawVendorQuote(id)`.
- `src/lib/vendor-portal/orders.functions.ts` — `listVendorOrders`, `getVendorOrder`, `listVendorDispatches`.
- `src/lib/procurement/comparison.functions.ts` — `getQuoteComparison(rfqId)` returns normalized rows w/ perf cache.
- `src/lib/procurement/decision.functions.ts` — `approveVendorQuote`, `rejectVendorQuote`, `requestQuoteRevision` (all emit notification events, log activity).
- `src/lib/procurement/performance.functions.ts` — `getVendorPerformance(vendorId)`, `recalcVendorPerformance(vendorId)`.
- `src/lib/notifications/events.functions.ts` — `listNotificationEvents`, `enqueueDelivery`.
- `src/lib/notifications/dispatcher.server.ts` — pure server module; email adapter (Brevo connector if present, else no-op logger) + registry (`channel → adapter`). Extensible for WhatsApp/SMS/push.

Vendor invitation: `src/lib/vendor-portal/invite.functions.ts` — `inviteVendorUser({vendorId,email})` uses `supabaseAdmin.auth.admin.inviteUserByEmail`, then inserts `vendor_users`. Staff/admin only.

## 3. Routes

**Internal (staff) — additions only, no Module 1 route removed**
- `/_authenticated/procurement/rfqs/$rfqId/compare` — Quote comparison screen with highlight chips (lowest price, fastest, best-rated, recommended), approve/reject/revise actions.
- `/_authenticated/procurement/vendors/$vendorId/performance` — perf dashboard using cache.
- `/_authenticated/procurement/notifications` — event ledger + delivery log (admin).
- `/_authenticated/vendors/$vendorId` — existing hub gains a "Portal Users" tab with invite form + `Preferred` badge from cache.
- Existing RFQ detail (`enquiries/$enquiryId` RFQ section) gets a "Compare Quotes" primary action linking to `/procurement/rfqs/$rfqId/compare`.

**Vendor portal — new layout `src/routes/_vendor/`**
Separate pathless layout with its own `beforeLoad` that redirects staff away and requires `current_vendor_id()`.
- `_vendor/route.tsx` — gate + shell (top bar, sidebar: Dashboard, RFQs, Orders, Dispatches, Profile).
- `_vendor/dashboard.tsx`
- `_vendor/rfqs/index.tsx` — inbox with search, filters, unread badge.
- `_vendor/rfqs/$rfqId.tsx` — RFQ detail, marks viewed on mount.
- `_vendor/rfqs/$rfqId.quote.tsx` — QuickForm (Quick Fill → More → Advanced) using existing `QuickForm`.
- `_vendor/orders/index.tsx` + `_vendor/orders/$id.tsx`.
- `_vendor/dispatches/index.tsx`.
- `_vendor/profile.tsx`.

**Auth** — reuse `/auth`. After sign-in, `AppShell` decides: if `vendor_users` row exists, redirect to `/_vendor/dashboard`; else `/dashboard`.

## 4. Components (reuse-first)

New (only where needed):
- `src/components/vendor-portal/VendorShell.tsx` — sidebar + top bar variant of `AppShell`.
- `src/components/procurement/QuoteComparisonTable.tsx` — comparison grid using `Table` primitives.
- `src/components/procurement/VendorPerformanceCard.tsx`.
- `src/components/vendor-portal/RfqInboxTable.tsx`.
- `src/components/notifications/EventList.tsx`.

Reused as-is: `QuickForm`, `SmartCombobox`, `DetailActionBar`, `FilePicker`/attachments, `TimelineFeed` (extended to render new procurement events via existing activity_log → new events also written via `log_activity`).

## 5. Notification Engine

- Domain code calls `logNotificationEvent(event, entityType, entityId, payload)` which inserts into `notification_events` and enqueues `notification_deliveries` rows for subscribed channels.
- `dispatcher.server.ts` exposes `sendPending()` (called from a server route `/api/public/cron/notifications` guarded by shared secret; also invocable from a manual "Retry" button in the admin ledger).
- Adapters: `emailAdapter` (Brevo connector when linked, otherwise writes `failed` with "no adapter"). WhatsApp/SMS/push adapters are stubs with a TODO.
- Templates keyed by event; simple `{{token}}` substitution — no third-party template engine.

## 6. Vendor Performance

Recomputed by triggers on `vendor_quotes`, `rfq_vendors`, `purchase_orders`, `dispatches`. Reads only from cache in UI to keep list pages fast.

## 7. Procurement Timeline

Reuses `activity_log`. Adds new `activity_action` values via a lookup only if enum extension is safe; otherwise inserts free-form `summary` rows. The timeline card on RFQ/PO pages filters activity_log for the entity chain (`enquiry → rfq → rfq_vendor → vendor_quote → purchase_order → dispatch`).

## 8. Milestones (pause after each for review)

1. **Schema + RLS** — migration only. Nothing UI. ← ship first.
2. **Vendor session + portal shell + dashboard + RFQ inbox/detail (read-only).**
3. **Vendor quote submission (QuickForm).**
4. **Internal Quote Comparison + approve/reject/revise + activity.**
5. **Vendor performance cache + UI cards.**
6. **Notification engine + email adapter + admin ledger + cron route.**
7. **Vendor orders/dispatches views + invitations UI.**

Each milestone ends with: build passes, tsgo clean, short status report (DB changes, routes, components, server fns, RLS, notification events, files touched, remaining milestones).

## Guarantees

- No Module 1 file removed, renamed, or business-rule changed.
- All migrations additive; no destructive SQL.
- Strict TS, Zod validators on every server fn, TanStack Query for reads/mutations, RLS on every new table.
- Vendor RLS uses SECURITY DEFINER helpers to prevent recursion and cross-vendor leaks.
