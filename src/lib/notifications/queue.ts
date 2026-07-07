/** Notification Queue — client-side helpers to enqueue, list, retry, cancel messages.
 *
 * Sends never happen inline — every message goes into `message_queue` with
 * status = 'queued'. A background dispatcher (server-side, added when a
 * provider is configured) picks it up, calls the resolved provider, records
 * status transitions in `message_delivery_events`, and retries on transient
 * failure using exponential backoff.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { sanitizeSearch } from "@/lib/zod";
import type { DbTable } from "@/lib/types";
import type { MessageChannel } from "./providers/types";

export type MessageQueueRow = DbTable<"message_queue">;
export type MessageDeliveryEventRow = DbTable<"message_delivery_events">;

export interface EnqueueInput {
  channel: MessageChannel;
  templateCode?: string;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  body: string;
  variables?: Record<string, string | number | null>;
  relatedType?: string;
  relatedId?: string;
  customerId?: string;
  maxAttempts?: number;
}

export async function enqueueMessage(input: EnqueueInput): Promise<MessageQueueRow> {
  const { data, error } = await supabase
    .from("message_queue")
    .insert({
      channel: input.channel,
      template_code: input.templateCode ?? null,
      to_address: input.to,
      cc_address: input.cc ?? null,
      bcc_address: input.bcc ?? null,
      subject: input.subject ?? null,
      body: input.body,
      variables: (input.variables ?? {}) as unknown as never,
      related_type: input.relatedType ?? null,
      related_id: input.relatedId ?? null,
      customer_id: input.customerId ?? null,
      max_attempts: input.maxAttempts ?? 5,
      status: "queued",
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function listMessages(query = "", channel?: MessageChannel) {
  let q = supabase
    .from("message_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (channel) q = q.eq("channel", channel);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`message_no.ilike.%${s}%,to_address.ilike.%${s}%,subject.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function listMessagesByEntity(relatedType: string, relatedId: string) {
  const { data, error } = await supabase
    .from("message_queue")
    .select("*")
    .eq("related_type", relatedType)
    .eq("related_id", relatedId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getMessage(id: string) {
  const { data, error } = await supabase
    .from("message_queue")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function getMessageEvents(id: string): Promise<MessageDeliveryEventRow[]> {
  const { data, error } = await supabase
    .from("message_delivery_events")
    .select("*")
    .eq("message_id", id)
    .order("occurred_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/** Requeue a failed message. */
export async function retryMessage(id: string) {
  const { error } = await supabase
    .from("message_queue")
    .update({ status: "queued", next_retry_at: null, last_error: null })
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

/** Mark a queued message as cancelled. */
export async function cancelMessage(id: string) {
  const { error } = await supabase
    .from("message_queue")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["queued", "failed"]);
  if (error) throw new AppError(mapDbError(error));
}
