/** Admin User Management data access. Uses profiles + user_roles. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export const APP_ROLES: readonly AppRole[] = [
  "admin",
  "sales_manager",
  "sales",
  "purchase",
] as const;

export interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

export async function listAppUsers(): Promise<UserRow[]> {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: true });
  if (pErr) throw new AppError(mapDbError(pErr));

  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id, role");
  if (rErr) throw new AppError(mapDbError(rErr));

  const rolesByUser = new Map<string, AppRole[]>();
  (roles ?? []).forEach((r) => {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  });

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    created_at: p.created_at,
    roles: rolesByUser.get(p.id) ?? [],
  }));
}

export async function assignRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role })
    .select("id")
    .maybeSingle();
  if (error && error.code !== "23505") throw new AppError(mapDbError(error));
}

export async function revokeRole(userId: string, role: AppRole): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw new AppError(mapDbError(error));
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth`,
  });
  if (error) throw new AppError(error.message);
}

/**
 * Admin-only: set a user's human-readable display name in `profiles.full_name`.
 * Does NOT modify auth identity, email, roles, or user id. Requires the admin
 * profile UPDATE policy on `public.profiles`.
 */
export async function updateDisplayName(userId: string, fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed.length ? trimmed : null })
    .eq("id", userId);
  if (error) throw new AppError(mapDbError(error));
}

export async function currentUserIsAdmin(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess.user?.id;
  if (!uid) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}
