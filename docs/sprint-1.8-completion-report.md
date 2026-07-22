# Sprint 1.8 — MasterListPage Standardization

**Status: implementation complete, freezing per sprint instructions.**
Architecture detail (what `MasterListPage`/`MasterConfig` do, the new
extension points, the full nine-part audit and migration record) lives in
`docs/master-list-standardization.md` — this report is the sprint's
requested deliverables. Per the sprint's explicit instructions, **no
screen was redesigned and no unrelated feature was implemented** — every
change below traces to one of the sprint's nine numbered parts, and the
sprint's constraints (preserve business logic, permissions, mutations,
routing, validation, filters, sorting, search, bulk actions, dialogs,
navigation, deep links, query parameters) were treated as hard limits, not
guidelines.

## 1. Audit summary (Part 1)

Full detail in `docs/master-list-standardization.md` § 2. Short version:

- **13 masters already on `MasterListPage`** (Stone Types, Stone Colours,
  Surface Finishes, Edge Finishes, Stone Origins, Applications,
  Thicknesses, Product Families, Manufacturing Stages, Quality Grades,
  Packaging Types, Units of Measurement, QC Templates) — no duplication,
  no migration needed.
- **3 screens migrated onto the new shared list-state hook, kept as
  standalone pages** (Products, Installation Teams, Message Templates) —
  each has page-specific structure (wizard, nested members, conditional
  fields) that doesn't fit `MasterConfig`'s flat shape, but each had
  hand-duplicated search/pagination state that the new hook now owns.
- **5 names from the sprint's examples that don't exist as screens**
  (Roles, Departments, Capabilities, Vehicle Masters, Payment Terms) —
  each is either a fixed enum, a field on another entity, or free text;
  none is a standalone master-data table. Documented, not built.
- **1 name that exists but doesn't fit** (Product Categories) —
  read-only query only, no CRUD UI, hierarchical schema (`slug`/
  `parent_id`) incompatible with `MasterConfig`'s flat shape. Flagged for
  Sprint 1.9, not attempted here.

## 2. Files changed

**New:**
- `src/lib/lists/paginate.ts` + `paginate.test.ts` — extracted, tested
  pagination math (Part 3).
- `src/hooks/use-list-page-state.ts` — extracted shared search/debounce/
  pagination/table-prefs hook (Part 3).
- `docs/master-list-standardization.md` — architecture record (Part 9).
- `docs/sprint-1.8-completion-report.md` (this file, Part 9).

**Modified:**
- `src/components/masters/MasterListPage.tsx` — adopted
  `useListPageState` (Part 3); added `writeRoles`/`canWrite` derived from
  the new `MasterConfig.writeRoles` extension point (Part 4); added
  boolean `MasterField` rendering/seeding/submission (Part 4).
- `src/lib/masters/config.ts` — added `MasterConfig.writeRoles?` and
  `DEFAULT_MASTER_WRITE_ROLES`, documented inline (Part 4); doc comment
  on `MasterField.type` noting boolean now renders correctly.
- `src/routes/_authenticated/products/index.tsx` — adopted
  `useListPageState`; no permission-relevant lines touched (Part 2/3).
- `src/routes/_authenticated/installation-teams/index.tsx` — adopted
  `useListPageState` (Part 2/3); gated New-team button and per-row delete
  behind `<Can anyRole={["admin", "sales_manager"]}>` to match the
  `install_teams_write` RLS policy (Part 7).
- `src/routes/_authenticated/message-templates.tsx` — adopted
  `useListPageState` (Part 2/3); gated New-template button, Edit column/
  action, and empty-state copy behind `useRoles().isAdmin` to match the
  `"admin manage templates"` RLS policy (Part 7).
- `src/components/global/ConfigurationRequiredScreen.tsx` — sourced its
  two hardcoded "Stone Tech OS" strings from `APPLICATION_NAME`/
  `POWERED_BY_LINE` instead of repeating the literal (Part 6).
- `src/components/layout/AppShell.tsx` — sourced two hardcoded "Stone Tech
  OS" plain-text labels from `APPLICATION_NAME`; the stylized sidebar logo
  mark (split-colored "Stone Tech"/"OS" spans) was deliberately left as a
  literal — see `docs/master-list-standardization.md` § 6 (Part 6).

**Deleted:** none.

Every UI/RLS permission fix above tightens the frontend to match a
database policy that was already in force and unchanged — none of the two
migrations referenced were touched, added, or altered this sprint.

## 3. Duplicate code removed (Part 3)

Two extractions, both adopted at every site that had the duplicated
pattern:

- **`pageSlice()`** replaced three near-identical inline
  `.slice((page-1)*pageSize, page*pageSize)` blocks (in `MasterListPage`'s
  prior inline logic and Products; Installation Teams and Message
  Templates would otherwise have hand-written a fourth and fifth copy).
- **`useListPageState()`** replaced four hand-written
  search+debounce+pagination+table-prefs blocks (`MasterListPage`,
  Products, Installation Teams, Message Templates) with one hook, same
  debounce delays and prefs keys as each site had before.

No other repeated-more-than-once pattern was found — delete confirmation,
create dialogs, toolbar actions, loading/empty states were already shared
via `ConfirmDialog`/`DataToolbar`/`SkeletonTable`/`EmptyState` before this
sprint. Full detail and rationale in
`docs/master-list-standardization.md` § 3 and § 5.

## 4. New extension points (Part 4)

- **`MasterField.type: "boolean"`** now actually renders as a `<Switch>`
  instead of silently falling through to a text input. No existing config
  uses it yet — purely additive.
- **`MasterConfig.writeRoles?`** — optional array of roles allowed to
  write on a given master; defaults to `DEFAULT_MASTER_WRITE_ROLES =
  ["admin", "sales_manager"]` when omitted, which every one of the 13
  existing configs does, so no existing master's behavior changed. Lets a
  future stricter-RLS master (e.g. admin-only) express that in its config
  instead of `MasterListPage` needing a per-master branch.

Both are documented inline in `src/lib/masters/config.ts` per the sprint's
Part 4 instruction, and neither introduces a breaking change — confirmed
by diff review and the full test suite passing unchanged.

## 5. Risks

- **Row-level Edit on `MasterListPage` is not role-gated** — any
  authenticated user can open the edit dialog; a non-writer's save fails
  at the database. Confirmed via diff that this predates Sprint 1.8 (not
  a regression this sprint introduced), so left as-is per "fix only issues
  introduced by this sprint" — but worth a deliberate decision in a future
  sprint. See `docs/master-list-standardization.md` § 7, § 9.
- **The two Part 7 permission fixes (Installation Teams, Message
  Templates) have not been manually verified against a live database** —
  this sandbox has no live Supabase project (same standing limitation as
  Sprint 1.7/1.7.1). The fixes were derived from reading the actual RLS
  migration SQL, not assumed, but a staging sanity check (log in as a
  non-admin/non-sales_manager user, confirm the buttons are gone and the
  underlying policy still rejects a forced write) is recommended before
  relying on them in production.
- **`writeRoles` is unused by any config today** — it's verified
  non-breaking by inspection and tests, but its first real consumer will
  be the first true test of the extension point end-to-end.
- **Git push still pending** — this sandbox has no working GitHub
  credentials (same standing blocker reported in Sprint 1.7.1's
  completion report). This sprint's commit exists locally only.

## 6. Tests executed

- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `eslint`, scoped to every file this sprint touched — one Prettier
  formatting issue introduced by this sprint's own edit to
  `MasterListPage.tsx` (a wrapped `for` loop missing braces), fixed
  in-sprint; clean afterward.
- `bun test` — **317 pass, 0 fail** (310 pre-existing + 7 new: the full
  `paginate.test.ts` suite for `pageSlice`).
- `npm run build` (standard Cloudflare/Nitro target) — **succeeds**.

## 7. Build status

**Green.** Typecheck (prod + test configs), scoped lint, the full test
suite, and the standard build all pass clean with only changes introduced
by this sprint.

## 8. Remaining exceptions

- **Product Categories** — no CRUD screen exists; schema doesn't fit
  `MasterConfig`. Not built this sprint (would be new feature work). See
  `docs/master-list-standardization.md` § 2, § 9.
- **Roles / Departments / Capabilities / Vehicle Masters / Payment
  Terms** — none exist as dedicated master-data screens; each is a fixed
  enum, a field on another entity, or free text. Not built this sprint.
- **`src/routes/__root.tsx`'s SEO meta tags** — several hardcoded "Stone
  Tech OS" strings, deliberately left untouched as out of this sprint's
  branding-consistency scope (customer-facing document metadata, not
  Vedora Vision Platform branding). See
  `docs/master-list-standardization.md` § 6.
- **The sidebar's stylized brand mark** (`AppShell.tsx`) — left as a
  literal on purpose, not a missed consistency pass. See § 2 above and
  `docs/master-list-standardization.md` § 6.

## 9. Suggested Sprint 1.9 work

- Build a Product Categories CRUD screen — likely its own bespoke
  tree-aware page rather than a forced fit onto `MasterConfig`, given the
  `slug`/`parent_id` hierarchy has no equivalent in the current config
  shape.
- Decide deliberately on `MasterListPage`'s unguarded row-level Edit
  affordance (§ 5) — gate it to match `writeRoles`, or confirm the
  save-time RLS rejection + toast is the intended UX and document it as
  such.
- Manually verify the Installation Teams and Message Templates permission
  fixes (§ 5) against a live Supabase project once one is available.
- If Roles / Departments / Capabilities / Vehicle Masters / Payment Terms
  are ever wanted as real admin-editable master data (rather than fixed
  enums or fields on other entities), that's new screen(s) to design and
  build — out of an implementation/standardization sprint's scope.
- Carried over from Sprint 1.7.1's own suggested follow-up (still not
  done): reconcile `docs/role-permission-matrix.md` with the real
  `app_role` enum; run the pending migrations against a real staging
  Supabase project; resolve the outstanding git push blocker.
