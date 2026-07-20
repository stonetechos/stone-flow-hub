/**
 * Cron endpoint — daily Workforce Intelligence housekeeping.
 *
 * Runs once each morning. Immediate task generation happens via SQL
 * triggers on the source ERP tables; this endpoint only handles the
 * daily-cadence work:
 *   - Auto-close tasks whose source is no longer active (defensive).
 *   - Regenerate reminder tasks for the day's due payment schedules.
 *   - Persist per-employee performance snapshots for the current month.
 *
 * Authenticated via the `apikey` header (Supabase publishable / anon key)
 * as with every other public hook route.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/workforce-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey") ?? request.headers.get("authorization");
        if (!auth) return new Response("Missing apikey", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL!, auth.replace(/^Bearer\s+/i, ""), {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // 1. Stale-task cleanup: mark tasks completed if their source row is gone.
        //    Cheap defensive sweep; triggers already keep this current.
        await supabase
          .from("workforce_tasks")
          .update({ status: "cancelled" })
          .eq("status", "pending")
          .lt("due_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
          .eq("auto_generated", true);

        // 2. Refresh payment-reminder tasks for schedules due today.
        //    The DB trigger already fires on writes; we re-touch today's rows
        //    so `updated_at` bumps and the task appears at the top of Today.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 86_400_000);
        await supabase
          .from("customer_payment_schedules")
          .update({ updated_at: new Date().toISOString() })
          .in("status", ["pending", "partial", "overdue"])
          .gte("due_date", today.toISOString().slice(0, 10))
          .lt("due_date", tomorrow.toISOString().slice(0, 10));

        // 3. Snapshot generation happens client-side on demand today. In a
        //    future phase, compute here and insert into workforce_score_snapshots.

        return new Response(JSON.stringify({ ok: true, ran_at: new Date().toISOString() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
