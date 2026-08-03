
# STOS — Production Gap Audit & Remediation Roadmap

Read-only scan of routes, components, server functions, styling tokens, docs and live runtime errors. No code was changed.

Headline: the codebase is in far better shape than a typical pre-1.0 ERP — 0 TODO/FIXME markers, lint debt formally resolved, design-token migration ~99% complete (13 raw-colour hits total). The real gaps are **reachability** (finished features nobody can navigate to), **one platform-level deployment defect**, and **an entire UX phase whose primitives were built but never adopted**.

---

## 1. Critical Production Bugs

| # | Finding | Evidence |
|---|---|---|
| C1 | **Custom domain `erp.stonetech.in` has no runtime env bindings.** All five diagnostics flags false; `*.lovable.app` returns true. Every server function (Users & Roles, AI, VIE, notifications, payments) is dead on the customer-facing domain. | Prior verification; unchanged |
| C2 | **Hydration mismatch on `/auth`.** SSR emits the `States.tsx` loading shell, client renders `auth.tsx:94` `<main>`. React discards and re-renders the whole sign-in tree — visible flash, and it is the first screen every user sees. | Live runtime error |
| C3 | **`CRON_SECRET` does not exist.** Five cron/webhook endpoints under `src/routes/api/public/hooks/*` (daily digest, payment reminders, dispatch queue, workforce daily, WhatsApp) reject or run unauthenticated. Scheduled automation is effectively off. | Secret store |
| C4 | **Dual payment read paths.** `listPayments()` (`src/lib/payments/crud.ts:44`) is `@deprecated` — reads only the legacy `payments` table, excludes receipts — but still backs the payment detail/edit routes. Detail view can disagree with the register. | Code |

C1 is platform-side and cannot be fixed from the project. C2–C4 are ours.

## 2. Missing Implementations

**Finished features with no way to reach them:**

| Route | Status |
|---|---|
| `/communication` | 1 inbound link only, not in nav |
| `/notifications` | **zero** inbound links, not in nav |
| `/message-templates` | 1 inbound link, not in nav |
| `/notification-settings` | 3 inbound links, not in nav |
| `/dashboards/executive` | **orphaned** — not in nav, not in the `/dashboards` index tile grid |
| `/dashboards/command-center` | **orphaned** |
| `/dashboards/control-centre` | **orphaned** |

The `/dashboards` index lists 25 of its 28 sibling pages; three built dashboards — including the Executive and Command Center surfaces from Phase G — were never added to the tile array (`dashboards/index.tsx:28-179`).

**Components built but never imported anywhere:**
`SmartInputs.tsx` (the entire Phase 1 UX primitive set), `use-unsaved-changes.ts`, `KpiTile`, `LeadPipelineWidget`, `WorkforceSummaryWidget`, `FiltersPanel`, `CommentsPanel`, `EntityTags`, `ActionChip`, `AddressBlock`, `AllocationTable`, `MiniTable`.

`docs/ux-audit-phase-1.md:92` states this outright: *"The new primitives are additive; nothing in the app imports them yet."* Phases 2–4 of that audit were never executed.

**Server functions:** none orphaned. All `*.functions.ts` exports trace to a caller. This layer is clean.

**Backlog:** `docs/IMPLEMENTATION_STATUS.md` audits `v1.1-backlog.md` across 15 categories — the large majority are Not Started, with partials at UX-01 (command palette lacks pg_trgm scaling), PI-07 (hover prefetch), MO-02/03 (PWA scaffolding not module-specific), FE-03/FE-05 (reminders/cheques). That doc also flags a naming trap: `src/lib/quotes/comparison.ts` is vendor-RFQ comparison, not customer-quote comparison.

## 3. UI/UX Polish

- 13 remaining hardcoded colour utilities, concentrated in `dispatch/$id.print.tsx`, `AppShell.tsx`, `InsightCard.tsx`, `BusinessInsightsCard.tsx` (2 each), then singles in `auth.tsx`, `dashboard.tsx`, `procurement-health.tsx`, `NotificationsBell.tsx`, `RfqVendorRecommendations.tsx`, and two shadcn primitives.
- From the Phase 1 UX audit, still unaddressed across ~40 create/edit forms: validation surfaces only on submit; phone/GST/PAN/pincode accept unsanitised input; **save buttons do not disable during mutation — duplicate submissions were observed**; dialogs discard input on backdrop click; no ⌘/Ctrl+Enter submit.
- `/dashboards` is a flat 28-tile grid with no grouping — hard to scan.

## 4. Performance

- 28 dashboard routes each own their query set with no shared prefetch or cross-route cache reuse.
- Hover/intent prefetch (PI-07) only partly enabled.
- Global search has no pg_trgm index backing (UX-01), so it degrades as tables grow.
- SSR is disabled per-route (`ssr: false`) on dashboards and `/auth`; correct for auth-gated data, but it means no server-rendered first paint anywhere in the app.

## 5. Mobile

- The viewport-overflow debug panel (`ViewportDebugPanel.tsx`) is still mounted in `__root.tsx` — diagnostic scaffolding shipped to production.
- MO-02/MO-03: PWA + Capacitor shells exist, but no module has a mobile-specific layout; wide data tables on the 28 dashboards and all list pages are horizontal-scroll only.
- Sign-in hero is correctly hidden below `md`; the hydration bug (C2) hits mobile hardest on slow connections.

## 6. Accessibility

Never formally swept — the Phase 1 audit lists it as deferred work. Known exposures: toast-only validation feedback with no `aria-live` association to fields, dialogs relying on shadcn defaults without audited focus-return, icon-only buttons across toolbars and `RowActions` needing label verification, and colour-carried status meaning in pills/badges with no text or icon redundancy.

## 7. Deferred Architecture

- Phase G Executive Intelligence: the engine exists (`src/lib/insights/executive/*`, `src/lib/intelligence/predict/*`) but its two flagship surfaces are unreachable (see §2).
- Predictive framework covers Sales only; `ops.ts`, `finance.ts`, `procurement.ts`, `customer.ts` predictors are designed but unwritten.
- Nav preferences are localStorage-only — no cross-device sync.
- `docs/CI_LINT_DEBT.md` is resolved but its 315-file prettier appendix is stale and misleading; should be trimmed.

---

# Prioritized Roadmap

Credits are estimates for this project's file sizes and review overhead.

### WP1 — Stop the bleeding · ~6–9 credits
1. Fix `/auth` hydration mismatch (C2) — align the SSR fallback with the client shell.
2. Remove `ViewportDebugPanel` from `__root.tsx`.
3. Reconcile the payment read path (C4) — point detail/edit at the register source or document the divergence in-code.
4. Generate and bind `CRON_SECRET` (C3), then confirm each of the five hook endpoints authenticates.

C1 remains blocked on Lovable backend engineering; keep production traffic on `stone-flow-hub.lovable.app`.

### WP2 — Make finished work reachable · ~5–8 credits
Add the three orphaned dashboards to the `/dashboards` tile grid; add `communication`, `notifications`, `message-templates`, `notification-settings` to `NAV_ITEMS` under a **Communication** group (or fold them into Settings as explicit sub-links). Group the 28 dashboard tiles by domain.

This is the highest value-per-credit item in the audit — it ships already-paid-for features.

### WP3 — UX Audit Phases 2–3 · ~25–40 credits
Migrate forms to `SmartInputs` + `use-unsaved-changes`: inline validation, input masking for phone/GST/PAN/pincode, **disable-on-submit everywhere**, backdrop-click guard, ⌘/Ctrl+Enter. Largest package by far; recommend slicing by module (Sales forms → Procurement → Masters) so each slice ships independently.

### WP4 — Token & polish sweep · ~3–5 credits
Clear the 13 remaining raw colour hits; decide per-case whether each is an intentional print/brand exception and annotate it.

### WP5 — Accessibility sweep · ~12–18 credits
Keyboard traversal of primary flows, focus-return in dialogs, `aria-live` on validation, labels on icon-only controls, text/icon redundancy for status colour.

### WP6 — Performance & architecture · ~15–25 credits
pg_trgm index for global search, full hover-prefetch rollout, shared dashboard query layer, then the remaining domain predictors (ops/finance/procurement/customer).

**Total ~66–105 credits.** WP1 + WP2 (~11–17) deliver the disproportionate share of user-visible improvement and are the recommended first commit.

### Explicitly out of scope
Dead shadcn primitives (15 unused files) — normal library boilerplate, deleting them buys nothing. And the `v1.1-backlog.md` Not-Started items, which are new feature work rather than remediation of completed work.
