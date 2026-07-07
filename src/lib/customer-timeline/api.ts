/** Customer Timeline — unified chronological feed across every module. Read-only, best-effort. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type TimelineKind =
  | "enquiry" | "estimate" | "quote" | "sales_order"
  | "invoice" | "receipt" | "payment" | "dispatch"
  | "site_visit" | "followup" | "message" | "comment" | "task";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string;
  title: string;
  subtitle?: string | null;
  amount?: number | null;
  status?: string | null;
  refNo?: string | null;
  href?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export async function getCustomerTimeline(customerId: string, limit = 400): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  const from = (tbl: string) => (supabase.from as unknown as (t: string) => Any)(tbl);
  const runs: Promise<void>[] = [];
  const push = (fn: () => Promise<TimelineEvent[]>) =>
    runs.push(fn().then((rows) => { events.push(...rows); }).catch(() => {}));

  push(async () => {
    const { data } = await from("enquiries").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `enq-${r.id}`, kind: "enquiry" as const, at: r.created_at ?? "",
      title: `Enquiry ${r.enquiry_no ?? ""}`, subtitle: r.requirement ?? null,
      status: r.stage ?? null, refNo: r.enquiry_no ?? null, href: `/enquiries/${r.id}`,
    }));
  });
  push(async () => {
    const { data } = await from("estimates").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `est-${r.id}`, kind: "estimate" as const, at: r.created_at ?? "",
      title: `Estimate ${r.estimate_no ?? ""}`, subtitle: r.template ?? null,
      amount: r.total != null ? Number(r.total) : null, status: r.status ?? null,
      refNo: r.estimate_no ?? null, href: `/estimates/${r.id}`,
    }));
  });
  push(async () => {
    const { data } = await from("quotes").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `qt-${r.id}`, kind: "quote" as const, at: r.created_at ?? "",
      title: `Quotation ${r.quote_no ?? ""}`, amount: r.total != null ? Number(r.total) : null,
      status: r.status ?? null, refNo: r.quote_no ?? null, href: `/quotes/${r.id}`,
    }));
  });
  push(async () => {
    const { data } = await from("sales_orders").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `so-${r.id}`, kind: "sales_order" as const, at: r.created_at ?? "",
      title: `Sales Order ${r.so_no ?? ""}`, status: r.status ?? null,
      refNo: r.so_no ?? null, href: `/sales-orders/${r.id}`,
    }));
  });
  push(async () => {
    const { data } = await from("invoices").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `inv-${r.id}`, kind: "invoice" as const,
      at: r.issue_date ?? r.created_at ?? "",
      title: `Invoice ${r.invoice_no ?? ""}`, amount: r.total != null ? Number(r.total) : null,
      status: r.status ?? null, refNo: r.invoice_no ?? null,
      subtitle: r.balance_due != null && Number(r.balance_due) > 0 ? `Balance ₹${r.balance_due}` : "Paid",
      href: `/invoices/${r.id}`,
    }));
  });
  push(async () => {
    const { data } = await from("receipts").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `rcp-${r.id}`, kind: "receipt" as const, at: r.received_at ?? "",
      title: `Receipt ${r.receipt_no ?? ""}`, amount: r.net_amount != null ? Number(r.net_amount) : null,
      status: r.status ?? null, refNo: r.receipt_no ?? null, href: `/receipts/${r.id}`,
    }));
  });
  push(async () => {
    // payments only join via invoice.customer_id
    const { data } = await from("payments").select("*, invoice:invoices!inner(customer_id)").eq("invoice.customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `pay-${r.id}`, kind: "payment" as const, at: r.paid_at ?? r.created_at ?? "",
      title: `Payment received`, amount: r.amount != null ? Number(r.amount) : null, subtitle: r.method ?? null,
    }));
  });
  push(async () => {
    const { data } = await from("dispatches").select("*, sales_order:sales_orders!inner(customer_id)").eq("sales_order.customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `dsp-${r.id}`, kind: "dispatch" as const, at: r.dispatch_date ?? r.created_at ?? "",
      title: `Dispatch ${r.dispatch_no ?? ""}`, status: r.status ?? null,
      refNo: r.dispatch_no ?? null, href: `/dispatch/${r.id}`,
    }));
  });
  push(async () => {
    const { data } = await from("site_visits").select("*, project:projects!inner(customer_id)").eq("project.customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `sv-${r.id}`, kind: "site_visit" as const,
      at: r.conducted_at ?? r.scheduled_at ?? r.created_at ?? "",
      title: `Site visit`, subtitle: r.summary ?? null, status: r.status ?? null,
    }));
  });
  push(async () => {
    const { data } = await from("followups").select("*").eq("entity_type", "customer").eq("entity_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `fu-${r.id}`, kind: "followup" as const,
      at: r.scheduled_at ?? r.created_at ?? "",
      title: `Follow-up`, status: r.status ?? null, subtitle: r.channel ?? r.notes ?? null,
    }));
  });
  push(async () => {
    const { data } = await from("message_queue").select("*").eq("customer_id", customerId).limit(limit);
    return (data ?? []).map((r: Any) => ({
      id: `msg-${r.id}`, kind: "message" as const, at: r.created_at ?? "",
      title: `${String(r.channel ?? "").toUpperCase()} → ${r.to_address ?? ""}`,
      subtitle: r.subject ?? String(r.body ?? "").slice(0, 80),
      status: r.status ?? null,
    }));
  });

  await Promise.all(runs);
  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events.slice(0, limit);
}

export async function getCustomerHeader(customerId: string) {
  const { data, error } = await supabase.from("customers").select("id,name,customer_code").eq("id", customerId).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
