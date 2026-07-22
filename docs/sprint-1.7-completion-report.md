# Sprint 1.7 — Authentication Foundation / Super Admin Architecture / Platform Branding

**Status: implementation complete, freezing per sprint instructions.**
Full detail on the resulting architecture, permission matrix, password
lifecycle, and audit events lives in `docs/authentication.md` — this report
is the sprint's ten requested deliverables, plus the assumptions made along
the way.

## 1. Files changed

**New:**
- `supabase/migrations/20260722150001_add_super_admin_role.sql`
- `supabase/migrations/20260722150002_add_auth_audit_actions.sql`
- `supabase/migrations/20260722150003_super_admin_protection.sql`
- `src/lib/admin/permissions.ts` + `permissions.test.ts`
- `src/lib/env/config-status.ts` + `config-status.test.ts`
- `src/components/global/ConfigurationRequiredScreen.tsx`
- `src/lib/branding/platform.ts`
- `docs/authentication.md`
- `docs/sprint-1.7-completion-report.md` (this file)

**Modified:**
- `src/integrations/supabase/client.ts` — routes the missing-env-var check
  through `config-status.ts` instead of recomputing it.
- `src/routes/__root.tsx` — renders `ConfigurationRequiredScreen` in place
  of the whole app when Supabase isn't configured.
- `src/routes/_authenticated/route.tsx` — `beforeLoad` early-returns instead
  of throwing when misconfigured; also now checks
  `profiles.force_password_change` and redirects to the forced-change flow.
- `src/routes/auth.tsx` — new `force-change` flow value, `UpdatePasswordCard`
  gains a `forceChange` prop, platform-branding attribution line added to
  every auth card.
- `src/routes/_authenticated/settings.tsx` — new "About" tab.
- `src/lib/admin/users.ts` — `assignRoleGuarded`/`revokeRoleGuarded`,
  `currentUserIsSuperAdmin`.
- `src/lib/admin/users.functions.ts` — `requireAdminActor` (replaces
  `requireAdmin`), Super Admin guards in `deleteAuthUser`/`setUserActive`,
  new `resetUserPassword`, `force_password_change` wiring, audit logging.
- `src/routes/_authenticated/admin/users.tsx` — Super Admin UI guards,
  "Set new password" dialog, removed the random-password "Generate"
  button, route guard now accepts `admin` OR `super_admin`.
- `src/integrations/supabase/types.ts` — hand-edited for the new
  enum values/columns (see Migration Notes — regenerate for real later).
- `src/components/entity/TaskDialog.tsx`,
  `src/components/customer-payments/ApproveEstimateDialog.tsx`,
  `src/components/procurement/CreatePoFromQuoteDialog.tsx`,
  `src/components/installation/SignoffDialog.tsx` — Part 10 hardening
  (dirty-guard on close + Ctrl/Cmd+Enter submit).

**Pre-existing, unrelated change already present in the working tree:**
`src/lib/vie/actions/registry.test.ts` carries a small flakiness fix (an
"unregistered intent" test probe was using a real `VieIntent` value that
other test files could legitimately register first, making the assertion
order-dependent; it now probes a synthetic never-registered value instead).
This is not part of Sprint 1.7's scope — flagging it here for visibility
rather than silently bundling it in.

## 2. Architecture summary

- **Role hierarchy**: the sprint's six-tier `SUPER_ADMIN → ADMIN → MANAGER
  → EMPLOYEE → VENDOR → CUSTOMER` is treated as a *conceptual* mapping onto
  the existing `admin | sales_manager | sales | purchase` roles, per "no
  redesign." Exactly one new enum value, `super_admin`, was added — nothing
  else was renamed or restructured. See `docs/authentication.md` for the
  full mapping and why.
- **Enforcement is two-layered.** A pure, I/O-free TypeScript module
  (`src/lib/admin/permissions.ts`) is the single source of truth for the
  decision matrix, called from both server functions and client UI. The
  *authoritative* enforcement is a set of Postgres `BEFORE` triggers
  (migration `20260722150003`) that fire regardless of which client issued
  the write — including the service-role client, which bypasses RLS but not
  triggers.
- **Configuration failures are now global, not per-page.** `getSupabaseConfigStatus()`
  is computed once and checked at the two points where a route can touch
  Supabase before rendering (`__root.tsx`'s component, and the two
  `beforeLoad` hooks that call `supabase` before their page mounts), so a
  misconfigured deployment always shows one full-screen message instead of
  leaking a raw env-var error into whatever page happened to load first.
- **Platform branding is a separate, reusable module** (`src/lib/branding/platform.ts`),
  deliberately independent from the existing per-tenant Company Profile
  branding module, so a future sibling Vedora product can reuse it.

## 3. Permission matrix

See `docs/authentication.md` § Permission matrix for the full table. In
short: the Super Admin cannot be deleted, deactivated, or have their role
changed by anyone (including themselves); only the Super Admin can reset
their own password. Every other Admin/Super-Admin-vs-anyone-else
interaction is unchanged from before this sprint.

## 4. Database changes

Three migrations, in dependency order (Postgres requires a new
`ALTER TYPE ... ADD VALUE` to commit before it can be referenced by name):

1. `20260722150001` — adds `'super_admin'` to `app_role`.
2. `20260722150002` — adds eight new `activity_action` enum values.
3. `20260722150003` — `is_super_admin()` function; three protection
   triggers (`protect_super_admin_role`, `limit_super_admin_count`,
   `protect_super_admin_profile_trigger`); `profiles.force_password_change`
   column; `activity_log.ip_address` column; automatic `role_changed`
   audit trigger; the one-time seed of `info@stonetech.in` as Super Admin.

**None of these have been run against a live Postgres instance** — there is
no live Supabase project in this sandbox. See Regression Risks below.

## 5. Audit events added

`user_created`, `password_reset`, `role_changed` (automatic, DB trigger),
`user_activated`, `user_deactivated`, `user_deleted`,
`super_admin_delete_attempted`, `super_admin_role_change_attempted`. Full
table of exactly where each fires is in `docs/authentication.md` § Audit
events, including the one deliberate gap: denied password-reset/deactivate
attempts against the Super Admin are blocked but not logged under either
"attempted" category, since neither matches what actually happened.

## 6. Tests executed

- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `npm run lint` (scoped re-check on every file this sprint touched) —
  clean, zero new violations. The full-repo `npm run lint` still reports
  the pre-existing ~7,400-problem prettier/formatting debt documented in
  `docs/CI_LINT_DEBT.md` (315 files, predates this sprint); none of that
  debt was added to by this work — the two files this sprint touched that
  had been prettier-clean before (`ApproveEstimateDialog.tsx`,
  `CreatePoFromQuoteDialog.tsx`) are still clean.
- `bun test` — **291 pass, 0 fail** (289 pre-existing + 2 new files: 15
  new tests in `permissions.test.ts`, 2 new tests in `config-status.test.ts`).
  New tests cover exactly Part 12's requested matrix: Super Admin cannot be
  deleted (by itself or an Admin), Admin cannot deactivate/revoke-role/reset-password
  the Super Admin, Admin can delete Admin, Admin can delete Employee,
  Super Admin can delete Admin/Employee, a non-admin actor is denied
  outright, and `assertCanManageTargetUser` throws the exact Part 3 copy.
- `npm run build` — succeeds (Vite + Nitro/Cloudflare output generated
  without errors).

## 7. Build status

**Green.** Typecheck (prod + test configs), lint (scoped), build, and the
full test suite all pass.

## 8. Migration notes

- Apply the three migrations **in numeric order**, in separate transactions
  (this is how Supabase's migration runner applies files by default — don't
  hand-merge them into one transaction, or the `ALTER TYPE ... ADD VALUE`
  → same-transaction-reference ordering breaks).
- After applying, run `supabase gen types typescript` against the real
  project and replace the hand-edited sections of
  `src/integrations/supabase/types.ts` (new `app_role`/`activity_action`
  enum values, `force_password_change`, `ip_address`, `is_super_admin`) with
  the generated output, to eliminate any drift between the hand-edit and
  the real schema.
- The Super Admin seed is a no-op if `info@stonetech.in` doesn't exist yet
  in `auth.users` at migration time — create that account first (normal
  sign-up or invite), then either re-run the seed INSERT or run the
  one-line manual promotion in `docs/authentication.md`.
- **None of the three migrations, nor the DB triggers, have been run
  against a live Postgres/Supabase instance** — there was no live project
  connected in this sandbox. Apply them to a staging project and manually
  verify: a delete/deactivate/role-change attempt against the seeded Super
  Admin is actually rejected with "This account is protected.", and a
  normal Admin delete/deactivate against a non-Super-Admin still works.

## 9. Regression risks

- **Not run against a live database.** This is the largest risk — the
  migrations and trigger logic are written and reasoned through carefully
  (mirroring this codebase's existing trigger patterns), but have not been
  executed. Treat the DB layer as "reviewed, not verified" until staged.
- **`types.ts` is hand-edited**, not regenerated. If the real schema ends
  up differing even slightly from what's assumed here (e.g. a slightly
  different trigger/column name), the TypeScript types will silently
  disagree with reality until regenerated.
- **IP address audit capture is not implemented** — the `ip_address`
  column exists but nothing populates it, since doing so would have meant
  editing the auto-generated `auth-middleware.ts`, which felt like a
  bigger, separate change to make un-reviewed. Every audit event still
  records Actor and Timestamp as required; IP is a known gap, not a silent
  one.
- **The Users & Roles route guard changed** (Part 4 discovery): it
  previously only allowed the `admin` role in; since the Super Admin holds
  only `super_admin` (never also `admin`), the guard now accepts either.
  Verify no other route/component in the app has the same `admin`-only gate
  that would similarly lock the Super Admin out — this sprint only found
  and fixed the one on the Users & Roles page itself, since that was in
  scope; a full audit of every `admin`-only gate in the app was not
  performed.
- **Part 10's dirty-guard** uses `window.confirm()` (via the existing
  `confirmCloseIfDirty` helper) — this blocks the JS thread while showing a
  native browser confirm dialog, consistent with how it was already used
  elsewhere in the app, but worth knowing if a future sprint wants a
  custom-styled confirmation instead.
- **`docs/role-permission-matrix.md`** was not touched, since it documents
  a different, broader set of roles than what's actually implemented in
  `app_role` — reconciling the two documents was out of scope for this
  sprint and is called out as a Sprint 1.8 candidate below.

## 10. Suggested Sprint 1.8 work

- Regenerate `types.ts` for real against a live, migrated Supabase project.
- Wire actual IP capture into the audit log (requires a small,
  purpose-reviewed change to `auth-middleware.ts` or an equivalent
  request-context passthrough).
- Reconcile `docs/role-permission-matrix.md` with the real `app_role` enum
  — either document the gap explicitly per-role or implement the missing
  roles it currently describes.
- Decide whether a persistent Vedora Vision footer belongs in `AppShell`
  (deferred this sprint as out-of-scope for "no redesign"; see
  `docs/authentication.md` § Platform branding scoping note).
- Multi-seat Super Admin, if ever wanted — currently hard-blocked by the
  `limit_single_super_admin` trigger by design.
- A dedicated audit log viewer/reporting UI — the events are being
  recorded this sprint, but there's no admin-facing screen to browse them
  yet beyond raw table access.
