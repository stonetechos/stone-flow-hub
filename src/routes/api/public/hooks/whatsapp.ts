/**
 * Meta WhatsApp Business Cloud webhook.
 *
 *  GET  → verification handshake (Meta subscribes / re-verifies)
 *  POST → delivery events (sent/delivered/read/failed) and inbound customer replies
 *
 * The verify token is read from the `WHATSAPP_VERIFY_TOKEN` secret and
 * (as a fallback) the `communication.whatsapp` app setting. Every event is
 * de-duplicated so re-deliveries by Meta never create duplicate rows.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: setting } = await supabaseAdmin
          .from("app_settings")
          .select("value")
          .eq("key", "notifications.whatsapp")
          .maybeSingle();
        const cfg = ((setting as { value?: { verify_token?: string } } | null)?.value ?? {}) as { verify_token?: string };
        const expected = cfg.verify_token || process.env.WHATSAPP_VERIFY_TOKEN;

        if (mode === "subscribe" && token && expected && token === expected && challenge) {
          // Record verification success (idempotent)
          const { updateWhatsappStatus } = await import("@/lib/notifications/dispatch.server");
          await updateWhatsappStatus(supabaseAdmin as never, { webhook_verified_at: new Date().toISOString() });
          return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const raw = await request.text();
        let payload: unknown;
        try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { updateWhatsappStatus } = await import("@/lib/notifications/dispatch.server");

        const body = payload as {
          entry?: Array<{
            changes?: Array<{
              value?: {
                statuses?: Array<{ id?: string; status?: string; recipient_id?: string; timestamp?: string; errors?: Array<{ title?: string; message?: string }> }>;
                messages?: Array<{ id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string }; context?: { id?: string } }>;
                metadata?: { phone_number_id?: string };
              };
            }>;
          }>;
        };

        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            const v = change.value ?? {};

            // -------- delivery status callbacks --------
            for (const st of v.statuses ?? []) {
              if (!st.id || !st.status) continue;
              // find outbound message by wamid
              const { data: mq } = await supabaseAdmin
                .from("message_queue")
                .select("id")
                .eq("provider_message_id", st.id)
                .maybeSingle();
              if (!mq) continue;
              const eventName = st.status; // sent | delivered | read | failed
              // dedupe: skip if event already logged for this (message_id, event, provider_ref)
              const { data: existing } = await supabaseAdmin
                .from("message_delivery_events")
                .select("id")
                .eq("message_id", (mq as { id: string }).id)
                .eq("event", eventName)
                .eq("provider_ref", st.id)
                .maybeSingle();
              if (existing) continue;
              await supabaseAdmin.from("message_delivery_events").insert({
                message_id: (mq as { id: string }).id,
                event: eventName,
                provider: "meta_cloud",
                provider_ref: st.id,
                payload: st as never,
              });
              if (eventName === "read") {
                await supabaseAdmin.from("message_queue").update({ read_at: new Date().toISOString() }).eq("id", (mq as { id: string }).id);
              } else if (eventName === "failed") {
                await supabaseAdmin.from("message_queue").update({
                  status: "failed",
                  last_error: st.errors?.[0]?.message ?? "Delivery failed",
                  failed_reason: st.errors?.[0]?.title ?? "meta_delivery_failed",
                }).eq("id", (mq as { id: string }).id);
              }
            }

            // -------- inbound customer replies --------
            for (const msg of v.messages ?? []) {
              if (!msg.id) continue;
              const text = msg.text?.body ?? `(${msg.type ?? "non-text"} message)`;
              // if the inbound is a reply-to an outbound we know, log it against that message
              if (msg.context?.id) {
                const { data: mq } = await supabaseAdmin
                  .from("message_queue")
                  .select("id")
                  .eq("provider_message_id", msg.context.id)
                  .maybeSingle();
                if (mq) {
                  const { data: existing } = await supabaseAdmin
                    .from("message_delivery_events")
                    .select("id")
                    .eq("message_id", (mq as { id: string }).id)
                    .eq("event", "reply")
                    .eq("provider_ref", msg.id)
                    .maybeSingle();
                  if (!existing) {
                    await supabaseAdmin.from("message_delivery_events").insert({
                      message_id: (mq as { id: string }).id,
                      event: "reply",
                      provider: "meta_cloud",
                      provider_ref: msg.id,
                      payload: { from: msg.from, text, raw: msg } as never,
                    });
                  }
                }
              }
              await updateWhatsappStatus(supabaseAdmin as never, {
                last_incoming_at: new Date().toISOString(),
                last_incoming_from: msg.from,
                last_incoming_body: text.slice(0, 500),
                last_incoming_wamid: msg.id,
              });
            }
          }
        }

        // Meta requires 200 OK within 20s or it will retry — dedupe above makes retries safe.
        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});
