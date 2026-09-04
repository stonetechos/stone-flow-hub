/**
 * Server entry point for posting the Growth Advisory to the shared,
 * all-users notification centre (public.notifications, user_id NULL =
 * broadcast — see that migration's RLS policy comment).
 *
 * Split from computeGrowthAdvisory() deliberately: the compute stays a
 * plain client-side read (getProjectProfitability() via the browser's
 * authenticated Supabase singleton, same as every dashboard already
 * does), and only the privileged write crosses to the server — mirroring
 * how notify()/notifyBroadcast() are used elsewhere in this repo (e.g.
 * src/lib/admin/users.functions.ts). This avoids recomputing the
 * profitability rollup a second time server-side.
 *
 * Any authenticated staff member may trigger this (not admin-gated) —
 * posting an auto-generated, already-visible-on-dashboards advisory
 * statement is not a privileged action the way inviting/deleting a user
 * is; it just needs the service-role write to bypass RLS on `notifications`
 * (see that table's migration: there is deliberately no client INSERT
 * policy, to stop a compromised session from injecting fake "critical"
 * notifications).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(2000),
});

export const postGrowthAdvisoryBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<{ posted: boolean; id?: string }> => {
    const { notifyBroadcast } = await import("@/lib/notifications/notify.server");
    const result = await notifyBroadcast({
      tier: "important",
      title: data.title,
      body: data.body,
      entityType: "growth_advisory",
      linkPath: "/dashboards/business-health",
    });
    return { posted: !!result, id: result?.id };
  });
