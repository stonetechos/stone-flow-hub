# Sprint 1.7.1 — Platform Hardening & Architecture Corrections

**Status: implementation complete, freezing per sprint instructions.**
Architecture detail (Platform Owner vs Tenant Company, the permission
hierarchy's admin/super_admin inheritance rule, audit fields) lives in
`docs/authentication.md` — this report is the sprint's nine-part
deliverables, plus the assumptions and judgment calls made along the way.
Per the sprint's explicit instructions, **no UI was redesigned and no
unrelated feature was implemented** — every change below traces to one of
the nine numbered parts.

## 1. Files changed

**New:**
- `supabase/migrations/20260722160001_platform_super_admin_bootstrap.sql`
- `supabase/migrations/20260722160002_has_role_super_admin_inheritance.sql`
- `supabase/migrations/20260722160003_activity_log_audit_columns.sql`
- `src/lib/platform/platform.ts`
- `src/lib/platform/application.ts`
- `src/lib/admin/server-auth.ts`
- `src/lib/audit/user-agent.ts` + `user-agent.test.ts`
- `docs/sprint-1.7.1-completion-report.md` (this file)

**Modified:**
- `docs/authentication.md` — new "Platform architecture" section, updated
  Permission hierarchy / Super Admin account / branding / audit events
  sections (Part 8).
- `supabase/migrations/20260722150003_super_admin_protection.sql` — the
  hardcoded `info@stonetech.in` seed INSERT removed (Part 1). Edited in
  place rather than superseded by a new migration — see that file's
  updated header comment for why this specific exception is safe (the
  migration has never been applied to any live database, in either
  sprint's sandbox).
- `src/lib/admin/permissions.ts` — `ADMIN_ROLE`/`PLATFORM_SUPER_ADMIN_ROLE`
  constants (Part 1), `roleSatisfies`/`roleSatisfiesAny` (Part 6/7).
- `src/hooks/use-roles.tsx` — `isAdmin`/`hasRole`/`hasAnyRole` now route
  through `roleSatisfies`/`roleSatisfiesAny`; new `isSuperAdmin` field.
- `src/components/layout/AppShell.tsx`, `src/routes/_authenticated/settings.tsx`
  — replaced ad hoc local `user_roles` admin-check `useEffect`s with
  `useRoles()`.
- `src/lib/admin/users.ts` — `currentUserIsAdmin` now admin-or-super_admin;
  `logRoleChangeAttempt` populates the new audit fields.
- `src/lib/admin/users.functions.ts` — `requireAdminActor` is now a thin
  wrapper over `server-auth.ts`; `logAuditEvent` captures User-Agent/IP/
  browser/OS/platform; `countActiveAdminsExcluding` counts admin OR
  super_admin holders (see § 6 judgment calls).
- `src/lib/notifications/dispatch.functions.ts`,
  `src/routes/api/public/hooks/dispatch-queue.ts` — `assertAdmin`/inline
  check replaced with the shared `requireAdminOrSuperAdmin`.
- `src/integrations/supabase/types.ts` — hand-edited for the new
  `activity_log` columns and the `bootstrap_platform_super_admin` function
  (regenerate for real later, same caveat as Sprint 1.7).
- `src/routes/auth.tsx` — `POWERED_BY_LINE` import moved to
  `@/lib/platform/application`.
- `vite.config.ts` — Part 5 build-time `define` block (git commit hash,
  build timestamp, latest migration filename); also folds a latent
  duplicate-`vite`-key bug fix (see § 2).

**Deleted:**
- `src/lib/branding/platform.ts` — superseded by
  `src/lib/platform/{platform,application}.ts` (Part 2/3).

## 2. Architecture summary

- **Platform Owner vs Tenant Company** (Parts 1-3): Vedora Vision (the
  Platform Owner) and Stone Tech (the Tenant Company running this
  deployment) are now two separate identity modules —
  `src/lib/platform/platform.ts` and `src/lib/platform/application.ts` —
  instead of one conflated `src/lib/branding/platform.ts`. Neither module
  participates in permission decisions; see the next point.
- **Platform Super Admin identity is no longer email-bound** (Part 1): the
  role lives entirely in `user_roles.user_id`. The account is bootstrapped
  once via `public.bootstrap_platform_super_admin(_email)` — an
  operator-only, non-`authenticated`-granted function that uses an email
  purely as a one-time lookup key — rather than a migration-time seed
  keyed to a specific address. `PLATFORM_SUPPORT_EMAIL` in
  `platform.ts` is now purely a display string with a code comment stating
  it has no bearing on permissions.
- **Admin/Super-Admin inheritance is a single rule, enforced three times,
  never duplicated** (Part 6/7): `has_role`/`has_any_role` (Postgres,
  authoritative for every RLS policy), `roleSatisfies`/`roleSatisfiesAny`
  (client, backing `useRoles()`), and `requireAdminOrSuperAdmin` (server
  functions/routes). All three encode exactly the same rule — `super_admin`
  satisfies an `admin` check — and nothing else. This is a genuine
  consolidation: three previously-separate ad hoc `user_roles` queries
  (`users.functions.ts`, `dispatch.functions.ts`, `dispatch-queue.ts`) now
  share one implementation (`src/lib/admin/server-auth.ts`).
- **Vite build-time metadata is real, not fabricated** (Part 5): git
  commit hash, build timestamp, and "latest migration filename" (the
  closest genuine proxy this repo has for a DB schema version) are
  computed once in `vite.config.ts` and injected via Vite's `define`, each
  independently degrading to `null` — never a guess — if unavailable. This
  also folded in a fix for a latent bug in the existing config: the file
  previously declared the `vite:` option key twice in one object literal
  (once unconditionally, once inside a Capacitor-only conditional spread),
  and the second occurrence silently overwrote the first at plain-JS-object
  level — meaning `mcpPlugin()` was dropped from every `build:capacitor`
  run. Fixed as an unavoidable side effect of adding `define` safely to
  both branches without introducing a third such collision.
- **Audit logging captures real request context, not fabricated values**
  (Part 4): `activity_log.ip_address` is now genuinely populated for the
  server-function path via `getRequestIP({ xForwardedFor: true })` — a gap
  Sprint 1.7 explicitly left open. `user_agent`/`browser`/`os`/`platform`
  are new nullable columns, parsed by the new, dependency-free
  `src/lib/audit/user-agent.ts`. Every field is `null`, not guessed, on any
  path that genuinely lacks the underlying signal (an automatic DB
  trigger has no request at all; a client-side write has no server-visible
  IP).

## 3. Permission audit (Part 6) — report

Every location in the TypeScript codebase that compared a role against the
literal string `"admin"` was located and classified below.

**Fixed (now accept `super_admin` via the shared inheritance rule):**

| Location | Before | After |
|---|---|---|
| `public.has_role` / `has_any_role` (all ~20+ RLS policies built on them) | literal `admin` only | `super_admin` inherits (migration `20260722160002`) |
| `useRoles().isAdmin` / `.hasRole()` / `.hasAnyRole()` | literal `admin` only | routed through `roleSatisfies`/`roleSatisfiesAny` |
| Every `<Can anyRole={["admin", ...]}>` / `roles.hasAnyRole([...])` call site (`manufacturing/index.tsx`, `workforce-intelligence/employees/{index,$id}.tsx`, `ProductionOrdersPanel.tsx`, `MasterListPage.tsx`, `CapabilityMatrix.tsx`, `CompanyProfileTab.tsx`, and any future one) | literal `admin` only | fixed automatically — all route through `useRoles()`, no per-file edit needed |
| `AppShell.tsx`, `settings.tsx` sidebar/nav/tab admin gating | ad hoc local `user_roles` query, literal `admin` | `useRoles().isAdmin` |
| `src/lib/admin/users.ts`'s `currentUserIsAdmin()` | literal `admin` only | `admin` OR `super_admin` |
| `users.functions.ts`'s `requireAdminActor` | already checked both roles (Sprint 1.7) — now a thin wrapper over the shared `requireAdminOrSuperAdmin` instead of a second inline copy | same behavior, single implementation |
| `dispatch.functions.ts`'s `assertAdmin` (6 call sites: `checkProviderStatus`, `sendTestMessage`, `dispatchQueueNow`, `sendWhatsappTestTemplate`, `runWhatsappConnectionTest`, `getWhatsappHealth`) | literal `admin` only | `admin` OR `super_admin`, via shared helper |
| `dispatch-queue.ts` external scheduler webhook | literal `admin` only | `admin` OR `super_admin`, via shared helper |
| `users.functions.ts`'s "last active admin" safeguard (`countActiveAdminsExcluding`) | counted literal `admin` holders only | counts `admin` OR `super_admin` holders — see judgment call below |

**Intentionally left admin-only (verified, not a gap):**

| Location | Why it's correct as-is |
|---|---|
| `canManageTargetUser`'s Super-Admin-target branch (`permissions.ts`) | Deliberately Super-Admin-*specific*, not admin-inheritable — the whole point of this function is that the Super Admin is protected from *everyone*, including other admins. |
| `useRoles().isSuperAdmin` | By definition an exact check — inheriting it would make it meaningless. |
| `admin/users.tsx`'s route `beforeLoad` guard | Already checked `.in("role", ["admin", "super_admin"])` since Sprint 1.7 — no change needed. |
| `admin/users.tsx`'s local `self.isAdmin` flag (line ~213) | Feeds `canManageTargetUser`, which already ORs `isSuperAdmin \|\| isAdmin` — a literal check here is harmless because the broader OR happens one level up. |
| `users.functions.ts`'s "is target literally an admin" checks (`deleteAuthUser`/`setUserActive`, deciding whether to run the last-admin safeguard at all) | Correct to stay literal: a Super Admin target never reaches this code — `canManageTargetUser` already denies delete/deactivate against a Super Admin target unconditionally, earlier in the same handler. |
| `nav/config.ts`'s `adminOnly: true` flags | Data declarations, not permission checks — consumed by `resolveNav(prefs, isAdmin)`, which receives the already-inheritance-aware `isAdmin` from `useRoles()`. |
| `admin/users.tsx`'s `qk.users`/`qk.auth` query-key namespacing | The string `"admin"` here is a React Query cache key segment, unrelated to authorization. |

**Judgment call — "last active admin" safeguard**: before this sprint,
`deleteAuthUser`/`setUserActive` blocked removing the very last literal
`admin` role holder, even if a Super Admin (who has a strict superset of
Admin capability, per this sprint's own inheritance fix) remained active
and un-removable. That made the safeguard stricter than the app's own
permission model now justifies. `countActiveAdminsExcluding` now counts
`admin` OR `super_admin` holders — so deleting the last plain Admin is
allowed when the platform-owning Super Admin still exists and remains
fully able to administer the platform. The Super Admin itself was already
unconditionally protected from deletion/deactivation before this change
and still is; this only affects whether *removing a plain Admin* is
blocked.

## 4. Migration notes

Six migrations now exist, in dependency order:

1. `20260722150001` — adds `'super_admin'` to `app_role` (Sprint 1.7).
2. `20260722150002` — adds eight `activity_action` enum values (Sprint 1.7).
3. `20260722150003` — Super Admin protection triggers, `force_password_change`,
   `ip_address` (Sprint 1.7); **edited this sprint** to remove the
   `info@stonetech.in` seed (Part 1) — see § 1.
4. `20260722160001` — `bootstrap_platform_super_admin(_email)` (Part 1).
5. `20260722160002` — `has_role`/`has_any_role` admin/super_admin
   inheritance (Part 6).
6. `20260722160003` — `activity_log` audit columns (Part 4).

**None of these six have been run against a live Postgres instance** —
same as Sprint 1.7, there is no live Supabase project in this sandbox.
After deploying to staging, run
`select public.bootstrap_platform_super_admin('<owner-email>');` once to
grant the first Platform Super Admin (replaces the old automatic seed),
then regenerate `src/integrations/supabase/types.ts` for real.

## 5. Tests executed

- `npm run typecheck` — clean.
- `npm run typecheck:tests` — clean.
- `npm run lint` (scoped re-check on every file this sprint touched, same
  approach as Sprint 1.7 given the documented pre-existing full-repo
  prettier/formatting debt in `docs/CI_LINT_DEBT.md`) — two new prettier
  formatting violations were introduced in previously-clean files
  (`permissions.test.ts` and `settings.tsx`), both auto-fixed with
  `eslint --fix`; the two remaining warnings in `use-roles.tsx`
  (`react-refresh/only-export-components`, `react-hooks/exhaustive-deps`)
  are pre-existing — confirmed via `git stash` that they're present on
  unmodified `use-roles.tsx` too. `src/integrations/supabase/types.ts` was
  **not** prettier-clean before this sprint either (7,370 pre-existing
  problems, part of the documented debt) — the hand-edit for the new
  `activity_log` columns and `bootstrap_platform_super_admin` function
  entry follows that file's existing (unformatted) style rather than
  reformatting the whole generated file, which raises its problem count to
  7,385; this is additional instances of the same pre-existing debt
  category, not a newly-dirtied previously-clean file, consistent with how
  this file is already excluded from the "stay clean" bar in
  `docs/CI_LINT_DEBT.md`.
- `bun test` — **310 pass, 0 fail** (291 pre-existing + 19 new: 8 new
  tests in `permissions.test.ts` covering `roleSatisfies`/
  `roleSatisfiesAny`, 11 new tests in `user-agent.test.ts` covering
  `parseUserAgent`/`derivePlatformFromOrigin`).
- `npm run build` (the standard Cloudflare/Nitro target) — **succeeds**.
  Confirmed the Part 5 build-time `define` values land correctly in the
  compiled output: the built server bundle contains the real git commit
  hash (`547dc02` at the time of this build) and the real latest-migration
  timestamp (`20260722160003`) as literal strings, not the `undefined`
  fallback.
- `npm run build:capacitor` — the build itself (Vite compile + bundling)
  **succeeds**, but the subsequent SPA-prerender step fails in this
  sandbox specifically: TanStack Start's prerender starts a local preview
  server bound to `::` (IPv6 any-address), and this sandbox's network
  namespace returns `EAFNOSUPPORT` for that bind. This reproduces on the
  unmodified pre-sprint `vite.config.ts` too (the prerender step is
  untouched by this sprint's changes — only the `plugins`/`define`
  merging around it changed), so it's a sandbox networking limitation, not
  a regression introduced here. Worth re-verifying in an environment with
  IPv6 loopback support (or CI) before relying on `build:capacitor`.

## 6. Build status

**Green**, with the one caveat above (Capacitor prerender / sandbox
networking) that predates this sprint and isn't caused by it. Typecheck
(prod + test configs), scoped lint, the full test suite, and the standard
`npm run build` all pass clean.

## 7. Regression risks

- **Not run against a live database** — same caveat as Sprint 1.7; see § 4.
- **`types.ts` is hand-edited**, not regenerated, for the same reason as
  Sprint 1.7 (no live project to run `supabase gen types typescript`
  against).
- **The "last active admin" safeguard's behavior changed** (§ 3's judgment
  call) — deleting/deactivating the last plain Admin is now allowed if a
  Super Admin remains. This is a deliberate, reasoned change, not an
  oversight, but it is a behavior change worth a staging-environment
  sanity check before relying on it in production.
- **`PLATFORM_WEBSITE` remains `null`** — no confirmed public Vedora
  Vision domain was found in any project document. Set it in
  `src/lib/platform/platform.ts` once one exists.
- **`PLATFORM_VERSION` and `APPLICATION_VERSION` are both hand-set literals
  (`"1.0.0"`)**, intentionally not derived from each other (would create a
  circular import between `platform.ts` and `application.ts`) — remember
  to update both together until a second Vedora product exists.
- **Capacitor build's SPA prerender step could not be verified end-to-end**
  in this sandbox (§ 5) — re-verify in an environment that supports
  binding a preview server to `::` before shipping a mobile build from
  this branch.
- **The Vite `define`-based build metadata has no live-deployment
  verification** — confirmed the values appear correctly in the built
  server bundle (§ 5), but there was no way to actually load the deployed
  Settings → About page and visually confirm the Platform Information
  card renders them correctly end-to-end.
- **Git push still pending** — per the earlier stop-hook exchange, this
  sandbox has no working GitHub credentials, so this sprint's commit(s)
  exist locally only, same as Sprint 1.7's. Push (or transfer) them from
  wherever this sandbox's history needs to end up.

## 8. Suggested follow-up work

- Run all six migrations against a real staging Supabase project, then run
  `bootstrap_platform_super_admin` once and regenerate `types.ts` for
  real.
- Verify the "last active admin" behavior change (§ 3, § 7) against actual
  staging data — specifically, deleting the last plain Admin while a Super
  Admin remains active.
- Confirm the real Vedora Vision website domain and set
  `PLATFORM_WEBSITE`.
- Re-run `npm run build:capacitor` end-to-end (through the SPA prerender
  step) in an environment with IPv6 loopback/any-address bind support, or
  CI, to confirm it still succeeds beyond what this sandbox could verify.
- A dedicated "promote to Platform Super Admin" admin UI, if multi-seat or
  self-service promotion is ever wanted — currently deliberately SQL-only
  and single-seat, per both this sprint's and Sprint 1.7's scope.
- Reconcile `docs/role-permission-matrix.md` with the real `app_role` enum
  (carried over from Sprint 1.8 suggestions — still not done).
