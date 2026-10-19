import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import type { Database, Json } from "@/integrations/supabase/types";
import { sendResendEmail, ResendApiError } from "@/lib/email/resend.server";

/**
 * Drains the `auth_emails` / `transactional_emails` pgmq queues, sending
 * each message via Resend. Replaces src/routes/lovable/email/queue/
 * process.ts's `sendLovableEmail()` call — everything else (the queue
 * mechanics, TTL/retry/DLQ logic, rate-limit backoff) is this app's own
 * Supabase pgmq-based queue, unrelated to Lovable, and is unchanged.
 *
 * Needs its own external cron trigger (see docs/DEPLOYMENT.md's Production
 * Checklist) — the old Lovable-relay path had this same requirement, this
 * isn't new.
 */

interface EmailQueuePayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  purpose?: string;
  label?: string;
  message_id?: string;
  queued_at?: string;
}

const MAX_RETRIES = 5;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_SEND_DELAY_MS = 200;
const DEFAULT_AUTH_TTL_MINUTES = 15;
const DEFAULT_TRANSACTIONAL_TTL_MINUTES = 60;

function isRateLimited(error: unknown): boolean {
  return error instanceof ResendApiError && error.status === 429;
}

function isForbidden(error: unknown): boolean {
  return error instanceof ResendApiError && (error.status === 403 || error.status === 422);
}

function getRetryAfterSeconds(error: unknown): number {
  if (error instanceof ResendApiError && error.retryAfterSeconds != null) {
    return error.retryAfterSeconds;
  }
  return 60;
}

async function moveToDlq(
  supabase: SupabaseClient<Database>,
  queue: string,
  msg: { msg_id: number; message: EmailQueuePayload },
  reason: string,
): Promise<void> {
  const payload = msg.message;
  await supabase.from("email_send_log").insert({
    message_id: payload.message_id ?? null,
    template_name: payload.label || queue,
    recipient_email: payload.to,
    status: "dlq",
    error_message: reason,
  });
  const { error } = await supabase.rpc("move_to_dlq", {
    source_queue: queue,
    dlq_name: `${queue}_dlq`,
    message_id: msg.msg_id,
    payload: payload as unknown as Json,
  });
  if (error) {
    console.error("Failed to move message to DLQ", { queue, msg_id: msg.msg_id, reason, error });
  }
}

export const Route = createFileRoute("/api/public/hooks/email-queue-process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET || process.env.CRON_SHARED_SECRET;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!cronSecret || !supabaseUrl || !supabaseServiceKey) {
          console.error("email-queue-process: missing required environment variables");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const authHeader =
          request.headers.get("Authorization") ?? request.headers.get("x-cron-secret");
        const token = authHeader?.startsWith("Bearer ")
          ? authHeader.slice("Bearer ".length).trim()
          : authHeader;
        if (token !== cronSecret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase: SupabaseClient<Database> = createClient<Database>(
          supabaseUrl,
          supabaseServiceKey,
        );

        const { data: state } = await supabase
          .from("email_send_state")
          .select(
            "retry_after_until, batch_size, send_delay_ms, auth_email_ttl_minutes, transactional_email_ttl_minutes",
          )
          .single();

        if (state?.retry_after_until && new Date(state.retry_after_until) > new Date()) {
          return Response.json({ skipped: true, reason: "rate_limited" });
        }

        const batchSize = state?.batch_size ?? DEFAULT_BATCH_SIZE;
        const sendDelayMs = state?.send_delay_ms ?? DEFAULT_SEND_DELAY_MS;
        const ttlMinutes: Record<string, number> = {
          auth_emails: state?.auth_email_ttl_minutes ?? DEFAULT_AUTH_TTL_MINUTES,
          transactional_emails:
            state?.transactional_email_ttl_minutes ?? DEFAULT_TRANSACTIONAL_TTL_MINUTES,
        };

        let totalProcessed = 0;

        for (const queue of ["auth_emails", "transactional_emails"]) {
          const { data: rawMessages, error: readError } = await supabase.rpc("read_email_batch", {
            queue_name: queue,
            batch_size: batchSize,
            vt: 30,
          });
          const messages = rawMessages as unknown as
            { msg_id: number; read_ct: number; message: EmailQueuePayload }[] | null;

          if (readError) {
            console.error("Failed to read email batch", { queue, error: readError });
            continue;
          }

          if (!messages?.length) continue;

          const messageIds = Array.from(
            new Set(
              messages
                .map((msg) =>
                  typeof msg.message?.message_id === "string" ? msg.message.message_id : null,
                )
                .filter((id: string | null): id is string => Boolean(id)),
            ),
          );
          const failedAttemptsByMessageId = new Map<string, number>();
          if (messageIds.length > 0) {
            const { data: failedRows, error: failedRowsError } = await supabase
              .from("email_send_log")
              .select("message_id")
              .in("message_id", messageIds)
              .eq("status", "failed");

            if (failedRowsError) {
              console.error("Failed to load failed-attempt counters", {
                queue,
                error: failedRowsError,
              });
            } else {
              for (const row of failedRows ?? []) {
                const messageId = row?.message_id;
                if (typeof messageId !== "string" || !messageId) continue;
                failedAttemptsByMessageId.set(
                  messageId,
                  (failedAttemptsByMessageId.get(messageId) ?? 0) + 1,
                );
              }
            }
          }

          for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const payload = msg.message;
            const failedAttempts =
              payload?.message_id && typeof payload.message_id === "string"
                ? (failedAttemptsByMessageId.get(payload.message_id) ?? 0)
                : (msg.read_ct ?? 0);

            const queuedAt = payload.queued_at;
            if (queuedAt) {
              const ageMs = Date.now() - new Date(queuedAt).getTime();
              const maxAgeMs = ttlMinutes[queue] * 60 * 1000;
              if (ageMs > maxAgeMs) {
                console.warn("Email expired (TTL exceeded)", {
                  queue,
                  msg_id: msg.msg_id,
                  queued_at: queuedAt,
                  ttl_minutes: ttlMinutes[queue],
                });
                await moveToDlq(
                  supabase,
                  queue,
                  msg,
                  `TTL exceeded (${ttlMinutes[queue]} minutes)`,
                );
                continue;
              }
            }

            if (failedAttempts >= MAX_RETRIES) {
              await moveToDlq(
                supabase,
                queue,
                msg,
                `Max retries (${MAX_RETRIES}) exceeded (attempted ${failedAttempts} times)`,
              );
              continue;
            }

            if (payload.message_id) {
              const { data: alreadySent } = await supabase
                .from("email_send_log")
                .select("id")
                .eq("message_id", payload.message_id)
                .eq("status", "sent")
                .maybeSingle();

              if (alreadySent) {
                console.warn("Skipping duplicate send (already sent)", {
                  queue,
                  msg_id: msg.msg_id,
                  message_id: payload.message_id,
                });
                const { error: dupDelError } = await supabase.rpc("delete_email", {
                  queue_name: queue,
                  message_id: msg.msg_id,
                });
                if (dupDelError) {
                  console.error("Failed to delete duplicate message from queue", {
                    queue,
                    msg_id: msg.msg_id,
                    error: dupDelError,
                  });
                }
                continue;
              }
            }

            try {
              await sendResendEmail({
                to: payload.to,
                from: payload.from,
                subject: payload.subject,
                html: payload.html,
                text: payload.text,
                idempotencyKey: payload.message_id,
              });

              await supabase.from("email_send_log").insert({
                message_id: payload.message_id,
                template_name: payload.label || queue,
                recipient_email: payload.to,
                status: "sent",
              });

              const { error: delError } = await supabase.rpc("delete_email", {
                queue_name: queue,
                message_id: msg.msg_id,
              });
              if (delError) {
                console.error("Failed to delete sent message from queue", {
                  queue,
                  msg_id: msg.msg_id,
                  error: delError,
                });
              }
              totalProcessed++;
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error("Email send failed", {
                queue,
                msg_id: msg.msg_id,
                read_ct: msg.read_ct,
                failed_attempts: failedAttempts,
                error: errorMsg,
              });

              if (isRateLimited(error)) {
                await supabase.from("email_send_log").insert({
                  message_id: payload.message_id,
                  template_name: payload.label || queue,
                  recipient_email: payload.to,
                  status: "failed",
                  error_message: errorMsg.slice(0, 1000),
                });

                const retryAfterSecs = getRetryAfterSeconds(error);
                await supabase
                  .from("email_send_state")
                  .update({
                    retry_after_until: new Date(Date.now() + retryAfterSecs * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", 1);

                return Response.json({ processed: totalProcessed, stopped: "rate_limited" });
              }

              if (isForbidden(error)) {
                await moveToDlq(supabase, queue, msg, errorMsg.slice(0, 1000));
                return Response.json({ processed: totalProcessed, stopped: "forbidden" });
              }

              await supabase.from("email_send_log").insert({
                message_id: payload.message_id,
                template_name: payload.label || queue,
                recipient_email: payload.to,
                status: "failed",
                error_message: errorMsg.slice(0, 1000),
              });
              if (payload?.message_id && typeof payload.message_id === "string") {
                failedAttemptsByMessageId.set(payload.message_id, failedAttempts + 1);
              }
            }

            if (i < messages.length - 1) {
              await new Promise((r) => setTimeout(r, sendDelayMs));
            }
          }
        }

        return Response.json({ processed: totalProcessed });
      },
    },
  },
});
