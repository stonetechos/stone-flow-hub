# Production-Hardening Sprint — Final Report

**Date:** 2026-07-28
**Branch:** `feature/production-hardening-sprint` (off `main` @ `f329191`), **not pushed to `origin` yet** — see "Push authorization" below.
**Commits:** `e338566` (Goal 2), `1942433` (Goal 3), `edc59d9` (Goal 4), `a24e35d` (Goal 5), `e56645a` (Goal 6). 36 files changed, +1568/-218 lines.

This sprint covered 7 goals: production configuration, mobile compatibility, the notification system, Copilot search, voice capture, WhatsApp, and this report. Per the brief's constraints, nothing here redesigns the architecture or touches the Supabase project identity — every change extends the existing repository and existing tables/functions, or (for the notification centre) adds one new, clearly-marked-pending table.

---

## 1. Production configuration

**No code change required.** The Users & Roles "Missing SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY" error was already root-caused in `docs/sprint-2.0-production-recovery.md` from a prior session: it's a **Cloudflare Worker server-side env-var gap**, distinct from the client-side `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (which are fine — that's why the app loads and auth works). The Worker runtime needs plain `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` set in the Lovable Cloud deployment's environment, which `requireSupabaseAuth` middleware and `client.server.ts`'s `supabaseAdmin` read at request time — those were never populated on the current deployment target.

**This is still an open blocker** — it requires the Lovable dashboard, which this sandbox cannot reach (its outbound network proxy returns 403 for `erp.stonetech.in`, and I have no Lovable/Cloudflare credentials). The fix is: open the Lovable Cloud dashboard → Settings → confirm the project is still linked to the existing Supabase project (don't create a new one) → add the three server-side env vars under the deployment's environment configuration → redeploy. `/api/public/diagnostics/env-status` (already in the repo) will confirm once it's fixed — it reports which of the vars the Worker can see at runtime.

## 2. Mobile compatibility (commit `e338566`)

- Added `@capacitor/status-bar` and a new `configureStatusBarForEdgeToEdge()` helper (`src/lib/capacitor/status-bar.ts`), wired into `__root.tsx`, so the status bar overlays the WebView instead of pushing content down — required now that `android/variables.gradle` targets SDK 36 (Android 15+ forces edge-to-edge).
- Audited every `env(safe-area-inset-*)` usage and fixed the real gaps found: `VendorShell.tsx` had **zero** safe-area handling on its mobile header/main; `sheet.tsx`'s slide-out drawers and their close button didn't inherit inset padding; `sonner.tsx` toasts had no inset-aware offset; the Copilot floating action button and form action bars ignored the right/left insets on notched devices.
- No desktop regression: every change is an `env(safe-area-inset-*)` addition, which resolves to `0px` on non-notched/desktop viewports.
- **Verification gap, not a regression:** `npm run build:capacitor`'s SPA-prerender preview step hard-binds IPv6 `::`, which this sandbox rejects (`EAFNOSUPPORT`) — reproduces on unmodified `main` too. The real deployment build (`npm run build`, Cloudflare/Nitro target) builds cleanly in ~3.2s. On-device verification of edge-to-edge across Samsung/Xiaomi/Vivo/Oppo/Pixel/OnePlus needs an actual `npx cap sync android` + Android Studio build, which this sandbox cannot run.

## 3. Notification system (commit `1942433`)

- New `notification_tier` enum (`info` / `important` / `critical`) and `notifications` table — **migration is PENDING, not applied** (see `supabase/migrations/20260728120000_in_app_notifications_centre.sql`; apply it in the Lovable Cloud SQL editor the same way as every other migration this session prepares — see the migration-authorship split-brain note in section 8).
- Toasts (`sonner`) now auto-dismiss on a tier-based timer (info 4s / important 6s / critical 8s) — no `Infinity` duration anywhere, so nothing can block the UI indefinitely.
- The notification centre (bell + `/notifications` page) is now wired to real data — `listNotifications`/`markNotificationRead`/`subscribeToNotifications` (Realtime) — replacing the deleted `mock.ts`. Read notifications stay in the centre; nothing is deleted on read.
- Wired two real integration points as a working example: `setUserActive` and `resetUserPassword` (`lib/admin/users.functions.ts`) now call `notify(...)` after their existing audit-log calls.
- This is deliberately **distinct** from the pre-existing `notification_events`/`notification_deliveries` tables, which back outbound email/WhatsApp/SMS queueing (see Goal 6), not the in-app bell.
- Architecture is push-ready: `deliver_push` / `pushed_at` columns exist on the table today; no push provider is wired (that's a credentials/vendor decision outside this sandbox's authority), but nothing needs to change structurally to add one later.

## 4. Copilot / ERP search (commit `edc59d9`)

- Extended both search systems — the Cmd/Ctrl+K palette (`globalSearch()`) and Copilot's NL Ask mode (`resolveGeneric()`) — to cover RFQs, Tasks, Follow-ups, Notes (comments), Documents (file_objects), and Activities, on top of the Customers/Enquiries/Projects/Quotes/Orders/Vendors that already worked. That's the full 12-entity target list from the brief.
- Added 4 new few-shot examples to the NL classifier prompt for exactly the query patterns the brief named ("Pending quotations", "Open RFQs", "My tasks due this week", "Follow ups scheduled today for Mint Stone").
- Architecture unchanged: one LLM call still classifies intent only; every actual answer comes from a real, deterministic Supabase query. No new AI-generated-answer path was added — "the LLM understands, the ERP decides" holds for the new entities too.

## 5. Voice capture foundation (commit `a24e35d`)

- New `useSpeechCapture()` hook (`src/lib/voice/useSpeechCapture.ts`) wraps the browser's Web Speech API and feeds the transcript straight into Copilot's existing "Do" mode textarea — zero new parsing code, per the brief's explicit "do not hardcode parsing rules" instruction. The transcript flows through the **already-existing** VIE pipeline (LLM classification → Planner → Workflow Engine), which already handled Hindi/Gujarati/English/mixed *typed* text end-to-end before this sprint.
- Extended the fields VIE can extract and act on: `budgetInr`, `timelineRelativeDays` (converted deterministically to a delivery date — never LLM-computed), `requirements` for enquiries; `email`/`address` for new customers. These now flow all the way to `createEnquiry()`/`createCustomer()` — the same functions the manual forms call.
- **Named, not glossed over, limitation:** the Web Speech API recognizes one language per session (`en-IN` default, switchable to `hi-IN`/`gu-IN`) and does not reliably handle intra-sentence Hindi/Gujarati/English code-switching the way the LLM classifier already does for typed text. True robust code-switched voice transcription needs a server-side, audio-capable model (e.g. asking the Lovable AI Gateway for a multimodal model) — that's a credentials/cost decision this sandbox can't make unilaterally, so it's flagged here as the concrete next step rather than implemented.

## 6. WhatsApp foundation (commit `e56645a`)

- Extended the shared document engine (`lib/documents/engine.ts`) with a generic `renderDocWhatsAppText()` that turns any already-built document (estimate, quotation, sales order, purchase order, invoice, receipt, delivery challan) into a plain-text WhatsApp message, and a `toPhone` field alongside the existing `toEmail`.
- The shared "Send" dialog (`SendDocumentEmailDialog.tsx`, used by every document detail page via `DocumentToolbar`) now has an Email/WhatsApp tab. Both channels enqueue through the same `enqueueMessage()` already used for real WhatsApp sends (customer payment requests) — so every document type gets a real send path with no per-page wiring, and every send is logged to the Communication Timeline.
- Fixed the Estimate page's WhatsApp button, which research flagged as UI-only theater: it used to call `saveEstimateDocument()` (save a history row) then `navigator.clipboard.writeText()` — **never** a real send. It now also calls `enqueueMessage()`, so clicking Send actually queues a message; clipboard-copy is kept as a secondary convenience action.
- **Explicitly not done, flagged rather than silently skipped:**
  - **RFQ vendor notifications** — the research pass found RFQs have zero outbound notification of any kind today. Not touched this sprint; needs its own design pass (who gets notified, on what RFQ event, via which channel) rather than a bolt-on.
  - **WhatsApp Business template messages** — today's send is a free-form session message via the existing Meta Graph API dispatcher, which per WhatsApp policy only works if the customer messaged first within the last 24 hours. Proactive template messages (the more useful case for e.g. payment reminders) need pre-approved Meta templates — a product/ops decision, not a code change.

## Architecture decisions

- **No new send/parse/query systems.** Every goal extended an existing, single source of truth instead of adding a parallel one: notifications go through one `notifications` table and one `notify()` helper; WhatsApp/email both go through the one `enqueueMessage()` queue; search extensions live inside the existing `globalSearch()`/`resolveGeneric()` dispatchers; voice capture adds zero new parsing rules and defers to the existing VIE LLM classifier.
- **Migration-authorship discipline preserved.** The one new migration this sprint (`20260728120000_in_app_notifications_centre.sql`) is marked PENDING and left unapplied, per the established split-brain rule: this sandbox has no Supabase service-role key or DB URL for Lovable Cloud, so migrations authored here can only ever be prepared text, never applied. It must be pasted into the Lovable Cloud SQL editor by hand, same as the earlier GO-LIVE bundle.
- **Generated files never hand-edited.** Because the notifications migration isn't applied yet, `src/integrations/supabase/types.ts` has no `notifications` table entry. Rather than hand-edit that generated file, the two call sites that need it use a scoped `(x as any).from("notifications")` cast with an explanatory `eslint-disable-next-line` comment, to be removed once the migration is applied and Lovable regenerates the types.

## Remaining blockers (need a human with dashboard/credential access)

1. **Users & Roles / server env vars** — needs the Lovable dashboard (see section 1). Nothing further to prepare on the code side.
2. **Notification-centre migration** — needs to be applied via the Lovable Cloud SQL editor (see `supabase/migrations/20260728120000_in_app_notifications_centre.sql`). Until then, the notification bell/page degrade gracefully (empty state) rather than erroring.
3. **Push notifications** — needs a push provider decision (FCM/APNs credentials); the `notifications` table already has the columns for it.
4. **Voice code-switching** — needs a decision to add a server-side audio-capable model; not something this sandbox can provision.
5. **WhatsApp template messages** — needs Meta Business template approval; out of this sandbox's authority.
6. **RFQ notifications** — needs a short design pass before implementation (who/when/channel).
7. **Push authorization** — this branch is committed locally only. An earlier attempt to ask about pushing to `origin` failed (the confirmation tool errored out), so I defaulted to not pushing. **This is now a real question for you:** the branch `feature/production-hardening-sprint` has 5 commits of production-hardening work sitting locally in this sandbox — let me know if you'd like it pushed to `origin` (and whether you want a PR opened against `main`, or a direct push).

## Testing performed

- `npx tsc --noEmit` — clean after every commit, no exceptions.
- `npx eslint` on every touched file — zero errors after every commit (pre-existing warnings/errors in *untouched* files are explicitly out of scope baseline debt, not something introduced this sprint).
- `bun test` — **331 pass / 0 fail** maintained after every commit; assertion count rose from 683 to 698 as new code paths got exercised by existing tests, with no existing test broken.
- **Not run, and why:** `npm run build:capacitor` (sandbox IPv6 bind limitation, pre-existing, reproduces on unmodified `main`) and `npm run test:e2e` (missing `playwright` dependency in this sandbox, pre-existing). Neither reflects a problem with the code changed this sprint — both are documented as sandbox verification gaps, not passed-over regressions.

## Manual verification checklist (for you, once this reaches a real device/deployment)

- [ ] Apply `supabase/migrations/20260728120000_in_app_notifications_centre.sql` via the Lovable Cloud SQL editor, then confirm the notification bell shows real (not empty-state) data after a `notify()` call fires (e.g. deactivate a test user).
- [ ] Add the three server-side `SUPABASE_*` env vars in the Lovable deployment config, redeploy, and confirm Users & Roles loads without the "backend connection isn't fully configured" error.
- [ ] On a real Android device (ideally one of Samsung/Xiaomi/Vivo/Oppo/Pixel/OnePlus), confirm the status bar overlays the WebView correctly and no header/dialog/sticky-footer/floating-button overlaps a system bar; confirm no visual regression on a desktop browser.
- [ ] Open the notification bell and page; confirm toasts auto-dismiss on their tier's timer and never show a "stuck"/non-dismissing banner.
- [ ] In Copilot's Ask mode, try "Shiv", "Bopal", "Pending quotations", "Mint stone", "Open RFQs" and confirm each returns structured records (not a generic AI paragraph).
- [ ] Tap the mic button in Copilot, speak a short enquiry in English, confirm the transcript lands in the Do-mode textarea and the existing VIE flow still logs it correctly; then try a mostly-Hindi utterance and confirm you hit the known code-switching limitation described above (expected, not a bug to file).
- [ ] From any document detail page (estimate/quote/sales order/PO/invoice/receipt/delivery challan), open Send → WhatsApp tab, confirm the phone number prefills from the customer/vendor record and the message text is a sensible plain-text summary; send one to a real WhatsApp-linked number end to end and confirm it lands in the Communication Timeline.
- [ ] On the Estimate detail page, use the header "WhatsApp" button, confirm Send actually queues a message now (not just clipboard-copy).

---

*Prepared as part of the production-hardening sprint. See `docs/sprint-2.0-production-recovery.md` for the Users & Roles root cause, and the migration bundle docs (`engineering/migration-*`) for the unrelated, earlier migration split-brain crisis this repo also went through.*
