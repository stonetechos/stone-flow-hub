/**
 * Sprint 1.7.1, Part 6/7 — single server-side source of truth for "does
 * this caller hold Admin or the Platform Super Admin role", used by every
 * server function / route handler that needs an admin-or-above gate.
 *
 * Before this sprint, three separate call sites (`users.functions.ts`'s
 * `requireAdminActor`, `dispatch.functions.ts`'s `assertAdmin`, and the
 * `dispatch-queue.ts` webhook route) each hand-rolled their own
 * `user_roles` query filtered to the literal `role = 'admin'` — meaning the
 * Platform Super Admin (who holds only `super_admin`, never also `admin`)
 * was silently locked out of all three. This module calls the `has_role`
 * Postgres function instead — the authoritative, RLS-independent check
 * that the Part 6 migration also teaches to accept `super_admin` wherever
 * `admin` is checked — so server-side enforcement can never drift from the
 * database's own rule.
 */

export interface AdminActorFlags {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/** Matches the subset of a Supabase client's shape every caller here
 * actually needs — deliberately loose so it accepts both the publishable
 * client (used by server function `context.supabase`) and a client built
 * from a bearer token (used by the external scheduler webhook). */
export interface HasRoleClient {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "super_admin" },
  ) => Promise<{
    data: boolean | null;
    error: { message: string; code?: string } | null;
  }>;
}

/**
 * True when the error is Postgres rejecting `super_admin` as an unknown
 * `app_role` value — i.e. `20260722150001_add_super_admin_role.sql` has not
 * been applied to this database yet.
 *
 * This interface is hand-written rather than derived from
 * `src/integrations/supabase/types.ts`, which is what lets the literal
 * `"super_admin"` above typecheck against a live schema that has never
 * heard of it. The type system therefore cannot catch the mismatch, and
 * the failure lands at runtime as a 22P02 out of `has_role` — taking down
 * `requireAdminActor`, the notification dispatcher and the scheduler
 * webhook together, which is to say every admin-gated surface, all at
 * once, for admins who are perfectly entitled to be there.
 *
 * Deployment order should prevent that (migrations first, then code) but
 * an ordering rule is not a guarantee, and the failure mode is a total
 * admin lockout. Treating this one specific error as "no super admin
 * exists yet" is exactly the behaviour the codebase had before the role
 * was introduced, so it degrades to the previous, correct answer instead
 * of to an outage. It cannot mask a real denial: an unmigrated database
 * has no super_admin rows to find.
 */
function isMissingSuperAdminEnum(error: { message: string; code?: string }): boolean {
  if (error.code === "22P02") return true;
  return /invalid input value for enum/i.test(error.message) && /super_admin/.test(error.message);
}

/**
 * Resolves which of Admin / Platform Super Admin the given user holds.
 * Throws "Admin role required" if neither — callers that also need
 * Super-Admin-only enforcement (e.g. the Users & Roles protections) should
 * branch on the returned flags via `canManageTargetUser` in
 * `src/lib/admin/permissions.ts` rather than re-deriving them.
 */
export async function requireAdminOrSuperAdmin(
  supabase: HasRoleClient,
  userId: string,
): Promise<AdminActorFlags> {
  const [adminRes, superAdminRes] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
  ]);
  if (adminRes.error) throw new Error(adminRes.error.message);
  if (superAdminRes.error && !isMissingSuperAdminEnum(superAdminRes.error)) {
    throw new Error(superAdminRes.error.message);
  }
  if (superAdminRes.error) {
    console.warn(
      "[admin] has_role('super_admin') rejected the role as unknown — the super_admin " +
        "migration has not been applied to this database. Treating no user as super admin.",
    );
  }
  const isAdmin = !!adminRes.data;
  const isSuperAdmin = !superAdminRes.error && !!superAdminRes.data;
  if (!isAdmin && !isSuperAdmin) throw new Error("Admin role required");
  return { isAdmin, isSuperAdmin };
}
