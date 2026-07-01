/** Razorpay webhook — verifies HMAC and records payments. */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const raw = await request.text();
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          event?: string;
          payload?: {
            payment_link?: { entity?: { id?: string; status?: string } };
            payment?: { entity?: { id?: string; amount?: number; method?: string } };
          };
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const event = payload.event ?? "";
        const linkId = payload.payload?.payment_link?.entity?.id;
        const paymentEntity = payload.payload?.payment?.entity;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (event === "payment_link.paid" && linkId && paymentEntity?.id && paymentEntity.amount) {
          const { data: linkRow } = await supabaseAdmin
            .from("payment_links")
            .select("id, invoice_id")
            .eq("provider_link_id", linkId)
            .maybeSingle();

          if (linkRow) {
            // Idempotency: skip if we've already recorded this payment.
            const { data: existing } = await supabaseAdmin
              .from("payments")
              .select("id")
              .eq("razorpay_payment_id", paymentEntity.id)
              .maybeSingle();

            if (!existing) {
              await supabaseAdmin.from("payments").insert({
                payment_no: "",
                invoice_id: linkRow.invoice_id,
                payment_link_id: linkRow.id,
                amount: paymentEntity.amount / 100,
                method: "razorpay",
                razorpay_payment_id: paymentEntity.id,
                razorpay_link_id: linkId,
                paid_at: new Date().toISOString(),
              });
            }
            await supabaseAdmin
              .from("payment_links")
              .update({ status: "paid" })
              .eq("id", linkRow.id);
          }
        } else if (event === "payment_link.cancelled" && linkId) {
          await supabaseAdmin
            .from("payment_links")
            .update({ status: "cancelled" })
            .eq("provider_link_id", linkId);
        } else if (event === "payment_link.expired" && linkId) {
          await supabaseAdmin
            .from("payment_links")
            .update({ status: "expired" })
            .eq("provider_link_id", linkId);
        }

        return new Response("ok");
      },
    },
  },
});
