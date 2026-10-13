/**
 * Stone Tech OS — Four-Agent AI Suite Background Automation Cron Endpoint.
 *
 * Invoked by Cloudflare Cron Triggers, GitHub Actions, pg_cron, or external scheduler.
 * Enforces:
 * 1. Constant-time shared secret authentication (CRON_SECRET or CRON_SHARED_SECRET).
 * 2. Independent periodic scanning across Sales, Purchase, and Accounting.
 * 3. StoneMan is strictly excluded from periodic scans (remains event-driven).
 * 4. Deduplication of unresolved tasks, prevention of overlapping runs.
 * 5. Strict Zero-Outbound rule: stages drafts only; never triggers unapproved dispatch.
 */

import { createFileRoute } from "@tanstack/react-router";
import { matchesSharedSecret } from "@/lib/server/shared-secret";
import {
  runAllScheduledScans,
  runScheduledAgentScan,
  type ScheduledAgentId,
} from "@/lib/agents/scheduler";

export const Route = createFileRoute("/api/public/hooks/agent-suite-scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET || process.env.CRON_SHARED_SECRET;
        if (!cronSecret) {
          return new Response(JSON.stringify({ error: "Cron secret not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const suppliedSecret =
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          request.headers.get("x-cron-secret") ??
          null;

        if (!matchesSharedSecret(suppliedSecret, cronSecret)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Optional query parameters: ?agentId=sales_followup&force=true
        const url = new URL(request.url);
        const targetAgent = url.searchParams.get("agentId") as ScheduledAgentId | null;
        const force = url.searchParams.get("force") === "true";

        if (targetAgent) {
          try {
            const result = await runScheduledAgentScan(targetAgent, supabaseAdmin, "cron", force);
            return new Response(
              JSON.stringify({ ok: true, result, at: new Date().toISOString() }),
              {
                headers: { "Content-Type": "application/json" },
              },
            );
          } catch (scanErr) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: scanErr instanceof Error ? scanErr.message : String(scanErr),
                at: new Date().toISOString(),
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        const outcome = await runAllScheduledScans(supabaseAdmin, "cron", force);
        return new Response(
          JSON.stringify({
            ok: outcome.summary.failures === 0,
            ...outcome,
            at: new Date().toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
