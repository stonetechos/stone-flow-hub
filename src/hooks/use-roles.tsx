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
import { useAuthReady } from "./use-auth-ready";

export type { AppRole };

interface RolesState {
  isReady: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isSalesManager: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: readonly AppRole[]) => boolean;
  /** Can create/edit rows (any staff role). */
  canWrite: boolean;
  /** Can delete rows (admin or sales_manager). */
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
    const set = new Set(roles);
    const has = (r: AppRole) => set.has(r);
    const hasAny = (rs: readonly AppRole[]) => rs.some((r) => set.has(r));
    return {
      isReady: auth.isReady && (!uid || q.isFetched),
      roles,
      isAdmin: has("admin"),
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
