# VIE Foundation Sprint — Final Report

**Date:** 2026-07-28
**Branch:** `feature/production-hardening-sprint` (continuing the same unpushed local branch as the prior production-hardening sprint — see "Push authorization" below; not a new branch, no instruction to start one)
**Scope:** Foundation only, per the brief. No speech recognition, no message parsing, no OCR extraction logic was implemented — only reusable models, interfaces, and registries.

This sprint changes STOS's long-term AI architecture direction: instead of continuing to bolt isolated AI features onto individual modules, it lays the foundation of the **Vedora Intelligence Engine (VIE)** as a cross-cutting platform layer. Five components were built:

1. VIE Event Bus
2. Business Intent Model
3. Universal Entity Resolver (wired into Copilot)
4. Notification Architecture (channel abstraction)
5. Mobile Safe Area (completion of the prior sprint's audit)

---

## 1. VIE Event Bus

**File:** `src/lib/vie/eventBus.ts` (+ `eventBus.test.ts`, 8 tests)

A central, in-process event dispatcher. Every ERP module — today, specifically `workflowEngine.ts` — can publish structured events; future subscribers (analytics, the notification centre, a future audit stream) attach without the publisher knowing or caring who's listening.

```ts
interface VieEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  occurredAt: string;   // ISO timestamp
  source: string;       // "workflowEngine.executeAction", etc.
  correlationId?: string;
}
```

- `vieEventBus.on(type, listener)` / `.onAny(listener)` — subscribe to one event type or every event.
- `vieEventBus.publish(event)` — fire-and-forget. A throwing or rejecting listener is caught and logged (`console.error`), never propagated — one bad subscriber can never break the publisher's own control flow. This is the single most important contract of the bus and is what makes it safe to wire into `workflowEngine.ts`'s write path.
- `vieEventBus.publishAndWait(event)` — awaits all listeners, still swallowing individual failures; for callers that need to know delivery finished (tests, a future outbox drain) without caring whether every listener succeeded.
- `VIE_EVENTS` — the two events wired this sprint: `vie.action.executed`, `vie.action.failed`. `notification.created` is reserved for a future direct bus-to-notification wiring (not done this sprint — the notification centre still runs on its own Supabase Realtime subscription, which is a different, already-working delivery path; see §4).

**No business logic lives in the bus.** It does not know what a "customer" or a "quotation" is — it moves typed envelopes between publishers and subscribers and nothing else.

**Wired into:** `workflowEngine.ts` — after a successful `executeAction()`, publishes `vie.action.executed` with `{actionId, intent, linkedRecordType, linkedRecordId}`; on failure, publishes `vie.action.failed` with `{actionId, intent, message}`. Purely additive — no change to `executeAction()`'s control flow, return values, or database writes. There are no subscribers registered yet; this sprint's job was the publish side existing and being safe to call, not consuming it.

**Known limitation, stated rather than hidden:** the app runs on Cloudflare Workers (per-request execution, not a long-lived process), and the bus is in-memory, single-process. It has no cross-request delivery and does not survive a Worker instance recycling. A subscriber registered in one request will never see an event published in another. This is fine for this sprint's synchronous, same-request use (workflowEngine → bus → any same-request listener) but means the bus is not, by itself, a mechanism for background fan-out — that would need a durable queue (Cloudflare Queues, or writing to a table and polling/realtime, the same pattern the notification centre already uses). Documented in the file's own header comment so a future author doesn't reach for this expecting cross-request delivery.

---

## 2. Business Intent Model

**File:** `src/lib/vie/businessIntent.ts` (+ `businessIntent.test.ts`, 13 tests)

A reusable, source-independent structure for "what a person meant," decoupled from how it was captured. Every field is optional (`Partial`-shaped by construction) because no capture source ever extracts everything at once.

```ts
interface BusinessIntent {
  customer?: { name?; mobile?; company? };
  project?: { name?; city?; siteAddress? };
  requirements?: { description?; category? };
  products?: Array<{ name?; quantity?; unit?; specifications? }>;
  measurements?: Array<{ label?; value?; unit? }>;
  budget?: { amount?; currency?; isEstimate? };
  timeline?: { requestedDate?; urgency? };
  tasks?: Array<{ title?; dueDate?; assignee? }>;
  followUps?: Array<{ note?; dueDate? }>;
  documents?: Array<{ label?; url?; kind? }>;
  actions?: Array<{ type?; targetEntity?; targetId? }>;
  sourceModality: "voice" | "text" | "whatsapp" | "email" | "ocr";
  sourceRef?: string;
  extractedAt: string;
  confidence?: number;
}
```

Every nested section listed in the brief is present: Customer, Project, Requirements, Products, Measurements, Budget, Timeline, Tasks, Follow-ups, Documents, Actions. All Zod schemas, matching the codebase's existing `types.ts` conventions (`logEnquiryEntitiesSchema`, etc.) — `businessIntentSchema` validates the whole structure.

**Source adapter registry** — same Map-based pattern as `actions/registry.ts`:

```ts
interface BusinessIntentSourceAdapter {
  source: BusinessIntentSourceModality;
  extract(raw: unknown): Promise<Partial<BusinessIntent>>;
}
registerBusinessIntentSourceAdapter(adapter);
getBusinessIntentSourceAdapter(source);
```

- **`text` adapter: real, implemented.** Takes a plain string, does simple deterministic parsing (no LLM call) for the parts that don't need one — this is plumbing, not extraction intelligence.
- **`voice`, `whatsapp`, `email`, `ocr` adapters: registered stubs.** Each throws `BusinessIntentSourceNotImplementedError` — a distinctive, catchable error, not a silent no-op or a fake success. This is the literal enforcement of "do not implement speech recognition yet" — the slot exists, calling it tells you plainly that it doesn't do anything yet, and a future sprint fills in one adapter at a time without touching the model or the other adapters.

**Mapping functions** — `toCreateCustomerEntities`, `toLogEnquiryEntities`, `toCreateQuotationEntities`, `toNoteFollowupEntities` — convert a `BusinessIntent` into each of the four existing VIE Planner entity shapes (`workflowEngine.ts`'s existing per-intent schemas). These are the seam a future Planner change would use to go from "generic extracted intent" to "this specific action's typed input" — not wired into the Planner itself this sprint (out of scope: that would mean deciding when a BusinessIntent becomes a VIE action, which is downstream product decision-making, not foundation).

---

## 3. Universal Entity Resolver

**File:** `src/lib/vie/universalEntityResolver.ts` (+ test, 9 tests)

One reusable, typed cross-entity search covering exactly the 12 types named in the brief: Customers, Projects, Enquiries, Quotes, Invoices, Sales Orders, RFQs, Vendors, Tasks, Activities, Comments, Documents.

```ts
interface UniversalEntityResult {
  type: UniversalEntityType;  // one of the 12
  id: string;
  label: string;
  subtitle?: string | null;
  route: string;
  updatedAt?: string | null;
  raw?: unknown;              // escape hatch to the underlying row
}

resolveUniversalEntitiesByType(type, query, limit?): Promise<UniversalEntityResult[]>
resolveUniversalEntities(query, { types?, limitPerType? }): Promise<UniversalEntityResult[]>
```

**Why this doesn't become a third, competing search system:** the codebase already had two — `globalSearch()` (21 groups, raw inline Supabase queries, powers the Cmd/Ctrl+K palette) and `nl-search/resolve.ts` (16 types, calls existing module `list*()` functions, powers Copilot's Ask mode, has real business filtering). This resolver sits *underneath* both, as the plain "does anything match this text" layer neither needs to re-declare:

- 9 of the 12 types (customer, project, enquiry, quote, invoice, sales_order, rfq, vendor, task) call the exact same `list*()` functions `nl-search/resolve.ts` already called — no new query logic, just a shared typed shape around an existing authoritative function.
- The 3 polymorphic types (activity, comment, document) — previously inline-duplicated inside `globalSearch()` — were extracted into shared, exported functions in `search/api.ts` (`fetchActivityHits`, `fetchCommentHits`, `fetchDocumentHits`); `globalSearch()` itself now calls these same functions instead of its old inline code, and this resolver adapts their output.
- Every type is error-isolated: one table erroring never takes down the other 11 (`resolveUniversalEntitiesByType` catches and returns `[]`), same discipline `notify.server.ts` already uses for "a secondary/audit write must never break the primary action."

**"Copilot must use this resolver"** — `nl-search/resolve.ts` was refactored:

- `case "vendor"`, `case "rfq"`, `case "task"` now delegate to `resolveUniversalEntitiesByType()` instead of their own inline `list*()` + map blocks, with their existing business-filter logic (status mapping, etc.) preserved by filtering client-side over the resolver's `raw` field.
- Three brand-new cases were added — `case "comment"`, `case "document"`, `case "activity"` — giving Copilot's Ask mode genuine new capability it never had before this sprint (it could not previously answer "find the note about..." or "show documents for..."). `NlEntityType` gained these three members; `SEARCH_GROUP_TO_ENTITY` and the `ENTITY_NAV_ID`/`ENTITY_DETAIL_PATH` total records were extended to match, or the file would no longer compile as a total mapping — confirmed via `tsc --noEmit`.

**Deliberately not migrated:** `globalSearch()`'s other 9 groups (contacts, salespeople, architects, payments, dispatch, inventory, purchase orders, products) stay outside this resolver's scope — they're outside the 12-type list the brief named, and migrating the widely-used command palette's remaining groups was not requested. Stated as a deliberate, known gap rather than a silent one.

---

## 4. Notification Architecture

**Files:** `src/lib/notifications/channels/{types,desktop,android,push,registry,dispatch}.ts` (+ `channels.test.ts`, 16 tests)

The three-tier notification system (`info`/`important`/`critical`) already existed from the prior sprint (`tiers.ts`, `notify.server.ts`, `centre.ts`, `NotificationsBell.tsx`) and already satisfied "critical notifications remain in the centre but never permanently block the interface" — every tier auto-dismisses (`TIER_TOAST_DURATION_MS`, 4s/6s/8s, never `Infinity`). This sprint's job was the piece that didn't exist: **channels**.

```ts
interface NotificationChannel {
  id: "desktop" | "android" | "push";
  label: string;
  isAvailable(): boolean;
  deliver(payload: ChannelNotificationPayload): void | Promise<void>;
}
```

Map-based registry (`registry.ts`, same pattern as `actions/registry.ts`), with three channels pre-registered:

- **`desktop` — real, implemented.** Thin wrapper over the existing `notifyToast()` (sonner). Available whenever `window` exists.
- **`android` — prepared, not implemented.** `isAvailable()` is a real, working check (`Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android"` — the same primitive `status-bar.ts` already uses). `deliver()` throws `NotificationChannelNotImplementedError` — a real native local-notifications channel needs a plugin (`@capacitor/local-notifications`), OS-level permission prompts, and a notification-importance channel setup this sprint was not asked to build.
- **`push` — prepared, not implemented.** `isAvailable()` checks for `PushManager` + an active service worker (real today — `register-service-worker.ts` already registers `/sw.js`). `deliver()` throws the same not-implemented error — a working push channel needs a VAPID key pair, a server-side subscription store, and a `push` handler in the service worker. `notify.server.ts`'s pre-existing `deliverPush?: boolean` field on `NotifyInput` is exactly the intended future hook for this channel once it's real.

`dispatchToChannels(payload, channelIds?)` fans a notification out across every available registered channel, isolating failures per channel (an unimplemented stub's error is expected and swallowed silently; any other channel's failure is logged but never blocks a sibling channel).

**Two real behavior changes wired this sprint, closing gaps identified during the audit, not hypothetical ones:**

1. **The toast-on-insert gap.** Previously, a new row landing in `public.notifications` only ever refreshed the bell's popover list via query-cache invalidation — a user not actively looking at the bell had no way to notice a new notification as it happened. `subscribeToNotifications()` (`centre.ts`) now passes the mapped `CentreNotification` through to its callback (was `() => void`, now `(n: CentreNotification) => void` — additive, the one other call site in `notifications.tsx` already ignored its argument and needed no change). `NotificationsBell.tsx` now calls `dispatchToChannels()` for every new insert, so a live toast fires through the Desktop channel today, and will automatically start firing through Android/Push the moment those channels go from stub to real — no further wiring needed there when that happens.
2. **The one genuinely intrusive notification in the app.** `register-service-worker.ts`'s "Update available" toast used `duration: Infinity` — the single place in the codebase that violated the "no persistent blocking banners" principle the tier system otherwise enforces everywhere. Changed to a bounded `20_000`ms (`tiers.ts`'s own header comment already documents why nothing in this system should ever use `Infinity` — "critical items are also durably written to the notification centre, so nothing is lost when the toast times out"; this toast doesn't have a centre entry to fall back on since it's a client-only PWA event, so it gets a longer window — 20s vs. `important`'s 6s — but it now always goes away).

---

## 5. Mobile Safe Area

**File changed:** `src/routes/_authenticated/dashboard.tsx`

The prior sprint's audit had confirmed one remaining gap: the dashboard's Quick-create floating pill bar (`fixed inset-x-0 bottom-4`) had zero safe-area handling — on an Android 15 edge-to-edge device (forced by `android/variables.gradle`'s `targetSdkVersion`/`compileSdkVersion` 36) it would sit flush against the gesture/3-button nav bar with no clearance.

Fixed by making the existing `bottom-4` (1rem) offset the *floor*, with the safe-area inset added on top — the same additive pattern `Copilot.tsx`'s floating action button already uses (`bottom-[calc(1.25rem+env(safe-area-inset-bottom))]`):

```diff
- className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
+ className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3"
```

**Full re-audit this sprint** (not just the one known gap) — every `fixed`/`sticky` element in `src/components` and `src/routes` was enumerated and checked:

| Element | Status |
|---|---|
| Dashboard Quick-create bar | **Fixed this sprint** (above) |
| `Copilot.tsx` floating trigger | Already correct (prior sprint) |
| `FormLayout.tsx` sticky action bar | Already correct — full `env()` on bottom + left/right (prior sprint) |
| `dialog.tsx` / `sheet.tsx` / `alert-dialog.tsx` / `drawer.tsx` overlays & content | Already correct — each has its own inset-aware padding (prior sprint) |
| `sidebar.tsx` fixed desktop rail (`md:flex`, hidden below `md`) | No safe-area needed — desktop-only, not rendered on mobile viewports |
| `table.tsx` / `rfqs/$rfqId.tsx` `sticky top-0` table headers | No safe-area needed — sticky relative to their own scroll container, not the physical device edge; the page's outer header above them already reserves `safe-area-inset-top` |
| `vendor/rfqs/index.tsx` sticky filter bar | Same as above — nested sticky, not edge-anchored |
| `vendor/rfqs/$rfqId.tsx` sticky bottom action row | Already correct — has `pb-[max(0.75rem,env(safe-area-inset-bottom))]` |
| `ViewportDebugPanel.tsx` fixed debug overlay | Out of scope by design — `import.meta.env.DEV`-gated, never ships to production |

**No desktop regression:** every change here is an `env(safe-area-inset-*)` *addition* inside a `calc()`/`max()` — it resolves to `0px` on any non-notched or non-native viewport (any desktop browser, any plain mobile browser tab), so desktop and ordinary web-mobile rendering is byte-identical to before.

---

## Files changed

**New files (13):**
- `src/lib/vie/eventBus.ts`, `src/lib/vie/eventBus.test.ts`
- `src/lib/vie/businessIntent.ts`, `src/lib/vie/businessIntent.test.ts`
- `src/lib/vie/universalEntityResolver.ts`, `src/lib/vie/universalEntityResolver.test.ts`
- `src/lib/notifications/channels/types.ts`
- `src/lib/notifications/channels/desktop.ts`
- `src/lib/notifications/channels/android.ts`
- `src/lib/notifications/channels/push.ts`
- `src/lib/notifications/channels/registry.ts`
- `src/lib/notifications/channels/dispatch.ts`
- `src/lib/notifications/channels/channels.test.ts`

**Modified files (8):**
- `src/lib/vie/workflowEngine.ts` — publishes `VIE_EVENTS.ACTION_EXECUTED`/`ACTION_FAILED`
- `src/lib/search/api.ts` — extracted `fetchCommentHits`/`fetchDocumentHits`/`fetchActivityHits`, `globalSearch()` now calls them
- `src/lib/ai/nl-search/types.ts` — `NlEntityType` gains `comment`/`document`/`activity`
- `src/lib/ai/nl-search/resolve.ts` — `vendor`/`rfq`/`task` delegate to the Universal Entity Resolver; `comment`/`document`/`activity` cases added; `SEARCH_GROUP_TO_ENTITY`/`ENTITY_NAV_ID`/`ENTITY_DETAIL_PATH` extended
- `src/lib/notifications/centre.ts` — `subscribeToNotifications()` now passes the inserted row through
- `src/components/global/NotificationsBell.tsx` — dispatches a live toast via `dispatchToChannels()` on new inserts
- `src/lib/pwa/register-service-worker.ts` — removed the one `duration: Infinity` toast
- `src/routes/_authenticated/dashboard.tsx` — Quick-create bar safe-area fix

**318 insertions / 109 deletions across modified files; ~1,750 new lines across the 13 new files (including tests).**

---

## Tests executed

```
npx tsc --noEmit         → clean, 0 errors
npx eslint <changed dirs> → 0 errors (1 pre-existing warning in NotificationsBell.tsx, unrelated to this sprint's changes — an exhaustive-deps hint on a `now = new Date()` that predates this work)
bun test                 → 376 pass, 0 fail, 774 expect() calls, across 28 files
```

New test files and counts: `eventBus.test.ts` (8), `businessIntent.test.ts` (13), `universalEntityResolver.test.ts` (9), `channels.test.ts` (16) — 46 new tests. The remaining 330 are the pre-existing suite, reconfirmed green after every change in this sprint (no regressions).

Every new test file follows the repo's mandatory `bun:test` `mock.module()` discipline (`testSupport/moduleMocks.ts`'s "spread real exports, override only what's needed" pattern) — reusing the shared mocks for the 8 already-mocked specifiers, and registering new file-scoped mocks only for specifiers grep-confirmed unmocked elsewhere (`@/lib/rfqs/api`, `@/lib/vendors/api`, `@/lib/tasks/api`, `@/lib/search/api` for the resolver tests; `@/lib/notifications/toast`, `@capacitor/core` for the channel tests).

---

## Validation report

- **Type safety:** `tsc --noEmit` clean against the full, unmodified `strict` config — no `any` introduced beyond the two pre-existing, already-documented casts in `notify.server.ts`/`centre.ts` (unrelated to this sprint, predates it — the pending `notifications` table migration).
- **No regressions:** full `bun test` suite (376 tests) passes; the two "error" lines visible in `bun test` output (`eventBus.test.ts`'s throwing-listener test, `admin/server-auth.test.ts`'s super-admin-migration-pending warning) are both expected, intentional `console.error`/`console.warn` calls asserted on by their own tests, not failures — both pre-date or are directly tested by this sprint's own suite.
- **No new database migrations.** Every component this sprint built is pure application code — the Event Bus is in-memory, the Business Intent Model and Universal Entity Resolver read through existing tables via existing `list*()` functions, the notification channel registry has no schema of its own (it reads/writes nothing — `notify()`/`centre.ts` already own the `notifications` table, unchanged by this sprint).
- **No breaking API changes.** Every existing exported function's signature is either unchanged or changed additively (`subscribeToNotifications`'s callback gaining an argument is the only signature change in the entire sprint, and it's backward-compatible — a callback that ignores the new argument still type-checks and behaves identically).
- **Screenshots — not produced, and here's why rather than a silent gap:** every UI-visible change this sprint (the Quick-create bar's safe-area offset, the toast timing change) depends on either `env(safe-area-inset-bottom)` resolving to a non-zero value (only true on an actual notched/gesture-nav device or a real iOS/Android WebView — a desktop browser screenshot from this sandbox would render byte-identical before/after, since the env() term is 0 here) or on a toast auto-dismiss timer (not meaningfully capturable as a static image). The prior sprint's own final report hit this identical limitation for the same category of change and documented it the same way: on-device verification needs `npx cap sync android` + an Android Studio build, or a real deployed URL opened on a physical/emulated notched device — neither of which this sandbox has access to. The dashboard.tsx diff above is the verifiable artifact in place of a screenshot.

---

## Deliberately not done this sprint (foundation-only scope)

Per the brief, extraction intelligence was explicitly excluded — these are the concrete things NOT built, so a future sprint knows exactly where this one stopped:

- No speech-to-text / voice adapter implementation (stub only, throws `BusinessIntentSourceNotImplementedError`)
- No WhatsApp/email message-parsing adapter implementation (stubs only, same error)
- No OCR adapter implementation (stub only, same error)
- No Event Bus subscribers registered — the publish side exists and is safe to call; nothing listens yet
- No Planner wiring from `BusinessIntent` → VIE actions — the mapping functions exist (`toCreateCustomerEntities` etc.) but nothing calls them yet
- No Android native local-notifications plugin, no Web Push subscription flow — both channels are real `isAvailable()` checks + a distinctive not-implemented error on `deliver()`
- No migration of `globalSearch()`'s remaining 9 groups to the Universal Entity Resolver (contacts/salespeople/architects/payments/dispatch/inventory/purchase-orders/products) — outside the 12-type list named in the brief

---

## Push authorization

Per the brief: **local commits only, do not push.** This sprint's commit(s) sit on top of the prior production-hardening sprint's unpushed commits on `feature/production-hardening-sprint` (still awaiting the user's separate, earlier push confirmation for that work). Nothing in this sprint has been pushed to `origin`, and nothing will be until explicitly requested.

**Stopping here for review, per the brief's explicit instruction.**
