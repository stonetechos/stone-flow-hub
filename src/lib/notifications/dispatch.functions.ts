/**
 * Client-callable server functions for the communication layer.
 * All are admin-gated inside the handler.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  const { data, error } = await (
    ctx.supabase as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (a: string, b: string) => {
            eq: (a: string, b: string) => {
              maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
            };
          };
        };
      };
    }
  ).from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Admin role required");
}

export const checkProviderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ channel: z.enum(["email", "whatsapp"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; reason?: string }> => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const { checkProvider } = await import("./dispatch.server");
    return checkProvider(data.channel, context.supabase as never);
  });

export const sendTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        channel: z.enum(["email", "whatsapp"]),
        to: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; providerMessageId?: string | null; error?: string; status?: number }> => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const { sendTest } = await import("./dispatch.server");
    const r = await sendTest(data.channel, context.supabase as never, {
      to: data.to,
      subject: data.subject,
      body: data.body,
    });
    return { ok: r.ok, providerMessageId: r.providerMessageId ?? null, error: r.error, status: r.status };
  });

export const dispatchQueueNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ batchSize: z.number().int().min(1).max(100).default(25) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const { dispatchQueueBatch } = await import("./dispatch.server");
    return dispatchQueueBatch(context.supabase as never, data.batchSize);
  });
