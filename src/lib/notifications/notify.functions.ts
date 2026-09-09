import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const postNotificationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tier: z.enum(["info", "important", "critical"]).default("info"),
        title: z.string().min(1),
        body: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        linkPath: z.string().optional(),
        targetRole: z.enum(["all", "admin"]).default("all"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { notifyBroadcast, notifyAdmins } = await import("./notify.server");
    if (data.targetRole === "admin") {
      return notifyAdmins({
        tier: data.tier,
        title: data.title,
        body: data.body,
        entityType: data.entityType,
        entityId: data.entityId,
        linkPath: data.linkPath,
        createdBy: context.userId,
      });
    }
    return notifyBroadcast({
      tier: data.tier,
      title: data.title,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
      linkPath: data.linkPath,
      createdBy: context.userId,
    });
  });
