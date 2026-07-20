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

/**
 * Fallback shown when a profile has no `full_name` set yet. Derives a display
 * label from the email local-part (before `@`). Once an admin assigns a real
 * `full_name`, callers should prefer that value.
 */
export function fallbackName(email: string | null | undefined): string {
  if (!email) return "User";
  const local = email.split("@")[0] ?? "";
  return local || "User";
}

/**
 * Canonical resolver used everywhere the UI needs to render a person's name.
 * Prefers profiles.full_name; falls back to the email local-part until an
 * admin sets a display name from the Users & Roles page.
 */
export function resolveDisplayName(input: {
  full_name?: string | null;
  email?: string | null;
}): string {
  const name = input.full_name?.trim();
  if (name) return name;
  return fallbackName(input.email);
}

/**
 * Auto-derive initials from a display name. Uses first + last word initials
 * (max 3 chars). Falls back to email local-part. Editable by admin/user.
 */
export function deriveInitials(name?: string | null, email?: string | null): string {
  const base = (name ?? "").trim();
  if (base) {
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    const first = parts[0]![0] ?? "";
    const last = parts[parts.length - 1]![0] ?? "";
    return (first + last).toUpperCase();
  }
  const local = (email ?? "").split("@")[0] ?? "";
  return local.slice(0, 2).toUpperCase() || "U";
}

export interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  initials: string | null;
  job_title: string | null;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: AppRole[];
}

export async function listAppUsers(): Promise<UserRow[]> {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, initials, job_title, department, phone, avatar_url, created_at")
    .order("created_at", { ascending: true });
  if (pErr) throw new AppError(mapDbError(pErr));

  const { data: roles, error: rErr } = await supabase.from("user_roles").select("user_id, role");
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
    initials: p.initials,
    job_title: p.job_title,
    department: p.department,
    phone: p.phone,
    avatar_url: p.avatar_url,
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

export interface ProfileFieldsPatch {
  full_name?: string | null;
  initials?: string | null;
  job_title?: string | null;
  department?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

/**
 * Update any subset of the enterprise profile fields. Only the caller (via RLS
 * self-update policy) or an admin (via admin-update policy) can invoke this.
 * Does not touch auth identity, email, roles, or user id.
 */
export async function updateProfileFields(
  userId: string,
  patch: ProfileFieldsPatch,
): Promise<void> {
  const clean: ProfileFieldsPatch = {};
  const keys: (keyof ProfileFieldsPatch)[] = [
    "full_name",
    "initials",
    "job_title",
    "department",
    "phone",
    "avatar_url",
  ];
  for (const k of keys) {
    if (!(k in patch)) continue;
    const v = patch[k];
    if (typeof v === "string") {
      const t = v.trim();
      clean[k] = t.length ? t : null;
    } else {
      clean[k] = v ?? null;
    }
  }
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from("profiles").update(clean).eq("id", userId);
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
