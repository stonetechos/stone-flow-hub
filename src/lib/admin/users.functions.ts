/**
 * Server functions for admin user management.
 *
 * Uses supabaseAdmin (service role) for privileged auth operations that the
 * publishable client cannot perform: listing auth.users, inviting new users,
 * resending invites, and deleting auth records. Every handler verifies the
 * caller holds the `admin` role via the existing `has_role` security-definer
 * function before touching admin APIs.
 *
 * Activation / deactivation is a data-only change on `public.profiles.is_active`
 * and is done from the client under the existing admin RLS policy; no server
 * function is required.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageTargetUser } from "@/lib/admin/permissions";
import { requireAdminOrSuperAdmin, type HasRoleClient } from "@/lib/admin/server-auth";
import { parseUserAgent, derivePlatformFromOrigin } from "@/lib/audit/user-agent";
import type { Database } from "@/integrations/supabase/types";

/** Matches the real shape of `supabaseAdmin` (see client.server.ts) without
 * importing that module at type-check time — it's dynamically imported
 * inside each handler so it's never pulled into the client bundle. */
type SupabaseAdminClient = SupabaseClient<Database>;

export type AdminUserStatus = "active" | "invited" | "expired" | "deactivated";

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  invited_at: string | null;
  last_sign_in_at: string | null;
  is_active: boolean;
  status: AdminUserStatus;
}

const INVITE_EXPIRY_DAYS = 7;

/**
 * Sprint 1.7, Parts 2-4 / Sprint 1.7.1, Part 6-7 — every handler below must
 * accept both Admin *and* Platform Super Admin callers. The Super Admin
 * account is granted only the `super_admin` role (never also `admin`), so
 * a plain `has_role(..., 'admin')` check alone would lock the Platform
 * Owner out of their own admin server functions.
 *
 * Now a thin wrapper around the shared `requireAdminOrSuperAdmin` in
 * `src/lib/admin/server-auth.ts` (previously this duplicated that same
 * has_role-pair check inline; Sprint 1.7.1 Part 7 consolidated it into one
 * implementation shared with `dispatch.functions.ts` and
 * `dispatch-queue.ts`).
 */
async function requireAdminActor(ctx: {
  supabase: unknown;
  userId: string;
}): Promise<{ isAdmin: boolean; isSuperAdmin: boolean }> {
  return requireAdminOrSuperAdmin(ctx.supabase as HasRoleClient, ctx.userId);
}

/** Sprint 1.7, Part 3 — is this target user the protected Super Admin? */
async function targetIsSuperAdmin(admin: SupabaseAdminClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

/**
 * Sprint 1.7, Part 8 / Sprint 1.7.1, Part 4 — audit log helper for the
 * server-function paths (client-side direct-table paths log via the
 * equivalent helper in users.ts). Never throws: a failed audit write must
 * not roll back or mask the outcome of the primary action it's describing.
 *
 * Captures User Agent / Browser / OS / Platform / IP from the live request
 * via TanStack Start's request-context accessors — genuine values, not
 * fabricated ones. Every accessor call is wrapped in try/catch: outside an
 * active request lifecycle (e.g. a unit test invoking this directly) these
 * throw rather than return undefined, and per Part 4 ("If IP cannot be
 * obtained ... leave the field nullable. Do not fake values") the correct
 * response to not having a value is `null`, never a guess.
 */
async function logAuditEvent(
  admin: SupabaseAdminClient,
  entry: {
    entityId: string;
    action: Database["public"]["Enums"]["activity_action"];
    actorId: string;
    summary: string;
  },
): Promise<void> {
  let userAgent: string | null = null;
  let ipAddress: string | null = null;
  let platform: string | null = null;
  try {
    userAgent = getRequestHeader("user-agent") ?? null;
    ipAddress = getRequestIP({ xForwardedFor: true }) ?? null;
    platform = derivePlatformFromOrigin(getRequestHeader("origin") ?? null);
  } catch {
    // No active request context available — every field stays null.
  }
  const { browser, os } = parseUserAgent(userAgent);

  const { error } = await admin.from("activity_log").insert({
    entity_type: "user",
    entity_id: entry.entityId,
    action: entry.action,
    actor_id: entry.actorId,
    summary: entry.summary,
    user_agent: userAgent,
    browser,
    os,
    platform,
    ip_address: ipAddress,
  });
  if (error) {
    console.error("[audit] failed to record activity_log entry", error.message);
  }
}

/**
 * Sprint 1.7.1, Part 6 — counts remaining *admin-capable* active users, i.e.
 * `admin` OR `super_admin` holders, not literal `admin` alone.
 *
 * Judgment call (Part 6 permission audit): the Platform Super Admin has a
 * strict superset of Admin capability (Part 6's `has_role` inheritance
 * fix), so a deployment with zero literal-`admin` holders but one active
 * Super Admin is not actually locked out of admin capability — the Super
 * Admin account itself is separately guaranteed to always exist (the
 * `limit_single_super_admin` trigger blocks removing the only one, and
 * `canManageTargetUser` blocks deleting/deactivating it outright, both
 * checked before this function is ever called for a Super Admin target).
 * Counting only literal `admin` here would have blocked deleting the last
 * plain Admin even when the Super Admin remains fully able to administer
 * the platform — an unnecessarily strict, now-inconsistent restriction
 * given this sprint's own inheritance rule.
 */
async function countActiveAdminsExcluding(
  supabaseAdmin: {
    from: (t: string) => {
      select: (c: string) => {
        in: (
          col: string,
          vals: string[],
        ) => Promise<{ data: { user_id: string }[] | null; error: { message: string } | null }>;
      };
    };
  },
  excludeUserId?: string,
): Promise<number> {
  const { data: admins, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "super_admin"]);
  if (error) throw new Error(error.message);
  const ids = Array.from(
    new Set((admins ?? []).map((r) => r.user_id).filter((id) => id !== excludeUserId)),
  );
  if (ids.length === 0) return 0;
  const { data: profiles, error: pErr } = await (
    supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          in: (
            col: string,
            vals: string[],
          ) => Promise<{
            data: { id: string; is_active: boolean }[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    }
  )
    .from("profiles")
    .select("id, is_active")
    .in("id", ids);
  if (pErr) throw new Error(pErr.message);
  return (profiles ?? []).filter((p) => p.is_active !== false).length;
}

function deriveStatus(u: {
  last_sign_in_at: string | null | undefined;
  invited_at: string | null | undefined;
  is_active: boolean;
}): AdminUserStatus {
  if (!u.is_active) return "deactivated";
  if (u.last_sign_in_at) return "active";
  if (u.invited_at) {
    const invitedAt = new Date(u.invited_at).getTime();
    const ageDays = (Date.now() - invitedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > INVITE_EXPIRY_DAYS) return "expired";
  }
  return "invited";
}

export const listAuthUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminActor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch is_active from profiles (bypass RLS is fine — admin only).
    const { data: profileRows, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, is_active");
    if (pErr) throw new Error(pErr.message);
    const activeById = new Map<string, boolean>(
      (profileRows ?? []).map((r) => [r.id, r.is_active !== false]),
    );

    const all: AdminUserRow[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        const fullName =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          null;
        const isActive = activeById.get(u.id) ?? true;
        const invitedAt = (u as { invited_at?: string | null }).invited_at ?? null;
        all.push({
          id: u.id,
          email: u.email ?? null,
          full_name: fullName as string | null,
          created_at: u.created_at,
          invited_at: invitedAt,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_active: isActive,
          status: deriveStatus({
            last_sign_in_at: u.last_sign_in_at,
            invited_at: invitedAt,
            is_active: isActive,
          }),
        });
      }
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 25) break;
    }
    return all;
  });

const inviteInput = z.object({
  email: z.string().email("Enter a valid email address"),
  full_name: z.string().trim().max(200).optional().nullable(),
  redirect_to: z.string().url().optional().nullable(),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => inviteInput.parse(raw))
  .handler(async ({ context, data }) => {
    await requireAdminActor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const fullName = data.full_name?.trim() || null;

    const { data: result, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: data.redirect_to ?? undefined,
      data: fullName ? { full_name: fullName } : undefined,
    });
    if (error) throw new Error(error.message);
    const userId = result.user?.id;
    if (userId && fullName) {
      // Ensure profile row reflects display name immediately (trigger normally
      // creates the profile row; upsert covers any race).
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, email, full_name: fullName }, { onConflict: "id" });
    }
    if (userId) {
      await logAuditEvent(supabaseAdmin, {
        entityId: userId,
        action: "user_created",
        actorId: context.userId,
        summary: `User invited: ${email}`,
      });
    }
    return { id: userId ?? null, email };
  });

const createWithPasswordInput = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  full_name: z.string().trim().max(200).optional().nullable(),
});

/**
 * Creates an auth user with an admin-supplied password and marks the email
 * confirmed immediately (no invite email is sent).
 *
 * This is a deliberately separate path from `inviteUser`: that flow verifies
 * the recipient owns the email address before any credential exists. This
 * one skips that verification because the admin is asserting the identity
 * and setting the credential directly — added at explicit user request
 * (Phase G.11, Section 2) alongside the existing invite flow, not in place
 * of it.
 */
export const createUserWithPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => createWithPasswordInput.parse(raw))
  .handler(async ({ context, data }) => {
    await requireAdminActor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const fullName = data.full_name?.trim() || null;

    const { data: result, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (error) throw new Error(error.message);
    const userId = result.user?.id;
    if (userId) {
      // Sprint 1.7, Part 5: the password above is exactly what the admin
      // typed — nothing is generated. Since it's a temporary credential the
      // admin now has to share with the user out of band, force a password
      // change before the account can be used (Part 7 enforces the
      // redirect; this just sets the flag that triggers it).
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          email,
          ...(fullName ? { full_name: fullName } : {}),
          force_password_change: true,
        },
        { onConflict: "id" },
      );
      await logAuditEvent(supabaseAdmin, {
        entityId: userId,
        action: "user_created",
        actorId: context.userId,
        summary: `User created: ${email}`,
      });
    }
    return { id: userId ?? null, email };
  });

const emailInput = z.object({
  email: z.string().email(),
  redirect_to: z.string().url().optional().nullable(),
});

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => emailInput.parse(raw))
  .handler(async ({ context, data }) => {
    await requireAdminActor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirect_to ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const userIdInput = z.object({ user_id: z.string().uuid() });

export const deleteAuthUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => userIdInput.parse(raw))
  .handler(async ({ context, data }) => {
    const actor = await requireAdminActor(context);
    if (data.user_id === context.userId) {
      throw new Error("You cannot delete your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Sprint 1.7, Part 3: the Super Admin account can never be deleted, by
    // anyone, including another Super Admin. This is checked here (in
    // addition to the DB trigger in migration 20260722150003) so the
    // denial surfaces as this exact message immediately and so the
    // "attempted" audit event is recorded — the DB trigger's own AFTER
    // logger never fires for a blocked BEFORE-trigger mutation.
    const targetSuperAdmin = await targetIsSuperAdmin(supabaseAdmin, data.user_id);
    const decision = canManageTargetUser(
      { id: context.userId, isSuperAdmin: actor.isSuperAdmin, isAdmin: actor.isAdmin },
      { id: data.user_id, isSuperAdmin: targetSuperAdmin },
      "delete",
    );
    if (!decision.allowed) {
      await logAuditEvent(supabaseAdmin, {
        entityId: data.user_id,
        action: "super_admin_delete_attempted",
        actorId: context.userId,
        summary: "Attempted to delete the protected Super Admin account.",
      });
      throw new Error(decision.reason ?? "Forbidden");
    }

    // Safeguard: prevent removing the last active admin.
    const { data: targetIsAdmin, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.user_id)
      .eq("role", "admin")
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (targetIsAdmin) {
      const remaining = await countActiveAdminsExcluding(supabaseAdmin as never, data.user_id);
      if (remaining < 1) {
        throw new Error("Cannot delete the last active admin.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    await logAuditEvent(supabaseAdmin, {
      entityId: data.user_id,
      action: "user_deleted",
      actorId: context.userId,
      summary: "User deleted.",
    });

    return { ok: true };
  });

const setActiveInput = z.object({
  user_id: z.string().uuid(),
  is_active: z.boolean(),
});

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => setActiveInput.parse(raw))
  .handler(async ({ context, data }) => {
    const actor = await requireAdminActor(context);
    if (data.user_id === context.userId && !data.is_active) {
      throw new Error("You cannot deactivate your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.is_active) {
      // Sprint 1.7, Part 3: the Super Admin account can never be
      // deactivated. The DB trigger (migration 20260722150003) blocks the
      // underlying UPDATE regardless, but this check surfaces the exact
      // "This account is protected." message without a round trip.
      const targetSuperAdmin = await targetIsSuperAdmin(supabaseAdmin, data.user_id);
      const decision = canManageTargetUser(
        { id: context.userId, isSuperAdmin: actor.isSuperAdmin, isAdmin: actor.isAdmin },
        { id: data.user_id, isSuperAdmin: targetSuperAdmin },
        "deactivate",
      );
      if (!decision.allowed) throw new Error(decision.reason ?? "Forbidden");

      // Prevent deactivating the last active admin.
      const { data: targetIsAdmin } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", data.user_id)
        .eq("role", "admin")
        .maybeSingle();
      if (targetIsAdmin) {
        const remaining = await countActiveAdminsExcluding(supabaseAdmin as never, data.user_id);
        if (remaining < 1) {
          throw new Error("Cannot deactivate the last active admin.");
        }
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);

    // Optionally ban/unban the auth user so deactivated users cannot sign in.
    try {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        ban_duration: data.is_active ? "none" : "876000h",
      } as { ban_duration: string });
    } catch {
      // Non-fatal: profile flag still prevents app usage via RLS/gates.
    }

    await logAuditEvent(supabaseAdmin, {
      entityId: data.user_id,
      action: data.is_active ? "user_activated" : "user_deactivated",
      actorId: context.userId,
      summary: data.is_active ? "User reactivated." : "User deactivated.",
    });

    return { ok: true };
  });

const resetPasswordInput = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

/**
 * Sprint 1.7, Part 6 — direct password reset by an Admin or Super Admin.
 * Distinct from `sendPasswordReset` in users.ts, which emails the user a
 * self-service reset link and is unchanged by this sprint. This sets the
 * exact password the caller supplies (Part 5: never generated) and marks
 * `force_password_change` so the recipient must set their own password on
 * next sign-in (Part 7), same as a freshly created account.
 */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => resetPasswordInput.parse(raw))
  .handler(async ({ context, data }) => {
    const actor = await requireAdminActor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Sprint 1.7, Part 6: Admins may reset any password except the Super
    // Admin's; only the Super Admin may reset their own.
    const targetSuperAdmin = await targetIsSuperAdmin(supabaseAdmin, data.user_id);
    const decision = canManageTargetUser(
      { id: context.userId, isSuperAdmin: actor.isSuperAdmin, isAdmin: actor.isAdmin },
      { id: data.user_id, isSuperAdmin: targetSuperAdmin },
      "reset_password",
    );
    if (!decision.allowed) throw new Error(decision.reason ?? "Forbidden");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ force_password_change: true })
      .eq("id", data.user_id);
    if (profErr) throw new Error(profErr.message);

    await logAuditEvent(supabaseAdmin, {
      entityId: data.user_id,
      action: "password_reset",
      actorId: context.userId,
      summary: "Password reset by administrator.",
    });

    return { ok: true };
  });
