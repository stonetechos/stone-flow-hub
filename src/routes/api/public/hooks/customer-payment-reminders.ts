import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron endpoint — pg_cron POSTs here daily to run the reminder generator.
 * Public prefix, but SUPABASE anon key required in the `apikey` header.
 * All privileged work happens inside the SQL SECURITY DEFINER function.
 */
export const Route = createFileRoute("/api/public/hooks/customer-payment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey") ?? request.headers.get("authorization");
        if (!auth) return new Response("Missing apikey", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL!, auth.replace(/^Bearer\s+/i, ""), {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await supabase.rpc("generate_customer_payment_reminders");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ ok: true, enqueued: Number(data ?? 0), at: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
