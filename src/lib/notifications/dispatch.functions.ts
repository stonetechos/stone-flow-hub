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

export const sendWhatsappTestTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      to: z.string().optional(),
      template: z.string().min(1).default("hello_world"),
      language: z.string().min(2).default("en_US"),
    }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; providerMessageId?: string | null; error?: string; status?: number }> => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const supabase = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    const { sendWhatsappTemplate, updateWhatsappStatus } = await import("./dispatch.server");
    const wa = (await supabase.from("app_settings").select("value").eq("key", "notifications.whatsapp").maybeSingle()).data?.value ?? {};
    const mode = ((await supabase.from("app_settings").select("value").eq("key", "communication.mode").maybeSingle()).data?.value ?? { mode: "test" }) as { mode?: string; test_phone?: string };
    const to = (mode.mode ?? "test") === "test" ? (mode.test_phone || data.to) : data.to;
    if (!to) return { ok: false, error: "No recipient — set test_phone in Communication settings or pass a `to`." };
    const r = await sendWhatsappTemplate(wa as never, to, data.template, data.language);
    if (r.ok) {
      await updateWhatsappStatus(supabase, {
        last_send_at: new Date().toISOString(),
        last_send_to: to,
        last_send_wamid: r.providerMessageId ?? undefined,
      });
    }
    return { ok: r.ok, providerMessageId: r.providerMessageId ?? null, error: r.error, status: r.status };
  });

export const runWhatsappConnectionTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const { runWhatsappConnectionTest: run } = await import("./dispatch.server");
    return run(context.supabase as never);
  });

export const getWhatsappHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin({ supabase: context.supabase, userId: context.userId });
    const supabase = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    const { data } = await supabase.from("app_settings").select("value").eq("key", "communication.whatsapp.status").maybeSingle();
    const value = ((data as { value?: Record<string, string | undefined> } | null)?.value ?? {}) as {
      last_send_at?: string;
      last_send_to?: string;
      last_send_wamid?: string;
      last_incoming_at?: string;
      last_incoming_from?: string;
      last_incoming_body?: string;
      last_incoming_wamid?: string;
      webhook_verified_at?: string;
    };
    return { status: value, webhookUrl: "/api/public/hooks/whatsapp" };
  });
