## Regression Verification Plan

Goal: verify no regressions after the `nav/preferences.ts` render-loop fix and the security-definer / RLS migration. No new features. Fix only regressions found.

### Phase 1 — Static checks
1. `tsgo` typecheck across the repo.
2. Production build (`bun run build`).
3. If either fails, fix ONLY the failing symbol/file and re-run before proceeding.

### Phase 2 — Signed-in end-to-end sweep (Playwright, headless, injected session)
For every module: navigate → wait for list → screenshot → assert no error boundary + no console error + key network calls 2xx. Open one detail row where a list exists; open the create route where one exists (submit only when idempotent — otherwise just assert the form renders).

Modules: Auth (login+logout), Dashboard, Executive Command Centre, Navigation (sidebar+breadcrumbs+Ctrl+K), Customers, Projects, Enquiries, Estimates, Quotations, Sales Orders, Purchase Orders, Delivery Challans (Dispatch), Inventory, Manufacturing, Installations, Invoices, Receipts, Payments, Vendor Payments, Workforce Intelligence, Reports, Activity log, Notifications bell, Sidebar preferences (pin/unpin + reload — the exact area we just patched), Role permissions (compare `<Can>` gates to `user_roles`).

Per-module shared assertions (skipped silently if not applicable): page loads, list query resolves, create/edit form routes render, delete confirm dialog opens (not confirmed), status transition menu opens, attachments/comments/timeline/print sub-panels mount, deep-link reload works on 3 nested detail routes.

**Console hygiene** — capture `page.on("console")` + `page.on("pageerror")` for every module and assert the browser console remains free of:
- Unhandled promise rejections
- React render warnings (`Warning:` from react-dom)
- Hydration mismatches
- Infinite render loops (`Maximum update depth exceeded`)
- Memory leak warnings (`Can't perform a React state update on an unmounted component`)
- Failed dynamic imports (`Failed to fetch dynamically imported module`)

Any new runtime console error originating from application code is treated as a regression. Ignore known Lovable Preview infrastructure warnings already documented (e.g. `RESET_BLANK_CHECK`, editor overlay noise).

### Phase 3 — Database trigger + data-integrity regression
Verify existing triggers still execute end-to-end (no schema changes, read-only checks):
- Estimate → Quote conversion
- Quote → Sales Order conversion
- Sales Order → Delivery Challan generation
- Delivery progress updates
- Inventory movement generation
- Installation status updates
- Activity log rows inserted per action
- Notification queue rows enqueued

Method: for each flow, drive one create/transition in a scratch record via Playwright (or `supabase--insert` where safe), then `supabase--read_query` the downstream table + `activity_log` + `notification_queue`/`message_queue` to confirm rows appeared with correct linkage. Read-only assertions only; no schema edits.

**Data integrity after every transition** — for each workflow above, run targeted `supabase--read_query` checks and confirm:
- No duplicate records (source row still unique on natural key)
- No orphaned child records (every child row's FK resolves to a parent)
- No duplicate `activity_log` entries (same `entity_type` + `entity_id` + `action` + `actor_id` within the transition window)
- No duplicate notifications (`notification_deliveries` / `message_queue` unique per `event_id` + recipient)
- No duplicate inventory movements (unique per source doc line)
- No duplicate `dispatch_items` per sales-order line
- Foreign-key relationships remain valid (no dangling `*_id` after transition)

Any duplicate or orphaned row surfaced by these queries is a regression.

### Phase 4 — Dashboard widget resilience audit
For every widget rendered on `/dashboard` and `/executive` (StatRow tiles, TaskChecklist, ActivityTimeline, WorkforceSummaryWidget, BusinessInsightsCard, LeadPipelineWidget, ChartCards, Copilot):
- Empty dataset → renders EmptyState, not blank/crash
- Permission denied (RLS) → renders ErrorBlock, not thrown boundary
- Slow network (throttled) → renders LoadingBlock, no hydration mismatch
- Null values in payload → no `Cannot read properties of null`
- Zero counts → renders "0" / neutral state, not NaN / `—` inconsistently

Any widget that crashes the page is a regression: wrap the specific widget's query in an inline `ErrorBlock` + EmptyState fallback. No new features.

### Phase 5 — Reporting
Report ONLY evidence-based regressions (route crash, list query failure, console error, 4xx/5xx on core reads, hydration mismatch, missing trigger side-effect, duplicate/orphan row, widget crash). For each: file + symptom + minimum fix. Apply fixes one at a time, re-run the affected script segment, then re-run typecheck + build.

At the end, produce a Production Readiness Score based strictly on observed evidence from Phases 1–4:
- Functional Stability /100
- Security /100 (from latest scan results + RLS/GRANT audit)
- Performance /100 (from build size + slow-query snapshot)
- UX Consistency /100 (error/empty/loading states + design tokens)
- Database Integrity /100 (trigger sweep + linter + duplicate/orphan checks)
- Workflow Reliability /100 (module sweep pass rate)
- Overall Production Readiness /100 (weighted composite)

Followed by:
- Remaining High Priority Issues
- Remaining Medium Priority Issues
- Remaining Low Priority Issues

No invented issues — every entry cites the failing route/file/query/log line.

### Out of scope
- No schema changes, no new RLS policies, no new features, no visual polish.
- No touching security findings already handled.

### Deliverable
Either "All green" with the readiness scorecard, or a bullet list of regressions with the minimal patch applied for each, plus the scorecard and prioritized remaining-issues list.
