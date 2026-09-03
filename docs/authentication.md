# Authentication & Authorization — Sprint 1.7 / 1.7.1

This document covers the Super Admin role hierarchy, the platform
architecture, the permission matrix, password lifecycle, first-login and
reset flows, Super Admin protection, and audit events introduced in Sprint
1.7 ("Authentication Foundation / Super Admin Architecture / Platform
Branding") and Sprint 1.7.1 ("Platform Hardening & Architecture
Corrections"). It supersedes nothing in `docs/role-permission-matrix.md`,
which still documents the day-to-day per-module (leads, projects, vendors,
etc.) permission model; this document is specifically about *user account
management* — who can create, edit, lock, or delete another user's account
— plus, as of Sprint 1.7.1, the platform-vs-tenant architecture that
account management sits inside.

## Platform architecture (Sprint 1.7.1, Parts 1-3)

Two distinct concepts, previously conflated in Sprint 1.7's naming, are now
kept separate everywhere in the codebase:

- **Platform Owner** — **Vedora Vision**, the company that builds and
  operates this application and any future sibling products built on the
  same foundation. Identity lives in `src/lib/platform/platform.ts`
  (`PLATFORM_NAME`, `PLATFORM_COMPANY_NAME`, `PLATFORM_WEBSITE`,
  `PLATFORM_SUPPORT_EMAIL`, `PLATFORM_VERSION`, `platformCopyrightLine`).
  The **Platform Super Admin** role (`super_admin` in `public.app_role`) is
  the account-management representation of this — see below.
- **Tenant Company** — **Stone Tech**, the company this specific deployment
  of the product (**Stone Tech OS**) is run for. Application identity lives
  in `src/lib/platform/application.ts` (`APPLICATION_NAME`,
  `APPLICATION_CATEGORY`, `APPLICATION_VERSION`, plus Part 5's build
  metadata — see below). Stone Tech's own business data (customers,
  quotations, projects, etc.) is everything else in this codebase and is
  unaffected by this split — this is specifically about *which module owns
  which branding/identity string*, not a data-model change.

These two modules replace `src/lib/branding/platform.ts` (Sprint 1.7),
which mixed both concepts into one file. `src/lib/branding/index.ts`
(per-tenant Company Profile branding used on generated documents like
quotations and POs) is unrelated to either and is untouched.

**Future SaaS architecture note**: nothing in `public.app_role`,
`user_roles`, or the platform/application modules currently encodes
*which* tenant company a given deployment serves, because Stone Tech OS is
presently a single-tenant deployment (one Postgres schema, one company).
The Platform Owner vs Tenant Company naming split done in this sprint is
intentionally the groundwork for a future multi-tenant version — where a
`companies`/`tenants` table would exist, `PLATFORM_SUPER_ADMIN_ROLE` would
mean "operates the whole platform across every tenant," and a
tenant-scoped "Company Owner" role would sit below it per tenant. That
table and role do not exist yet; this sprint only established the naming
and module boundary so a future sprint can add them without another
platform-vs-tenant rename.

## Role hierarchy

Sprint 1.7 specifies a six-tier conceptual hierarchy:

```
SUPER_ADMIN → ADMIN → MANAGER → EMPLOYEE → VENDOR → CUSTOMER
```

The actual `public.app_role` Postgres enum, and this codebase's existing
role-based access control, only encodes part of that hierarchy today:
`admin`, `sales_manager` / `purchase` (roughly the MANAGER tier), and
`sales` (roughly the EMPLOYEE tier). Vendor and customer portal accounts are
handled through separate tables (`vendor_users`, customer auth), not
`user_roles`.

Per the sprint's explicit "No redesign. No unrelated refactoring. Preserve
all existing permissions" constraints, this sprint does **not** rename or
restructure any of those existing roles. It adds exactly one new enum
value, `super_admin`, sitting above everything else. Everywhere this
sprint's logic needs to reason about the hierarchy, it does so in terms of
two flags — "is this account the Super Admin" and "is this account an
Admin" — rather than re-deriving the full six-tier list, since only those
two distinctions actually change behavior. See
`src/lib/admin/permissions.ts` for the single source of truth.

### Permission hierarchy — admin inheritance (Sprint 1.7.1, Part 6)

Sprint 1.7 added the `super_admin` role but granted it *only* that role —
never also `admin` — which meant every place in the codebase that checked
specifically for `admin` (roughly twenty RLS policies, plus several
application call sites that had grown their own ad hoc `user_roles`
queries instead of going through the shared helpers) silently rejected the
Platform Super Admin. Sprint 1.7.1 fixes this with exactly one inheritance
rule, implemented in three places that are kept in agreement by design:

- **Database**: `public.has_role` / `public.has_any_role` (migration
  `20260722160002_has_role_super_admin_inheritance.sql`) — a caller holding
  `super_admin` satisfies any `has_role(uid, 'admin')` /
  `has_any_role(uid, ARRAY['admin', ...])` check. This is what every RLS
  policy in the schema is built on, so the fix applies everywhere at once.
- **Client**: `roleSatisfies` / `roleSatisfiesAny`
  (`src/lib/admin/permissions.ts`), consumed by `useRoles()`
  (`src/hooks/use-roles.tsx`) — `useRoles().isAdmin`,
  `hasRole("admin")`, and `hasAnyRole([...])` all apply the same rule.
- **Server functions**: `requireAdminOrSuperAdmin`
  (`src/lib/admin/server-auth.ts`) — checks both roles via two `has_role`
  RPC calls and accepts either, used by every server function/route that
  needs an admin-or-above gate.

No other inheritance exists — this only ever widens an `admin` check to
also accept `super_admin`; every other role comparison in the app remains
an exact match.

## The Super Admin account

- Exactly one Super Admin can exist at a time — enforced by the
  `limit_single_super_admin` database trigger, which blocks inserting a
  second `super_admin` row. There is still deliberately no "Promote to
  Super Admin" UI anywhere in this application — multi-seat Super Admin is
  left for a future sprint to decide.
- **Sprint 1.7.1, Part 1**: the account's identity no longer depends on any
  specific email address. Sprint 1.7 originally seeded the role via a
  migration-time `INSERT ... WHERE email = 'info@stonetech.in'`; that seed
  is gone (see the updated comment in
  `20260722150003_super_admin_protection.sql` for why editing that specific
  migration in place was safe — it had never been applied anywhere).
  Bootstrapping the first Platform Super Admin is now an explicit, one-time
  operator action:
  ```sql
  select public.bootstrap_platform_super_admin('someone@example.com');
  ```
  (migration `20260722160001_platform_super_admin_bootstrap.sql`) — an
  idempotent, `SECURITY DEFINER` function, deliberately **not** granted to
  `authenticated`/`anon`, so it can only be run via the Supabase SQL editor
  or another service-role context, never from the app itself. The email is
  a one-time lookup key to find the `auth.users` row to grant the role to
  — once granted, the role lives entirely in `user_roles.user_id`, and the
  account's email can be changed afterwards with zero effect on who holds
  the role.

## Permission matrix

| Action                          | Target: Super Admin                          | Target: anyone else       |
|----------------------------------|-----------------------------------------------|----------------------------|
| Delete account                   | Denied for everyone, including itself         | Allowed for Admin/Super Admin (blocked for self, and for the last active Admin) |
| Deactivate account                | Denied for everyone, including itself         | Allowed for Admin/Super Admin (blocked for self, and for the last active Admin) |
| Change / revoke role              | Denied for everyone, including itself         | Allowed for Admin/Super Admin |
| Reset password                    | Allowed only for itself                       | Allowed for Admin/Super Admin |
| Edit own profile fields (name, avatar, etc.) | Allowed for itself only          | Normal profile rules apply |

Every denied case in this table surfaces the exact copy **"This account is
protected."**, per the sprint's Part 3 requirement. The matrix is
implemented once, as a pure function, in `src/lib/admin/permissions.ts`
(`canManageTargetUser` / `assertCanManageTargetUser`), and is exercised by
both:

- the server functions in `src/lib/admin/users.functions.ts`
  (`deleteAuthUser`, `setUserActive`, `resetUserPassword`), and
- the client-side row actions in `src/routes/_authenticated/admin/users.tsx`
  (disabling/hiding the relevant buttons) and the guarded role-change
  helpers in `src/lib/admin/users.ts` (`assignRoleGuarded`,
  `revokeRoleGuarded`).

Admins keep every permission they had before this sprint — Create, Read,
Update, Delete, Invite, and Role Assignment over every account that is not
the Super Admin. The **only** change to Admin capability is the row above:
Admins cannot delete, deactivate, or change the role of the Super Admin,
and cannot reset the Super Admin's password.

### Defense in depth

The application-layer checks above are a UX/fast-fail convenience, not the
sole enforcement point. The authoritative, un-bypassable enforcement lives
in Postgres triggers (migration `20260722150003_super_admin_protection.sql`):

- `protect_super_admin_role_mutation` — `BEFORE UPDATE OR DELETE` on
  `user_roles`; raises if the row being touched has `role = 'super_admin'`.
- `protect_super_admin_profile` — `BEFORE UPDATE OR DELETE` on `profiles`;
  raises on any delete of the Super Admin's profile row, and on the
  `is_active: true → false` transition.

These fire regardless of which Supabase client issued the write — including
`supabaseAdmin` (the service-role client server functions use), which
bypasses Row Level Security but **not** triggers. This is the same
"enforced at more than one layer" pattern already used elsewhere in this
codebase (e.g. the last-active-admin guard in `deleteAuthUser`).

## Password lifecycle

Per Part 5, this application never generates a password on the user's
behalf:

- **Account creation with a password** (`PasswordCreateForm` /
  `createUserWithPassword`): the Super Admin (or Admin) types the exact
  password the new user's account is created with. The "Generate" random-
  password button that previously existed here has been removed. The new
  account is created with `profiles.force_password_change = true`.
- **Direct password reset** (`SetPasswordDialog` / `resetUserPassword`,
  Part 6): same rule — the caller types the new password, which takes
  effect immediately, and `force_password_change` is set to `true`.
- **Self-service reset link** ("Send password reset" / `sendPasswordReset`)
  is unchanged by this sprint — it emails the user a Supabase reset link
  they complete themselves, and does not touch `force_password_change`
  (the user is choosing their own password by definition).

`force_password_change` is a `boolean not null default false` column on
`public.profiles`, added by migration `20260722150003`.

## First-login / forced password change flow (Part 7)

`src/routes/_authenticated/route.tsx`'s `beforeLoad` checks
`profiles.force_password_change` immediately after confirming the user is
signed in. If set, it redirects to `/auth?flow=force-change` instead of
letting any authenticated route render — so the dashboard (or any other
authenticated page) is unreachable until the flag clears, regardless of
which URL the user first lands on.

`/auth?flow=force-change` reuses the existing `UpdatePasswordCard`
component (the same one used for the email-link "set a new password" and
"accept invite" flows) with a `forceChange` prop that changes its copy to
explain why the screen is mandatory. On successful submit it calls
`supabase.auth.updateUser({ password })`, then clears
`profiles.force_password_change` for the current user, then routes to
`/dashboard` (or `/vendor/dashboard` for vendor portal accounts, mirroring
the existing sign-in redirect logic).

## Reset flow (Part 6) — administrator-driven

Distinct from the self-service email link above: an Admin or Super Admin
can set a user's password directly from Users & Roles → row actions → "Set
new password". This is a new dialog (`SetPasswordDialog`) backed by a new
server function, `resetUserPassword`
(`src/lib/admin/users.functions.ts`), which:

1. Confirms the caller is an Admin or Super Admin.
2. Runs the target through `canManageTargetUser(..., "reset_password")` —
   denied (with "This account is protected.") unless the target isn't the
   Super Admin, or the caller *is* the Super Admin acting on themselves.
3. Calls `supabaseAdmin.auth.admin.updateUserById(userId, { password })`.
4. Sets `force_password_change = true` on the target's profile.
5. Records a `password_reset` audit event.

The user then signs in with the new password directly (no email step).

## Vedora Vision platform branding (Sprint 1.7 Part 9, superseded module in Sprint 1.7.1 Part 2)

Stone Tech OS is the first product built and operated by **Vedora Vision**.
Sprint 1.7 introduced a single `src/lib/branding/platform.ts` module for
this; Sprint 1.7.1 Part 2/3 split it into
`src/lib/platform/platform.ts` (Platform Owner identity) and
`src/lib/platform/application.ts` (this product's identity + Part 5's
build metadata) — see "Platform architecture" above for why. Both remain
kept deliberately separate from `src/lib/branding/index.ts` (per-tenant
Company Profile branding used on generated documents, unrelated to
either).

Where it shows up:

- **Login screen**: every `/auth` flow card shows "Stone Tech OS · Powered
  by Vedora Vision" beneath the existing "Accounts are provisioned by an
  administrator" line (`POWERED_BY_LINE`, `src/lib/platform/application.ts`).
- **Settings → About** (tab): the original "Stone Tech OS", "Enterprise ERP
  Platform", "Built by Vedora Vision", and copyright line, plus a new
  **Platform Information** card (Sprint 1.7.1, Part 5) listing Application
  Name, Application Version, Build Version, Git Commit Hash, Platform
  Version, Database Schema Version, Platform Owner, Support Email, and
  Copyright. Any field this deployment doesn't genuinely have a value for
  (e.g. no git repository present at build time) renders "Not available" —
  never a fabricated value. See `src/lib/platform/application.ts` and
  `vite.config.ts` for exactly how each build-time value is computed.

Stone Tech OS's own wordmark, logo, and product identity are unchanged
everywhere else — Vedora Vision is attributed, not substituted. The
`platform.ts` module is intentionally reusable so a future sibling product
(Vedora CRM, Vedora Finance, Vedora HR, Vedora Manufacturing, etc.) can
import the same Platform Owner constants rather than re-declaring the
company name per product; each such product would bring its own
`application.ts`-equivalent module for its own identity.

**Scoping note**: the sprint's example list included a persistent page
footer. This sprint does not add one to `AppShell` (the authenticated
layout used on every page) — doing so would add a new, always-visible
layout element across the entire application, which reads as more of a
layout change than "subtle branding" for an implementation-only sprint.
The footer requirement is satisfied via the login screen and Settings →
About instead. If a persistent in-app footer is wanted, that's a explicit,
reviewable follow-up (see Sprint 1.8 suggestions in the sprint completion
report).

## Audit events (Sprint 1.7 Part 8, extended in Sprint 1.7.1 Part 4)

All audit events are rows in the existing polymorphic `public.activity_log`
table (`entity_type = 'user'`, `entity_id` = the affected user's id).

- `activity_log.ip_address inet` — added by Sprint 1.7, and **now populated**
  as of Sprint 1.7.1 Part 4 for the server-function audit path
  (`logAuditEvent` in `src/lib/admin/users.functions.ts`), via TanStack
  Start's `getRequestIP({ xForwardedFor: true })`. Client-side audit writes
  (`logRoleChangeAttempt` in `src/lib/admin/users.ts`) have no request to
  read an IP from and leave it `null`, same as before — this is a genuine
  capability gap for that one path, not an oversight.
- `activity_log.user_agent`, `.browser`, `.os`, `.platform text` — added by
  migration `20260722160003_activity_log_audit_columns.sql`. Populated by
  both audit-logging call sites above: `user_agent` from the request's
  `User-Agent` header (server) or `navigator.userAgent` (client); `browser`
  / `os` parsed from it by `src/lib/audit/user-agent.ts`'s
  `parseUserAgent`; `platform` ("Web" vs "Capacitor") derived from the
  request/window origin by the same module's `derivePlatformFromOrigin`,
  reusing the existing `isCapacitorAppOrigin` allowlist
  (`src/lib/capacitor/server-origin-allowlist.ts`). Every one of these is
  `null` when genuinely unavailable (e.g. the automatic `log_role_change`
  DB trigger has no request context at all) rather than guessed — see Part
  4's "do not fake values" principle, applied consistently across every
  field, not just IP.
- `public.activity_action` enum gained: `user_created`, `password_reset`,
  `role_changed`, `user_activated`, `user_deactivated`, `user_deleted`,
  `super_admin_delete_attempted`, `super_admin_role_change_attempted`.

| Event | Where it's recorded |
|---|---|
| `user_created` | `inviteUser` and `createUserWithPassword` server functions |
| `password_reset` | `resetUserPassword` server function |
| `role_changed` | Automatic — DB trigger `log_role_change` on every `user_roles` insert/delete (covers every grant/revoke path, not just the admin UI) |
| `user_activated` / `user_deactivated` | `setUserActive` server function |
| `user_deleted` | `deleteAuthUser` server function |
| `super_admin_delete_attempted` | `deleteAuthUser`, when the permission check denies a delete against the Super Admin |
| `super_admin_role_change_attempted` | `assignRoleGuarded` / `revokeRoleGuarded` (`src/lib/admin/users.ts`), when the permission check denies a role grant/revoke against the Super Admin |

Denied attempts to reset the Super Admin's password or deactivate the
Super Admin are blocked (with "This account is protected.") but do **not**
record a bespoke "attempted" event — the sprint's Part 8 list names only
"Attempted Super Admin Delete" and "Attempted Super Admin Role Change" as
distinct event types, and inventing a third/fourth category not asked for
seemed worse than simply not logging one. Every one of those denials is
still visible in application logs (`console.error`-free — they throw and
the caller sees the message), just not as an `activity_log` row. Revisit
this if Part 8's intent was actually "every denial, categorized or not."

`role_changed` fires automatically for every `user_roles` write regardless
of code path (the client-side `assignRole`/`revokeRole` calls in
`src/lib/admin/users.ts`, or any future path), because it's a DB trigger —
consistent with the existing generic `log_activity()` trigger pattern this
codebase already uses for customers/projects/vendors/etc.

## Known limitations / assumptions (read before relying on this in production)

- No live Supabase project was available in the sandbox either sprint was
  implemented in. All six migrations (three from Sprint 1.7, three from
  Sprint 1.7.1) were written and reasoned about against the existing
  schema, but **could not be run against a real Postgres instance** — run
  them in a staging Supabase project, in numeric filename order, and
  confirm the enum-transaction ordering (see the migration file comments)
  before deploying.
- `src/integrations/supabase/types.ts` was hand-edited to keep the
  TypeScript build green against the new schema (columns/enum values),
  since there was no live project to regenerate it from
  (`supabase gen types typescript`). Regenerate it for real against the
  actual project after the migrations are applied, to avoid drift between
  the hand-edit and the real database.
- The `PLATFORM_WEBSITE` constant in `src/lib/platform/platform.ts` is
  `null` — no confirmed public Vedora Vision domain was found in any
  project document as of Sprint 1.7.1. Set it once a real domain exists.
- `PLATFORM_VERSION` (`src/lib/platform/platform.ts`) and
  `APPLICATION_VERSION` (`src/lib/platform/application.ts`) are both
  literal `"1.0.0"`, intentionally duplicated rather than one importing the
  other (would create a circular module dependency between the two
  files) — update both together until a second Vedora product exists and
  the two are free to diverge.
- The Sprint 1.7.1 Part 5 build-time constants (`BUILD_TIME`,
  `BUILD_VERSION`, `GIT_COMMIT_HASH`, `DB_SCHEMA_VERSION`) come from a new
  `define` block in `vite.config.ts` — see the Sprint 1.7.1 completion
  report § Tests executed for exactly what `npm run build` verified about
  it in this sandbox (there is still no live deployment target to confirm
  the values render correctly in a real Settings → About page against).
