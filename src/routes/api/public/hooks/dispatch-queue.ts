/**
 * External scheduler endpoint — processes one batch of the outbound
 * `message_queue`. Auth: the caller must present a Supabase access token
 * belonging to a user with the `admin` role, sent as either the
 * `apikey` or `Authorization: Bearer …` header.
 *
 * Recommended schedule: every 60 seconds.
 */
import { createFileRoute } from "@tanstack/react-router";

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

        const { data: adminRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!adminRow) return new Response("Admin role required", { status: 403 });

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
