import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const savePushTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        token: z.string().min(20),
        platform: z.enum(["android", "ios", "web"]).default("android"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Fetch current preferences
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("preferences")
        .eq("id", context.userId)
        .single();

      const profileRecord = profile as { preferences?: Record<string, unknown> } | null;
      const prefs = profileRecord?.preferences || {};
      const existingTokens: string[] = Array.isArray(prefs.fcm_tokens)
        ? (prefs.fcm_tokens as string[])
        : [];

      if (!existingTokens.includes(data.token)) {
        const updatedTokens = [...existingTokens, data.token].slice(-5); // keep latest 5 devices
        await supabaseAdmin
          .from("profiles")
          .update({
            preferences: { ...prefs, fcm_tokens: updatedTokens },
            updated_at: new Date().toISOString(),
          })
          .eq("id", context.userId);
      }

      return { success: true };
    } catch (err) {
      console.error("[FCM] Failed to save push token for user", err);
      return { success: false, error: String(err) };
    }
  });
