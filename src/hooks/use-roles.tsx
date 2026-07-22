/**
 * Role hook. Reads the current user's roles from `user_roles` once and caches
 * via react-query so every gated control renders synchronously after the first
 * fetch. Pair with `<Can/>` for JSX-level guards.
 *
 * Server-side RLS remains the source of truth for authorization; this hook
 * only hides UI so users don't see actions their role can't perform.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/admin/users";
import { roleSatisfies, roleSatisfiesAny } from "@/lib/admin/permissions";
import { useAuthReady } from "./use-auth-ready";

export type { AppRole };

interface RolesState {
  isReady: boolean;
  roles: AppRole[];
  /** True for both plain `admin` holders and the Platform Super Admin
   * (Sprint 1.7.1, Part 6 — `super_admin` inherits every `admin` check via
   * `roleSatisfies`, mirroring the database's `has_role` function). */
  isAdmin: boolean;
  /** True only for the literal `super_admin` role — use this when a check
   * is genuinely Super-Admin-only (e.g. the Users & Roles protections in
   * `src/lib/admin/permissions.ts`), not as a substitute for `isAdmin`. */
  isSuperAdmin: boolean;
  isSalesManager: boolean;
  /** Inheritance-aware — `hasRole("admin")` is true for a Platform Super
   * Admin too (see `roleSatisfies`). Every other role is an exact check, as
   * there is no other inheritance rule. */
  hasRole: (role: AppRole) => boolean;
  /** Inheritance-aware — a `super_admin` holder satisfies `["admin", ...]`
   * even without literally holding `admin`. See `roleSatisfiesAny`. */
  hasAnyRole: (roles: readonly AppRole[]) => boolean;
  /** Can create/edit rows (any staff role, or the Platform Super Admin). */
  canWrite: boolean;
  /** Can delete rows (admin, sales_manager, or the Platform Super Admin). */
  canDelete: boolean;
}

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as AppRole);
}

export function useRoles(): RolesState {
  const auth = useAuthReady();
  const uid = auth.user?.id ?? null;
  const q = useQuery({
    queryKey: ["me", "roles", uid],
    queryFn: () => fetchRoles(uid!),
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
  const roles = q.data ?? [];
  return useMemo<RolesState>(() => {
    // Sprint 1.7.1, Part 6/7 — routed through the single shared
    // roleSatisfies[Any] implementation in src/lib/admin/permissions.ts
    // rather than a bespoke Set-membership check, so this hook and the
    // database's has_role/has_any_role functions can never drift apart on
    // the admin/super_admin inheritance rule.
    const has = (r: AppRole) => roleSatisfies(roles, r);
    const hasAny = (rs: readonly AppRole[]) => roleSatisfiesAny(roles, rs);
    return {
      isReady: auth.isReady && (!uid || q.isFetched),
      roles,
      isAdmin: has("admin"),
      isSuperAdmin: roles.includes("super_admin"),
      isSalesManager: has("sales_manager"),
      hasRole: has,
      hasAnyRole: hasAny,
      canWrite: hasAny(["admin", "sales_manager", "sales", "purchase"]),
      canDelete: hasAny(["admin", "sales_manager"]),
    };
  }, [roles, auth.isReady, uid, q.isFetched]);
}

/** Hide children unless the current user has one of the given roles. */
export function Can({
  role,
  anyRole,
  fallback = null,
  children,
}: {
  role?: AppRole;
  anyRole?: readonly AppRole[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const r = useRoles();
  if (!r.isReady) return null;
  if (role && !r.hasRole(role)) return <>{fallback}</>;
  if (anyRole && !r.hasAnyRole(anyRole)) return <>{fallback}</>;
  return <>{children}</>;
}
