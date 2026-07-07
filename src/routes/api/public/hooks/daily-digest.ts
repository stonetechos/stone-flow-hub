/**
 * Cron endpoint — daily AI digest. Generates the daily brief using the
 * AI Gateway and enqueues it into `message_queue` for every user with a
 * digest email/whatsapp configured in `app_settings.daily_digest_recipients`.
 *
 * Trigger via pg_cron POST — `apikey` header required; all privileged
 * work happens with the service-role client behind the header check.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey") ?? request.headers.get("authorization");
        if (!auth) return new Response("Missing apikey", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL!, auth.replace(/^Bearer\s+/i, ""), {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Load recipient list from app_settings singleton
        const { data: settings, error: sErr } = await supabase.from("app_settings").select("value").eq("key", "daily_digest_recipients").maybeSingle();
        if (sErr) return new Response(sErr.message, { status: 500 });
        type Recipient = { channel: "email" | "whatsapp"; to: string };
        const recipients: Recipient[] = Array.isArray(settings?.value) ? (settings!.value as Recipient[]) : [];
        if (recipients.length === 0) return new Response(JSON.stringify({ queued: 0, reason: "no recipients configured" }), { status: 200 });

        // Build a compact snapshot inline (no auth middleware needed for the AI call
        // since we already validated the caller via header).
        const [inv, pay, vp] = await Promise.all([
          supabase.from("invoices").select("total,balance_due").gte("issue_date", new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)),
          supabase.from("payments").select("amount").gte("paid_at", new Date(Date.now() - 86_400_000).toISOString()),
          supabase.from("vendor_payments").select("amount").gte("paid_at", new Date(Date.now() - 86_400_000).toISOString()),
        ]);
        const snapshot = {
          date: new Date().toISOString().slice(0, 10),
          invoices_today: (inv.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0),
          outstanding_today: (inv.data ?? []).reduce((s, r) => s + Number(r.balance_due ?? 0), 0),
          collections_today: (pay.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
          vendor_payments_today: (vp.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
        };

        // Call AI gateway
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("LOVABLE_API_KEY missing", { status: 500 });
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.3,
            messages: [
              { role: "system", content: "You are the Stone Tech OS morning digest. Write a short, actionable snapshot for the owner. Use ONLY the snapshot JSON; never invent numbers. Sections: Business snapshot, Today's priorities (collections/payments/production/installation/procurement), Customer & vendor risks, Recommended actions with reasons. Keep under 250 words. Use ₹ Indian formatting." },
              { role: "user", content: `Snapshot:\n${JSON.stringify(snapshot, null, 2)}` },
            ],
          }),
        });
        if (!aiRes.ok) return new Response(`AI ${aiRes.status}`, { status: 502 });
        const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const body = aiJson.choices?.[0]?.message?.content ?? "";

        const rows = recipients.map((r) => ({
          channel: r.channel,
          to_address: r.to,
          subject: `Stone Tech OS — Daily digest ${snapshot.date}`,
          body,
          status: "pending",
          entity_type: "daily_digest",
        }));
        const { error: qErr } = await supabase.from("message_queue").insert(rows);
        if (qErr) return new Response(qErr.message, { status: 500 });

        return new Response(JSON.stringify({ queued: rows.length }), { status: 200, headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
