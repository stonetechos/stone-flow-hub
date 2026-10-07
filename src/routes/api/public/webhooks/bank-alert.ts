/**
 * Inbound Bank & UPI Transaction Ingestion Webhook.
 *
 * Receives automated alerts forwarded from:
 * 1. SMS Gateway / Android SMS forwarder on +91 7742090866
 * 2. Email parser / Webhook forwarder from stonetech.ahmedabad@gmail.com
 *
 * Supports Bank of Baroda Current Account 53130200000136, GPay, and PhonePe.
 * Idempotently parses and records credit / debit entries into `bank_transactions`
 * and updates live account balances.
 */
import { createFileRoute } from "@tanstack/react-router";
import { parseTransactionMessage } from "@/lib/banking/sms-parser";

export const Route = createFileRoute("/api/public/webhooks/bank-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") || "";
          let rawBody = "";
          let sender = "";
          let subject = "";

          if (contentType.includes("application/json")) {
            const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
            rawBody =
              (json.message as string) ||
              (json.text as string) ||
              (json.body as string) ||
              (json.content as string) ||
              (json.snippet as string) ||
              JSON.stringify(json);
            sender = (json.sender as string) || (json.from as string) || "";
            subject = (json.subject as string) || "";
          } else {
            rawBody = await request.text();
          }

          const combinedText = [subject, rawBody].filter(Boolean).join("\n");
          if (!combinedText || combinedText.trim().length < 5) {
            return Response.json({ error: "Empty alert payload" }, { status: 400 });
          }

          const parsed = parseTransactionMessage(combinedText);
          if (!parsed || parsed.amount <= 0) {
            return Response.json(
              {
                status: "ignored",
                message: "No financial transaction detected in payload",
                raw_preview: combinedText.slice(0, 100),
              },
              { status: 200 },
            );
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1. Resolve Bank of Baroda account or target account
          const { data: accounts } = await supabaseAdmin
            .from("bank_accounts" as never)
            .select("id, name, account_number, current_balance")
            .limit(10);

          type Acc = { id: string; name: string; account_number?: string; current_balance: number };
          const accList = (accounts as unknown as Acc[]) || [];

          // Match BOB account 53130200000136
          let targetAccount = accList.find(
            (a) =>
              a.account_number?.includes("53130200000136") ||
              a.account_number?.includes("0136") ||
              a.account_number?.includes("0866") ||
              a.name?.toLowerCase().includes("baroda") ||
              a.name?.toLowerCase().includes("bob"),
          );

          if (!targetAccount && accList.length > 0) {
            targetAccount = accList[0];
          }

          // 2. De-duplicate transaction by UTR / Reference if available
          if (parsed.utr_number) {
            const { data: existingTx } = await supabaseAdmin
              .from("bank_transactions" as never)
              .select("id")
              .eq("utr_number" as never, parsed.utr_number as never)
              .maybeSingle();

            if (existingTx) {
              return Response.json({
                status: "duplicate",
                message: `Transaction with UTR ${parsed.utr_number} already recorded`,
                transaction_id: (existingTx as { id: string }).id,
              });
            }
          }

          // 3. Insert into bank_transactions
          const noteChannel = sender
            ? `Alert via: ${sender}`
            : combinedText.includes("7742090866")
              ? "Alert via SMS (+917742090866)"
              : "Alert via Email (stonetech.ahmedabad@gmail.com)";

          const { data: inserted, error: insertError } = await supabaseAdmin
            .from("bank_transactions" as never)
            .insert({
              bank_account_id: targetAccount?.id ?? null,
              source: parsed.source,
              transaction_type: parsed.transaction_type,
              amount: parsed.amount,
              utr_number: parsed.utr_number ?? null,
              counterparty_name: parsed.counterparty_name ?? null,
              raw_message: combinedText,
              status: "reconciled",
              notes: `${noteChannel} | Auto-ingested Bank of Baroda alert`,
              transaction_date: parsed.date || new Date().toISOString().slice(0, 10),
            } as never)
            .select("*")
            .single();

          if (insertError) {
            return Response.json(
              { error: "Failed to record transaction", details: insertError.message },
              { status: 500 },
            );
          }

          // 4. Update bank_account balance
          if (targetAccount) {
            const delta = parsed.transaction_type === "credit" ? parsed.amount : -parsed.amount;
            const newBal = Number(targetAccount.current_balance || 0) + delta;
            await supabaseAdmin
              .from("bank_accounts" as never)
              .update({
                current_balance: newBal,
                updated_at: new Date().toISOString(),
              } as never)
              .eq("id" as never, targetAccount.id as never);
          }

          return Response.json({
            status: "recorded",
            transaction: inserted,
            parsed,
            account_updated: targetAccount?.name ?? null,
          });
        } catch (err: unknown) {
          const e = err as { message?: string };
          return Response.json({ error: e?.message || "Internal server error" }, { status: 500 });
        }
      },
      GET: async () => {
        return Response.json({
          endpoint: "/api/public/webhooks/bank-alert",
          status: "active",
          monitored_account: "Bank of Baroda Current A/c 53130200000136",
          sms_channel: "+91 7742090866",
          email_channel: "stonetech.ahmedabad@gmail.com",
        });
      },
    },
  },
});
