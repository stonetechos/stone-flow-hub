/**
 * External scheduler endpoint — processes one batch of the outbound
 * `message_queue`. Auth: the caller must present a Supabase access token
 * belonging to a user with the `admin` role (or the Platform Super Admin —
 * Sprint 1.7.1, Part 6), sent as either the `apikey` or
 * `Authorization: Bearer …` header.
 *
 * Recommended schedule: every 60 seconds.
 */
import { createFileRoute } from "@tanstack/react-router";
import { requireAdminOrSuperAdmin, type HasRoleClient } from "@/lib/admin/server-auth";

export const Route = createFileRoute("/api/public/hooks/dispatch-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? request.headers.get("apikey");
        if (!auth) return new Response("Missing authorization", { status: 401 });
        const token = auth.replace(/^Bearer\s+/i, "");

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL!, token, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) return new Response("Invalid token", { status: 401 });

        // Sprint 1.7.1, Part 6/7 — was previously its own ad hoc
        // `user_roles` query filtered to literal `role = 'admin'`, which
        // would have rejected a scheduler token belonging to the Platform
        // Super Admin. Now routed through the shared has_role-backed check.
        try {
          await requireAdminOrSuperAdmin(supabase as unknown as HasRoleClient, userData.user.id);
        } catch {
          return new Response("Admin role required", { status: 403 });
        }

        const { dispatchQueueBatch } = await import("@/lib/notifications/dispatch.server");
        const result = await dispatchQueueBatch(supabase, 50);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
