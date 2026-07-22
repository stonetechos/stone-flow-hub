# Authentication & Authorization — Sprint 1.7 Foundation

This document covers the Super Admin role hierarchy, the permission matrix,
password lifecycle, first-login and reset flows, Super Admin protection, and
audit events introduced in Sprint 1.7 ("Authentication Foundation / Super
Admin Architecture / Platform Branding"). It supersedes nothing in
`docs/role-permission-matrix.md`, which still documents the day-to-day
per-module (leads, projects, vendors, etc.) permission model; this document
is specifically about *user account management* — who can create, edit,
lock, or delete another user's account.

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

## The Super Admin account

- Exactly one Super Admin exists: `info@stonetech.in`, seeded by migration
  `20260722150003_super_admin_protection.sql`. The seed is a no-op INSERT
  keyed off that email already existing in `auth.users` — if the account
  doesn't exist yet in a given environment, create it first (sign up or
  invite as usual), then either re-run that INSERT once or run it manually:
  ```sql
  insert into public.user_roles (user_id, role)
  select id, 'super_admin' from auth.users where email = 'info@stonetech.in';
  ```
- A database trigger (`limit_single_super_admin`) blocks inserting a second
  `super_admin` row. There is deliberately no "Promote to Super Admin" UI
  anywhere in this sprint — multi-seat Super Admin is left for a future
  sprint to decide, not something this one silently allows via direct SQL
  alone.

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

## Vedora Vision platform branding (Part 9)

Stone Tech OS is the first product built and operated by **Vedora Vision**.
This sprint introduces `src/lib/branding/platform.ts` — a small,
dependency-free module holding the platform name, product name/category,
and the exact attribution strings — kept deliberately separate from
`src/lib/branding/index.ts` (per-tenant Company Profile branding used on
generated documents, unrelated to this).

Where it shows up:

- **Login screen**: every `/auth` flow card now shows "Stone Tech OS ·
  Powered by Vedora Vision" beneath the existing "Accounts are provisioned
  by an administrator" line.
- **Settings → About** (new tab): "Stone Tech OS", "Enterprise ERP
  Platform", "Built by Vedora Vision", and a copyright line.

Stone Tech OS's own wordmark, logo, and product identity are unchanged
everywhere else — Vedora Vision is attributed, not substituted. The module
is intentionally reusable so a future sibling product (Vedora CRM, Vedora
Finance, Vedora HR, Vedora Manufacturing, etc.) can import the same
constants rather than re-declaring the company name per product.

**Scoping note**: the sprint's example list included a persistent page
footer. This sprint does not add one to `AppShell` (the authenticated
layout used on every page) — doing so would add a new, always-visible
layout element across the entire application, which reads as more of a
layout change than "subtle branding" for an implementation-only sprint.
The footer requirement is satisfied via the login screen and Settings →
About instead. If a persistent in-app footer is wanted, that's a explicit,
reviewable follow-up (see Sprint 1.8 suggestions in the sprint completion
report).

## Audit events (Part 8)

All audit events are rows in the existing polymorphic `public.activity_log`
table (`entity_type = 'user'`, `entity_id` = the affected user's id). Two
new columns/mechanisms support this sprint:

- `activity_log.ip_address inet` — added, but **not populated** by any path
  in this sprint. No request-IP plumbing currently reaches the
  `requireSupabaseAuth` middleware's context, and this sprint deliberately
  avoided modifying that auto-generated middleware file to add it (see the
  Sprint 1.7 completion report's Regression Risks / manual-QA notes for the
  reasoning and the follow-up recommendation). The column exists so a
  future sprint can populate it without another migration.
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

- No live Supabase project was available in the sandbox this sprint was
  implemented in. All three migrations were written and reasoned about
  against the existing schema, but **could not be run against a real
  Postgres instance** — run them in a staging Supabase project and confirm
  the enum-transaction ordering (see the migration file comments) before
  deploying.
- `src/integrations/supabase/types.ts` was hand-edited to keep the
  TypeScript build green against the new schema (columns/enum values),
  since there was no live project to regenerate it from
  (`supabase gen types typescript`). Regenerate it for real against the
  actual project after the migrations are applied, to avoid drift between
  the hand-edit and the real database.
- IP address audit capture is plumbed as a column but not populated (see
  above).
