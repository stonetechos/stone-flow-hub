/**
 * Server functions for admin user management.
 * Uses supabaseAdmin to read auth.users (last_sign_in_at, invited/active) which
 * the client cannot access. Authorization: caller must have the admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  status: "invited" | "active";
}

export const listAuthUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: rErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
        all.push({
          id: u.id,
          email: u.email ?? null,
          full_name: fullName as string | null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          status: u.last_sign_in_at ? "active" : "invited",
        });
      }
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 25) break; // safety cap: 5000 users
    }
    return all;
  });
