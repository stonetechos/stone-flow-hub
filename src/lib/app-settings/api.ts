/** App Settings — singleton key/value store for provider configs, feature flags, etc. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type AppSettingKey =
  | "notifications.email"
  | "notifications.whatsapp"
  | "notifications.sms"
  | "payments.gateways";

export async function getAppSetting<T = Record<string, unknown>>(
  key: AppSettingKey,
): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data?.value as T) ?? null;
}

export async function upsertAppSetting(
  key: AppSettingKey,
  value: Record<string, unknown>,
  description?: string,
): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    // Supabase Json cast — value is JSON-serializable
    .upsert(
      { key, value: value as unknown as never, description: description ?? null },
      { onConflict: "key" },
    );
  if (error) throw new AppError(mapDbError(error));
}

export async function listAppSettings() {
  const { data, error } = await supabase.from("app_settings").select("*").order("key");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}
