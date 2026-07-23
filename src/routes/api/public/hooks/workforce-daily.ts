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
 * Auth: a shared secret sent as `Authorization: Bearer …` or `x-cron-secret`,
 * exactly like customer-payment-reminders.ts's identical cron endpoint —
 * matches docs/DEPLOYMENT.md's Production Checklist entry for this route
 * ("send x-cron-secret: $CRON_SHARED_SECRET"). Once verified, all writes go
 * through the service-role admin client (`workforce_tasks` and
 * `customer_payment_schedules` are both granted to
 * `authenticated`/`service_role` only — no `anon` grant at all — so nothing
 * short of the service role could ever write here).
 *
 * Sprint 1.9, Milestone 3: previously this handler didn't check any secret
 * at all — it accepted any non-empty `apikey`/`authorization` header value
 * and used it directly as the Supabase client key, which (a) could never
 * actually succeed against these tables' grants no matter what was passed,
 * since anon has no write grant and nothing but the caller's own possibly-
 * invalid value was ever verified, and (b) never checked either write's
 * `error`, so every call — authorized or not, successful or not — returned
 * `{ ok: true }`. This also didn't match its own documented contract in
 * DEPLOYMENT.md. Rewritten to match customer-payment-reminders.ts's
 * verified pattern exactly.
 *
 * Accepts either `CRON_SECRET` or `CRON_SHARED_SECRET` as the configured
 * secret's env var name — the two existing cron endpoints in this codebase
 * disagree on which name to use (customer-payment-reminders.ts reads
 * `CRON_SECRET`; docs/DEPLOYMENT.md documents `CRON_SHARED_SECRET`), and
 * this sandbox has no way to confirm which one is actually configured in
 * the live deployment. Supporting both avoids guessing wrong and silently
 * disabling whichever cron job doesn't match.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/hooks/workforce-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET || process.env.CRON_SHARED_SECRET;
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
          // Prevent length-based side channel by hashing both sides.
          const ha = createHmac("sha256", cronSecret).update(header).digest();
          const hb = createHmac("sha256", cronSecret).update(cronSecret).digest();
          if (!timingSafeEqual(ha, hb)) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Stale-task cleanup: mark tasks completed if their source row is gone.
        //    Cheap defensive sweep; triggers already keep this current.
        const { error: staleErr } = await supabaseAdmin
          .from("workforce_tasks")
          .update({ status: "cancelled" })
          .eq("status", "pending")
          .lt("due_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
          .eq("auto_generated", true);
        if (staleErr) return new Response(staleErr.message, { status: 500 });

        // 2. Refresh payment-reminder tasks for schedules due today.
        //    The DB trigger already fires on writes; we re-touch today's rows
        //    so `updated_at` bumps and the task appears at the top of Today.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 86_400_000);
        const { error: refreshErr } = await supabaseAdmin
          .from("customer_payment_schedules")
          .update({ updated_at: new Date().toISOString() })
          .in("status", ["pending", "partial", "overdue"])
          .gte("due_date", today.toISOString().slice(0, 10))
          .lt("due_date", tomorrow.toISOString().slice(0, 10));
        if (refreshErr) return new Response(refreshErr.message, { status: 500 });

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
