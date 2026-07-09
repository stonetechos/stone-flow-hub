import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Cron endpoint — pg_cron / external scheduler POSTs here daily to run the
 * reminder generator. Auth is enforced via a shared CRON_SECRET bearer token;
 * the underlying SECURITY DEFINER RPC is only granted to `service_role`, so
 * the handler uses the service-role admin client after the bearer is verified.
 */
export const Route = createFileRoute("/api/public/hooks/customer-payment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
          return new Response("Cron secret not configured", { status: 500 });
        }
        const header =
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          request.headers.get("x-cron-secret") ??
          "";
        const a = Buffer.from(header);
        const b = Buffer.from(cronSecret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          // Prevent length-based side channel by hashing both sides
          const ha = createHmac("sha256", cronSecret).update(header).digest();
          const hb = createHmac("sha256", cronSecret).update(cronSecret).digest();
          if (!timingSafeEqual(ha, hb)) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("generate_customer_payment_reminders");
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
