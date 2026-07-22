# Master List Standardization

Sprint 1.8's design record for the shared master-data CRUD architecture:
what already existed, what was extracted, what was migrated onto it, what
was deliberately left alone, and why. This is an implementation-sprint
document — no redesign, no new features, no permission changes beyond
aligning the UI with policy the database already enforces.

## 1. Architecture as it stands

`src/components/masters/MasterListPage.tsx` is a single config-driven
component that renders a full CRUD list screen — search, active/inactive
tabs, column visibility, density, pagination, create/edit dialog, delete
confirmation, bulk import, and a role-gated write affordance — from one
`MasterConfig` object (`src/lib/masters/config.ts`). Thirteen stone-industry
attribute masters (Stone Types, Stone Colours, Surface Finishes, Edge
Finishes, Stone Origins, Applications, Thicknesses, Product Families,
Manufacturing Stages, Quality Grades, Packaging Types, Units of
Measurement, QC Templates) each reduce to a config entry plus a
one-line route file under `src/routes/_authenticated/masters/`. This was
already true before Sprint 1.8 — the sprint's job was auditing whether
anything *else* in the app is really the same shape and could join it, and
extracting the parts of `MasterListPage` and its neighbors that were
duplicated by hand elsewhere.

`MasterConfig` assumes a flat table: `id`, `code`, `name`, `is_active`,
`sort_order`, plus whatever `extraFields`/`extraColumns` the master needs.
That assumption is what determines whether a screen is a candidate at all
(§ 2) — it is not a generic list-page framework, it is specifically a
flat-attribute-master framework, and Sprint 1.8 preserved that scope
rather than widening it to cover every list in the app.

## 2. Audit summary (Part 1)

Every screen the sprint's examples named, and what was found:

**Already on MasterListPage (13):** Stone Types, Stone Colours, Surface
Finishes, Edge Finishes, Stone Origins, Applications, Thicknesses, Product
Families, Manufacturing Stages, Quality Grades, Packaging Types, Units of
Measurement, QC Templates. No duplicate CRUD code, no unique behaviour
outside the config, no migration needed — these were the baseline the rest
of the audit was measured against.

**Migrated onto the shared list-state hook, kept as standalone pages
(3):** Products, Installation Teams, Message Templates. Each had its own
hand-rolled search/debounce/pagination/table-prefs block that was a
byte-for-byte duplicate of what `MasterListPage` already had inline — that
duplication is what Part 3 extracted into `useListPageState` (§ 3). None of
the three were migrated onto `MasterListPage` itself: Products has a
configure-wizard, AI-classify sidebar, and picker-cache seeding that don't
fit the config shape; Installation Teams has nested member records
(name/phone/skill per member) with no equivalent in `MasterField`;
Message Templates has channel-conditional fields (subject only for email)
and a placeholder-extraction preview. Forcing any of the three onto
`MasterConfig` would mean widening the config schema for one consumer each
— exactly the "no redesign" risk the sprint warned against — so they keep
their own page component and only share the list-state plumbing.

**Named in the sprint's examples, do not exist as screens:** Roles,
Departments, Capabilities, Vehicle Masters, Payment Terms. None of these
have a dedicated list/CRUD route in the codebase. Roles are enforced as a
fixed application enum, not admin-editable data. Departments and
Capabilities are attributes captured inline on other entities (e.g. team
member skills as free text), not their own master table. Vehicle appears
only as a free-text field on Installation Teams. Payment Terms appear only
as a field on Customers/Quotes, not a standalone master. Building any of
these as new screens would be new feature work, out of scope for an
implementation sprint — flagged here as an audit finding, not built.

**Named in the sprint's examples, exists but doesn't fit (1):** Product
Categories. `listProductCategories()` exists as a read-only query; there is
no create/edit/delete UI anywhere. The `product_categories` table is
hierarchical (`slug` + `parent_id`, no `code` column) rather than flat, so
it doesn't fit `MasterConfig` as-is — putting it on `MasterListPage` would
require either bending the config shape to support a parent-picker and
slug field (a real extension, not a fit) or building a bespoke tree-aware
CRUD page. Both are new capability, not standardization of an existing
page. Recommended as Sprint 1.9 work (§ 6), not attempted here.

## 3. Duplication removed (Part 3)

**`src/lib/lists/paginate.ts`** — `pageSlice(rows, page, pageSize)`, a
pure function extracted from three near-identical inline
`.slice((page-1)*pageSize, page*pageSize)` blocks (Products,
`MasterListPage`'s prior inline logic, and the pattern Installation
Teams/Message Templates would otherwise have repeated a fourth and fifth
time). Defensively clamps non-finite/zero/negative `page` or `pageSize` to
`1` rather than producing `NaN` slice bounds. Covered by
`paginate.test.ts` (7 cases: first/second/last-partial page, page beyond
data, empty input, clamped nonsense inputs, non-mutation of the input
array).

**`src/hooks/use-list-page-state.ts`** — `useListPageState(prefsKey, opts?)`
bundles the pattern that was hand-written in `MasterListPage`, Products,
Installation Teams, and Message Templates: debounced search
(`useDebouncedValue`), page/page-size state that resets to page 1 whenever
the debounced query changes, `useTablePrefs` passthrough (density/column
visibility), and pagination slicing/props built on `pageSlice`. It
deliberately does **not** bundle query-key construction, data fetching, or
dialog/mutation state — those differ enough per page (see § 2's fit
discussion) that forcing them into a shared hook would be the kind of
"pretend a config option instead of doing the work" shortcut the sprint's
Part 4 explicitly warns against. `useListPageState` is a search+pagination
hook, not a page framework.

Both extractions were adopted by the four call sites that had the
duplicate logic (`MasterListPage`, `products/index.tsx`,
`installation-teams/index.tsx`, `message-templates.tsx`) with behavior
preserved exactly — same debounce delays (200ms for `MasterListPage` and
Message Templates, 250ms default for Products and Installation Teams),
same `useTablePrefs` keys, same page-reset-on-search behaviour.

No other repeated-more-than-once pattern was found that warranted
extraction — delete confirmation, create dialogs, toolbar actions, loading
and empty states were already shared via existing components
(`ConfirmDialog`, `DataToolbar`, `SkeletonTable`, `EmptyState`) before this
sprint, so there was nothing further to pull out (Part 5, § 5).

## 4. MasterConfig extension points (Part 4)

**`MasterField.type: "boolean"`** — declared in the type union since the
original implementation, but the form dialog silently rendered it as a
plain text input (typing "true"/"false" into a text box). It now renders a
`<Switch>`, seeds `false` for new records, and submits `Boolean(v)`
instead of going through the string "required" check. No existing config
uses `"boolean"` yet, so this is purely additive — every current master's
rendered output is unchanged.

**`MasterConfig.writeRoles?: readonly ("admin" | "sales_manager" | "sales"
| "purchase")[]`** — optional; when omitted (every one of the 13 existing
configs omits it), `MasterListPage` uses
`DEFAULT_MASTER_WRITE_ROLES = ["admin", "sales_manager"]`, which is
exactly the hardcoded array every write-affordance check used before this
sprint. Added so a future master with a stricter RLS policy (e.g.
admin-only, the way `message_templates` already is — see § 5) can express
that in its config instead of `MasterListPage` needing a per-master `if`
branch or a second copy of the component. `super_admin` never needs
listing in `writeRoles`; role checks route through `useRoles()`, where a
Platform Super Admin satisfies any `admin` check by inheritance (Sprint
1.7.1, see `docs/authentication.md` § Permission hierarchy).

No breaking changes: both additions are optional/additive, and every
existing config's rendered behaviour is byte-for-byte unchanged (confirmed
by the full test suite and a manual read of the diff — see § 7).

## 5. Design system review (Part 5)

All 13 `MasterListPage`-driven masters and the three migrated pages
(Products, Installation Teams, Message Templates) already composed the
standard set — `PageHeader`, `Card`-based `DataTableShell`, `SkeletonTable`
/ `EmptyState` / `ErrorBlock` for loading/empty/error states, `Dialog` for
create/edit, `ConfirmDialog` for delete, standard `Button`/`Input`/`Label`/
`Switch`, `ColumnsMenu`/`DensityMenu` for table chrome — with no hand-built
replacements found during the audit. This was true going in; Sprint 1.8's
Part 3 extraction (§ 3) removed duplicated *state logic* behind those
components, not the components themselves, so this section is a
confirmation rather than a migration.

## 6. Platform/Product branding consistency (Part 6)

Sprint 1.7 introduced the Platform Owner / Tenant Product split (Vedora
Vision as Platform, Stone Tech OS as Product — `src/lib/platform/platform.ts`
and `src/lib/platform/application.ts`). Sprint 1.8 found two remaining
spots where the literal string `"Stone Tech OS"` was hardcoded a second
time instead of reading `APPLICATION_NAME` from that single source of
truth, and centralized both:

- `src/components/global/ConfigurationRequiredScreen.tsx` — heading and
  "Powered by" footer line now use `APPLICATION_NAME`/`POWERED_BY_LINE`.
- `src/components/layout/AppShell.tsx` — the account-menu header caption
  and the mobile topbar label now use `APPLICATION_NAME`.

**Deliberately left as literals:**
- `src/components/layout/AppShell.tsx`'s sidebar logo mark (`Stone Tech` +
  a separately mint-coloured `OS` in two spans) — this is the stylized
  customer-facing brand mark itself, not a duplicated plain string.
  Splitting `APPLICATION_NAME` to recolor half of it would be a fragile
  string-slicing hack for a cosmetic-only consistency win, and the sprint
  explicitly says not to alter customer-facing Stone Tech branding.
- `src/routes/__root.tsx`'s `head()` meta tags (page title, description,
  author, `apple-mobile-web-app-title`, `og:title`, `twitter:title`) —
  SEO/document metadata that predates the Vedora Vision branding work and
  reads as Stone Tech OS's own product identity rather than Platform
  branding. Judged out of this sprint's scope; not touched.

No visible text changed anywhere in this section — every edit swaps a
literal for a constant that resolves to the identical string.

## 7. Permission review (Part 7)

Two real UI/RLS mismatches were found and fixed — in both cases the
database policy was already correct and unchanged; only the UI affordance
was tightened to stop offering an action the database would reject:

- **Installation Teams** — `install_teams_write` (migration
  `20260707171536`) restricts writes to `admin`/`sales_manager`, but the
  "New team" button and the per-row delete button previously rendered for
  every staff user. Both are now wrapped in
  `<Can anyRole={["admin", "sales_manager"]}>`.
- **Message Templates** — the `"admin manage templates"` policy (migration
  `20260707063953`) restricts writes to `admin` only, but "New template"
  and the per-row Edit affordance previously rendered for every staff user.
  Both are now gated behind `useRoles().isAdmin` (inheritance-aware, so
  Platform Super Admin still qualifies), including the empty-state message
  and the Edit table column, which are hidden entirely for non-admins
  rather than shown and failing on save.

**The 13 `MasterListPage`-driven masters** were reviewed as a group since
`MasterListPage.tsx` itself changed this sprint (§ 3, § 4). The write-role
check is now `roles.hasAnyRole(config.writeRoles ?? DEFAULT_MASTER_WRITE_ROLES)`
where `DEFAULT_MASTER_WRITE_ROLES` is `["admin", "sales_manager"]` — the
exact array every write-gated affordance (New/Import button, delete,
mark-active/inactive) checked against before this sprint, and no config
sets `writeRoles`, so every one of the 13 masters behaves identically to
before. Confirmed by diff review (the only behavioural line changes are
`["admin", "sales_manager"]` → `writeRoles`/`canWrite`, which evaluate to
the same array) and by the unchanged test suite passing.

**Products** received only the state-management refactor (§ 3) — no
role-gating lines were touched, so whatever permission behaviour existed
before this sprint is unchanged.

**Row-level Edit on `MasterListPage`** (opening the edit dialog) is not
role-gated — any authenticated user can open it, and the save call would
fail at the database for a non-writer. This was true before Sprint 1.8 as
well (confirmed via diff — `onEdit` was never wrapped in a role check) and
is therefore not a regression introduced by this sprint, so it was left
as-is per "fix only issues introduced by this sprint." Worth a look in a
future sprint, but out of scope here.

No other permission regressions were found. Super Admin, Admin, and
read-only behaviour were spot-checked against the diffs above; Manager
role has no distinct write grant anywhere in this set of screens (write
access is `admin`/`sales_manager`, or `admin`-only for Message Templates),
so "Manager" in the sprint's Part 7 wording maps to `sales_manager` here.

## 8. Testing (Part 8)

- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `eslint` on every file touched this sprint — one Prettier formatting
  issue introduced by this sprint's own edit to `MasterListPage.tsx` (a
  wrapped `for` loop missing braces), fixed; clean afterward.
- `bun test` — 317 pass, 0 fail (up from the pre-sprint 310; the 7 new
  tests are `paginate.test.ts`'s coverage of `pageSlice`).
- `npm run build` — succeeds.

No pre-existing test, lint, or type failures were touched or fixed beyond
what this sprint's own edits introduced.

## 9. Remaining exceptions / Sprint 1.9 recommendations

- **Product Categories** has no CRUD screen and doesn't fit
  `MasterConfig`'s flat shape (§ 2). Building one is new capability
  (hierarchical picker, slug handling) — recommended as a Sprint 1.9 item,
  not attempted here.
- **Row-level Edit** on `MasterListPage` is unguarded by role (§ 7) —
  pre-existing, not a regression, but worth deciding deliberately in a
  future sprint (either gate it or confirm the save-time RLS rejection +
  toast is the intended UX).
- **Roles / Departments / Capabilities / Vehicle Masters / Payment Terms**
  named in the sprint's examples do not exist as dedicated screens (§ 2).
  If any of these are wanted as real master-data screens, that is new
  feature work for a future sprint, not standardization of something that
  already exists.
