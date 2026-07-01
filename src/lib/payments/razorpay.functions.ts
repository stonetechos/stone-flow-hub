/** Server functions for Razorpay payment links. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createLinkInput = z.object({ invoice_id: z.string().uuid() });
const cancelLinkInput = z.object({ payment_link_id: z.string().uuid() });

export const createRazorpayLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createLinkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { rzpCreatePaymentLink } = await import("./razorpay.server");

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*, customer:customers!invoices_customer_id_fkey(name,primary_phone,primary_email)")
      .eq("id", data.invoice_id)
      .single();
    if (invErr || !invoice) throw new Error("Invoice not found");
    const balance = Number(invoice.balance_due ?? 0);
    if (balance <= 0) throw new Error("Nothing to collect on this invoice");

    const cust = invoice.customer as {
      name: string;
      primary_phone: string | null;
      primary_email: string | null;
    } | null;

    const link = await rzpCreatePaymentLink({
      amountInPaise: Math.round(balance * 100),
      currency: invoice.currency_code || "INR",
      description: `Invoice ${invoice.invoice_no}`,
      reference_id: invoice.invoice_no,
      customer: {
        name: cust?.name ?? "Customer",
        contact: cust?.primary_phone ? `+91${cust.primary_phone}` : undefined,
        email: cust?.primary_email ?? undefined,
      },
      notes: { invoice_id: invoice.id },
    });

    const { data: row, error: insErr } = await supabase
      .from("payment_links")
      .insert({
        link_no: "",
        invoice_id: invoice.id,
        provider: "razorpay",
        provider_link_id: link.id,
        short_url: link.short_url,
        amount: balance,
        currency_code: invoice.currency_code || "INR",
        status: "created",
        expires_at: link.expire_by ? new Date(link.expire_by * 1000).toISOString() : null,
      })
      .select("*")
      .single();
    if (insErr) throw new Error(insErr.message);
    return row;
  });

export const cancelRazorpayLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cancelLinkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { rzpCancelPaymentLink } = await import("./razorpay.server");

    const { data: link, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("id", data.payment_link_id)
      .single();
    if (error || !link) throw new Error("Payment link not found");
    if (link.provider_link_id) await rzpCancelPaymentLink(link.provider_link_id);
    await supabase.from("payment_links").update({ status: "cancelled" }).eq("id", link.id);
    return { ok: true };
  });
