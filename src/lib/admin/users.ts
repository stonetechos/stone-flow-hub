/** Admin User Management data access. Uses profiles + user_roles. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { Database } from "@/integrations/supabase/types";
import { canManageTargetUser, type ActingUserRef } from "@/lib/admin/permissions";
import { parseUserAgent, derivePlatformFromOrigin } from "@/lib/audit/user-agent";

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

/**
 * Sprint 1.7, Part 8 — records a denied Super Admin role-change attempt.
 * The `user_roles` table itself is guarded by a DB trigger (see migration
 * 20260722150003) that rolls back the mutation before it happens, which
 * means the AFTER-trigger audit logger never fires for a blocked attempt —
 * so the attempt is recorded here, at the one call site that already knows
 * it was denied. RLS's "al insert auth" policy allows any authenticated
 * user to write an activity_log row, matching the existing generic
 * log_activity() trigger's pattern of trusting the app layer for actor_id.
 *
 * Sprint 1.7.1, Part 4 — this is a client-side write, so there's no server
 * request to read a User-Agent header or IP from (`ip_address` stays null
 * here, same as before this sprint — only the server-function audit path
 * in users.functions.ts can genuinely observe a caller's IP). What the
 * client-side context genuinely has is `navigator.userAgent` and its own
 * origin, so those populate `user_agent`/`browser`/`os`/`platform`.
 */
async function logRoleChangeAttempt(
  entityId: string,
  actorId: string,
  summary: string,
): Promise<void> {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const { browser, os } = parseUserAgent(userAgent);
  const platform =
    typeof window !== "undefined" ? derivePlatformFromOrigin(window.location.origin) : null;
  const { error } = await supabase.from("activity_log").insert({
    entity_type: "user",
    entity_id: entityId,
    action: "super_admin_role_change_attempted",
    actor_id: actorId,
    summary,
    user_agent: userAgent,
    browser,
    os,
    platform,
  });
  if (error) {
    // Audit logging must never block the caller from seeing the original
    // denial reason — log and continue.
    console.error("[audit] failed to record activity_log entry", error.message);
  }
}

/**
 * Sprint 1.7, Parts 2-4 — the guarded entry point the Users & Roles page
 * should call instead of `assignRole` directly. Denies (and logs) any
 * attempt to change the protected Super Admin's role; otherwise behaves
 * exactly like `assignRole`.
 */
export async function assignRoleGuarded(
  actor: ActingUserRef,
  target: { id: string; roles: AppRole[] },
  role: AppRole,
): Promise<void> {
  const decision = canManageTargetUser(
    actor,
    { id: target.id, isSuperAdmin: target.roles.includes("super_admin") },
    "change_role",
  );
  if (!decision.allowed) {
    await logRoleChangeAttempt(
      target.id,
      actor.id,
      "Attempted to grant a role to the protected Super Admin account.",
    );
    throw new AppError(decision.reason ?? "Forbidden");
  }
  return assignRole(target.id, role);
}

/** Guarded counterpart to `assignRoleGuarded` for role revocation. */
export async function revokeRoleGuarded(
  actor: ActingUserRef,
  target: { id: string; roles: AppRole[] },
  role: AppRole,
): Promise<void> {
  const decision = canManageTargetUser(
    actor,
    { id: target.id, isSuperAdmin: target.roles.includes("super_admin") },
    "revoke_role",
  );
  if (!decision.allowed) {
    await logRoleChangeAttempt(
      target.id,
      actor.id,
      "Attempted to revoke a role from the protected Super Admin account.",
    );
    throw new AppError(decision.reason ?? "Forbidden");
  }
  return revokeRole(target.id, role);
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

/**
 * Sprint 1.7.1, Part 6/7 — "is admin" now means "admin OR the Platform
 * Super Admin" everywhere in the app (see `roleSatisfies` in
 * `src/lib/admin/permissions.ts`, and `useRoles().isAdmin` for the
 * equivalent hook-based check most UI code should prefer over calling this
 * directly). Previously this checked the literal `admin` role only, which
 * would have reported `false` for the Platform Super Admin.
 */
export async function currentUserIsAdmin(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess.user?.id;
  if (!uid) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .in("role", ["admin", "super_admin"]);
  return !!data && data.length > 0;
}

/** Sprint 1.7, Part 2 — mirrors `currentUserIsAdmin` for the new tier. */
export async function currentUserIsSuperAdmin(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getUser();
  const uid = sess.user?.id;
  if (!uid) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}
