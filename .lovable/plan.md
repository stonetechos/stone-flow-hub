
# Stone Tech OS — Full Audit Plan

## Scope

A read-first, fix-second pass across every module — no new features, no business-logic changes. Anything that requires a product decision is reported, not silently changed.

## Phase 1 — Static inventory (no code changes)

1. **Route map** — enumerate every file under `src/routes/_authenticated/`, confirm each sidebar entry in `AppShell.tsx` resolves to a real route file with correct `createFileRoute` path.
2. **Module coverage matrix** — for each of the 18 modules, record which of the standard artifacts exist:
   - list (`index.tsx`), detail (`$id.tsx`), create (`new.tsx`), edit (`$id.edit.tsx`)
   - `src/lib/<domain>/schema.ts` (Zod) and `api.ts` (CRUD)
   - `qk.<domain>` query key
3. **Schema cross-check** — for each `api.ts`, confirm the tables/columns referenced exist in the Supabase types (`src/integrations/supabase/types.ts`) and that foreign-key joins use the right FK alias.
4. **Dead code sweep** — `rg` for unused exports, orphan components, duplicate helpers between domain slices.
5. **Import guards** — verify no route file imports `client.server`, no `process.env.*` at module scope in shared files, no `@/pages/*` paths.

## Phase 2 — Behavioural spot-checks

For each module, verify by reading code (not clicking):

- List page: `useQuery` + `LoadingBlock` + `ErrorBlock` + `EmptyState` present; search input wired; filter chips wired.
- Detail page: `NotesPanel` / `AttachmentsPanel` / `TimelinePanel` present where the entity has a polymorphic spine; RowActions + `ConfirmDialog` for delete.
- Create/Edit: uses `QuickForm` progressive-disclosure pattern; Zod schema imported; `mapDbError` in mutation onError.
- Relationships: joins reference the correct FK names from the DB (e.g. `enquiries!enquiries_project_id_fkey`).

Cross-cutting checks:

- **Auth**: `_authenticated/route.tsx` is the integration-managed one; no duplicate gate on children; sign-out follows cache-teardown order.
- **Query keys**: every mutation invalidates the right key; no stale `qk.dashboard.kpis` style mistakes.
- **Type safety**: `bunx tsgo --noEmit` must be clean.
- **Accessibility**: buttons have labels, dialogs have titles, form inputs have `<Label>`.
- **Dark mode**: no hard-coded `text-white` / `bg-black` / hex utilities — only semantic tokens.
- **Responsiveness**: sidebar is mobile-hidden (already), tables scroll on small viewports.

## Phase 3 — Auto-fixes (safe, no business-logic change)

Anything in this list will be fixed in place without asking:

- Broken import paths, unused imports, unused variables, dead files.
- Missing `errorComponent` / `notFoundComponent` where a loader exists.
- Missing empty/loading/error states on list pages.
- Wrong or missing `qk.*` invalidation after a mutation.
- Hard-coded colors → semantic token equivalents.
- Missing `aria-label` on icon-only buttons.
- Duplicate helpers → single source in `src/lib/utils.ts` or a domain module.
- `<Link>` corrections where `<a href>` interpolates params.
- `zod` validation gaps on create/edit forms (adding a `.min(1)` etc.).
- TypeScript errors and lint warnings.

## Phase 4 — Report-only (needs your decision)

Will NOT be auto-changed:

- Missing sub-features (e.g. Customers module has only a list — no dedicated detail/edit routes; edit currently happens in-dialog).
- Placeholder fields where pricing/GST/stock/accounting logic is deferred.
- Any schema change (new FK, new column, RLS tightening).
- Any UI redesign or navigation restructure.
- Anything requiring a decision on scope of a future phase.

## Phase 5 — Verification

- `bunx tsgo --noEmit` → zero errors.
- Production build via the sandbox build pipeline → zero errors, zero warnings (or documented residual warnings).
- `supabase--linter` → review + report DB-level advisories.

## Deliverable — ERP Health Report

A single markdown report at the end with:

1. **Module status matrix** — for each of the 18 modules: ✅ Complete / 🟡 Partial / ⚪ Placeholder, with the specific gap named.
2. **Auto-fixes applied** — bullet list of every change made in Phase 3, grouped by module.
3. **Open issues needing a decision** — Phase 4 items with a one-line recommendation each.
4. **Placeholders inventory** — every field/screen currently stubbed for pricing, GST, stock, accounting, notifications, PDF, AI.
5. **Recommended next enhancements** — prioritized shortlist (e.g. Customer/Vendor/Product detail pages, PDF generation, GST engine, stock ledger, email/WhatsApp notifications, RBAC UI, multi-company).
6. **Production readiness** — overall % with a breakdown across: schema, CRUD coverage, auth/RLS, UX polish, error handling, performance, accessibility, ops readiness.

## Notes / limits

- I won't run interactive Playwright click-throughs of every module (would consume the entire session budget). Behavioural checks are code-read plus targeted Playwright runs only where a real question exists.
- Zero-warning production builds depend on upstream deps; unavoidable third-party warnings will be listed rather than suppressed.
- No migrations will run in this pass unless the audit uncovers a broken FK — which would be reported first for your approval.

Approve to switch to build mode and start Phase 1.
