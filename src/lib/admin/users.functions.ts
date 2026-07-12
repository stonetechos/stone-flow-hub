/**
 * Server functions for admin user management.
 * Uses supabaseAdmin to read auth.users (last_sign_in_at, confirmed_at) which
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

async function assertAdmin(context: { supabase: ReturnType<typeof Object>; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = context.supabase as any;
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listAuthUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const all: AdminUserRow[] = [];
    let page = 1;
    // Paginate through auth.users (max 1000 per page)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        all.push({
          id: u.id,
          email: u.email ?? null,
          full_name:
            (u.user_metadata?.full_name as string | undefined) ??
            (u.user_metadata?.name as string | undefined) ??
            null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          status: u.last_sign_in_at ? "active" : "invited",
        });
      }
      if (data.users.length < 200) break;
      page += 1;
      if (page > 25) break; // safety cap: 5000 users
    }
    return all;
  });
