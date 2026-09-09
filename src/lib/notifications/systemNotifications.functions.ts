/**
 * System Notifications Server Function & Client Dispatcher.
 *
 * Supports:
 * 1. Organisation-wide Broadcast Notifications:
 *    - New customer entries
 *    - Quotation approvals
 *    - Vendor quote receipts
 *    - Material dispatches
 * 2. Admin-Only Notifications:
 *    - Payment receipts by exact payment mode / account (Stone Tech UPI, Cash, BOB Current, Raman/Rishi UPI)
 *    - Project completions with link to Sales Ledger & WhatsApp customer alert
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const systemNotificationInputSchema = z.object({
  scope: z.enum(["broadcast", "admin"]).default("broadcast"),
  tier: z.enum(["info", "important", "critical"]).default("info"),
  title: z.string().min(1).max(300),
  body: z.string().max(2000).optional().nullable(),
  entityType: z.string().max(100).optional().nullable(),
  entityId: z.string().uuid().optional().nullable(),
  linkPath: z.string().max(300).optional().nullable(),
});

export type SystemNotificationInput = z.infer<typeof systemNotificationInputSchema>;

export const postSystemNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => systemNotificationInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ posted: boolean; count: number }> => {
    try {
      const { notify, notifyBroadcast } = await import("@/lib/notifications/notify.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      if (data.scope === "admin") {
        // Query users who hold an admin or super_admin role
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: adminRoles, error: rErr } = await (supabaseAdmin as any)
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "super_admin"]);

        if (rErr) {
          console.warn("[notifications] failed to read admin user_roles", rErr);
        }

        const adminUserIds: string[] = Array.from(
          new Set((adminRoles ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean)),
        );

        if (adminUserIds.length > 0) {
          await Promise.all(
            adminUserIds.map((userId) =>
              notify({
                userId,
                tier: data.tier,
                title: data.title,
                body: data.body ?? undefined,
                entityType: data.entityType ?? undefined,
                entityId: data.entityId ?? undefined,
                linkPath: data.linkPath ?? undefined,
              }),
            ),
          );
          return { posted: true, count: adminUserIds.length };
        } else {
          // If no admin user explicitly configured yet in this environment,
          // broadcast with [Admin] prefix so critical alerts are never lost.
          const res = await notifyBroadcast({
            tier: data.tier,
            title: `[Admin] ${data.title}`,
            body: data.body ?? undefined,
            entityType: data.entityType ?? undefined,
            entityId: data.entityId ?? undefined,
            linkPath: data.linkPath ?? undefined,
          });
          return { posted: !!res, count: 1 };
        }
      } else {
        // Broadcast to every organisation member
        const res = await notifyBroadcast({
          tier: data.tier,
          title: data.title,
          body: data.body ?? undefined,
          entityType: data.entityType ?? undefined,
          entityId: data.entityId ?? undefined,
          linkPath: data.linkPath ?? undefined,
        });
        return { posted: !!res, count: 1 };
      }
    } catch (err) {
      console.error("[notifications] postSystemNotification error:", err);
      return { posted: false, count: 0 };
    }
  });

/**
 * Safe fire-and-forget helper to dispatch system notifications from client UI.
 * Never throws — guarantees primary business action is unaffected.
 */
export async function dispatchSystemNotification(input: SystemNotificationInput): Promise<void> {
  try {
    // 1. Post to durable notifications table via server function
    await postSystemNotification({ data: input });

    // 2. Also send Realtime broadcast for zero-latency toast display
    const { supabase } = await import("@/integrations/supabase/client");
    const channel = supabase.channel("notifications_feed");
    channel.send({
      type: "broadcast",
      event: "new_notification",
      payload: {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tier: input.tier,
        title: input.title,
        body: input.body ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        link_path: input.linkPath ?? null,
        read_at: null,
        created_at: new Date().toISOString(),
        scope: input.scope,
      },
    });
  } catch (err) {
    console.warn("[notifications] failed to dispatch system notification", err);
  }
}
