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
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function requireAdmin(ctx: { supabase: unknown; userId: string }): Promise<void> {
  const sb = ctx.supabase as {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const { data, error } = await sb.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function countActiveAdminsExcluding(
  supabaseAdmin: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => Promise<{ data: { user_id: string }[] | null; error: { message: string } | null }>;
      };
    };
  },
  excludeUserId?: string,
): Promise<number> {
  const { data: admins, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  const ids = (admins ?? [])
    .map((r) => r.user_id)
    .filter((id) => id !== excludeUserId);
  if (ids.length === 0) return 0;
  const { data: profiles, error: pErr } = await (
    supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          in: (col: string, vals: string[]) => Promise<{ data: { id: string; is_active: boolean }[] | null; error: { message: string } | null }>;
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
    await requireAdmin(context);
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
    // eslint-disable-next-line no-constant-condition
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
    await requireAdmin(context);
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
    await requireAdmin(context);
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
    await requireAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("You cannot delete your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Safeguard: prevent removing the last active admin.
    const { data: targetIsAdmin, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.user_id)
      .eq("role", "admin")
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (targetIsAdmin) {
      const remaining = await countActiveAdminsExcluding(
        supabaseAdmin as never,
        data.user_id,
      );
      if (remaining < 1) {
        throw new Error("Cannot delete the last active admin.");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
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
    await requireAdmin(context);
    if (data.user_id === context.userId && !data.is_active) {
      throw new Error("You cannot deactivate your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.is_active) {
      // Prevent deactivating the last active admin.
      const { data: targetIsAdmin } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", data.user_id)
        .eq("role", "admin")
        .maybeSingle();
      if (targetIsAdmin) {
        const { data: admins } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, profiles!inner(is_active)")
          .eq("role", "admin");
        const activeAdmins = (admins ?? []).filter(
          (r: { profiles: { is_active: boolean } | null }) => r.profiles?.is_active !== false,
        );
        if (activeAdmins.length <= 1) {
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
    return { ok: true };
  });
