/**
 * Sprint 1.7, Parts 2-4 — Super Admin hierarchy and the authorization rules
 * that fall out of it.
 *
 * This module is deliberately pure (no Supabase import, no I/O) so the exact
 * user-management decision matrix Sprint 1.7 specifies can be unit-tested
 * directly, without mocking a database — see `permissions.test.ts`.
 *
 * Role hierarchy (highest to lowest):
 *   SUPER_ADMIN > ADMIN > MANAGER > EMPLOYEE > VENDOR > CUSTOMER
 *
 * `public.app_role` in this schema only encodes four of those tiers plus the
 * new `super_admin` value — `admin`, `sales_manager` / `purchase` (MANAGER
 * tier), `sales` (EMPLOYEE tier), and the vendor portal's own separate
 * `vendor` accounts are not managed through `public.user_roles` at all. This
 * module works in terms of the two roles that actually matter for these
 * rules — "is this account the Super Admin" and "is this account an Admin"
 * — rather than re-deriving the full six-tier hierarchy from `app_role`,
 * since Sprint 1.7 does not rename or restructure the existing roles (see
 * docs/authentication.md for the full mapping and why).
 */

/**
 * Named role constants, so nothing in the codebase
 * spells the role literal out by hand. Typed as bare `string` (not
 * `AppRole`) deliberately: `AppRole` is defined in `src/lib/admin/users.ts`,
 * which already imports FROM this file — importing the type back here
 * would create a circular module dependency. Every real call site narrows
 * these to `AppRole` implicitly by comparing against `role` columns that
 * are already typed as `AppRole`.
 */
export const ADMIN_ROLE = "admin";
export const PLATFORM_SUPER_ADMIN_ROLE = "super_admin";

export interface ManagedUserRef {
  id: string;
  isSuperAdmin: boolean;
}

export interface ActingUserRef {
  id: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export type UserManagementAction =
  | "delete"
  | "deactivate"
  | "reset_password"
  | "revoke_role"
  | "change_role";

/**
 * Sprint 1.7.1, Part 6/7 — single client-side source of truth for "does
 * this set of held roles satisfy a required role". Encodes exactly one
 * inheritance rule: a caller holding `PLATFORM_SUPER_ADMIN_ROLE` satisfies
 * any check for `ADMIN_ROLE`, since the Platform Super Admin is a strict
 * superset of Admin capability and is granted only the `super_admin` row
 * (never also `admin`) — see docs/authentication.md § Permission hierarchy.
 * No other inheritance is implied. This mirrors the `has_role`/
 * `has_any_role` Postgres functions (see the Part 6 migration) so client
 * UI gating and database enforcement agree on the same rule; consumed by
 * `useRoles()` in `src/hooks/use-roles.tsx` rather than re-implemented at
 * each call site.
 */
export function roleSatisfies(heldRoles: readonly string[], required: string): boolean {
  if (heldRoles.includes(required)) return true;
  if (required === ADMIN_ROLE && heldRoles.includes(PLATFORM_SUPER_ADMIN_ROLE)) return true;
  return false;
}

/** `roleSatisfies`, but true if ANY of `required` is satisfied. */
export function roleSatisfiesAny(
  heldRoles: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((r) => roleSatisfies(heldRoles, r));
}

export interface PermissionResult {
  allowed: boolean;
  /** Present when allowed is false — the exact copy Part 3 specifies. */
  reason?: string;
}

const PROTECTED_MESSAGE = "This account is protected.";

/**
 * Central decision point for every destructive or sensitive action a caller
 * can take against another user's account. Called by both the server
 * functions (`users.functions.ts`) and the client-side row actions
 * (`admin/users.tsx`) so the same rule is enforced (and explained) in both
 * places rather than duplicated ad hoc.
 */
export function canManageTargetUser(
  actor: ActingUserRef,
  target: ManagedUserRef,
  action: UserManagementAction,
): PermissionResult {
  // Multi-Seat Super Admin governance:
  // Standard Admins can never modify or revoke a Super Admin account.
  // Super Admins CAN manage other Super Admin accounts, but cannot self-delete,
  // self-deactivate, or self-demote (preventing orphaned administration).
  if (target.isSuperAdmin) {
    if (!actor.isSuperAdmin) {
      return { allowed: false, reason: PROTECTED_MESSAGE };
    }

    // Actor IS a Super Admin:
    if (action === "reset_password") {
      return { allowed: true };
    }

    if (actor.id === target.id) {
      if (action === "delete" || action === "deactivate") {
        return { allowed: false, reason: "You cannot delete or deactivate your own account." };
      }
      if (action === "revoke_role") {
        return { allowed: false, reason: "You cannot remove your own administrator role." };
      }
    }

    // A Super Admin managing another Super Admin
    return { allowed: true };
  }

  // Target is not a Super Admin — Admins and Super Admins have full management access
  if (actor.isSuperAdmin || actor.isAdmin) {
    return { allowed: true };
  }

  return { allowed: false, reason: "You don't have permission to manage this user." };
}

/** Convenience wrapper — throws with the exact Part 3 copy when denied, for
 * call sites that want to fail fast rather than branch on the result. */
export function assertCanManageTargetUser(
  actor: ActingUserRef,
  target: ManagedUserRef,
  action: UserManagementAction,
): void {
  const result = canManageTargetUser(actor, target, action);
  if (!result.allowed) throw new Error(result.reason ?? "Forbidden");
}
