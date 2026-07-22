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
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
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
  if (superAdminRes.error) throw new Error(superAdminRes.error.message);
  const isAdmin = !!adminRes.data;
  const isSuperAdmin = !!superAdminRes.data;
  if (!isAdmin && !isSuperAdmin) throw new Error("Admin role required");
  return { isAdmin, isSuperAdmin };
}
