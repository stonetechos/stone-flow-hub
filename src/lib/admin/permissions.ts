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
  // Part 3: the Super Admin account is immutable to everyone but itself,
  // and even the Super Admin cannot self-delete or self-deactivate (there
  // would be nothing left to administer the platform).
  if (target.isSuperAdmin) {
    if (action === "reset_password") {
      // "Only the Super Admin may edit ... its own password" — anyone else,
      // including another Super Admin in a future multi-seat world, is
      // denied. Since only one Super Admin ever exists in Sprint 1.7, this
      // reduces to "must be acting on themselves".
      if (actor.id === target.id) return { allowed: true };
      return { allowed: false, reason: PROTECTED_MESSAGE };
    }
    // delete / deactivate / revoke_role / change_role: never allowed, by
    // anyone, including the Super Admin themselves.
    return { allowed: false, reason: PROTECTED_MESSAGE };
  }

  // Target is not the Super Admin — Part 4: Admins keep every existing
  // permission for every non-Super-Admin target, including other Admins.
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
