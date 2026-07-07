/** Message Templates — CRUD helpers over `message_templates`. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type MessageTemplateRow = DbTable<"message_templates">;

export async function listMessageTemplates(): Promise<MessageTemplateRow[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("category")
    .order("channel")
    .order("name");
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getMessageTemplate(code: string): Promise<MessageTemplateRow | null> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function upsertMessageTemplate(input: {
  code: string;
  name: string;
  channel: "email" | "whatsapp" | "sms";
  category?: string;
  subject?: string | null;
  body: string;
  variables?: string[];
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from("message_templates")
    .upsert(
      {
        code: input.code,
        name: input.name,
        channel: input.channel,
        category: input.category ?? "general",
        subject: input.subject ?? null,
        body: input.body,
        variables: (input.variables ?? []) as unknown as never,
        is_active: input.is_active ?? true,
      },
      { onConflict: "code" },
    )
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
