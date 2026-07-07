/** Customer Timeline — unified chronological feed across every module. Read-only. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type TimelineKind =
  | "enquiry" | "estimate" | "quote" | "sales_order"
  | "invoice" | "receipt" | "payment" | "dispatch"
  | "site_visit" | "followup" | "message" | "comment" | "task";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string;             // ISO
  title: string;
  subtitle?: string | null;
  amount?: number | null;
  status?: string | null;
  refNo?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
}

interface Row { [k: string]: unknown }
function s(r: Row, k: string): string | null { const v = r[k]; return v == null ? null : String(v); }
function n(r: Row, k: string): number | null { const v = r[k]; return v == null ? null : Number(v); }

export async function getCustomerTimeline(customerId: string, limit = 400): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // Simple parallel fetches; each is optional (best-effort — a table failure just skips it).
  const runs: Promise<void>[] = [];

  const push = (fn: () => Promise<TimelineEvent[]>) =>
    runs.push(fn().then((rows) => { events.push(...rows); }).catch(() => {}));

  push(async () => {
    const { data, error } = await supabase.from("enquiries").select("id,enquiry_no,subject,status,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `enq-${s(r,"id")}`, kind: "enquiry" as const,
      at: s(r,"created_at") ?? "", title: `Enquiry ${s(r,"enquiry_no") ?? ""}`,
      subtitle: s(r,"subject"), status: s(r,"status"), refNo: s(r,"enquiry_no"),
      href: `/enquiries/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("estimates").select("id,estimate_no,template,status,total,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `est-${s(r,"id")}`, kind: "estimate" as const,
      at: s(r,"created_at") ?? "", title: `Estimate ${s(r,"estimate_no") ?? ""}`,
      subtitle: s(r,"template"), amount: n(r,"total"), status: s(r,"status"), refNo: s(r,"estimate_no"),
      href: `/estimates/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("quotes").select("id,quote_no,status,total,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `qt-${s(r,"id")}`, kind: "quote" as const,
      at: s(r,"created_at") ?? "", title: `Quotation ${s(r,"quote_no") ?? ""}`,
      amount: n(r,"total"), status: s(r,"status"), refNo: s(r,"quote_no"),
      href: `/quotes/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("sales_orders").select("id,so_no,status,total,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `so-${s(r,"id")}`, kind: "sales_order" as const,
      at: s(r,"created_at") ?? "", title: `Sales Order ${s(r,"so_no") ?? ""}`,
      amount: n(r,"total"), status: s(r,"status"), refNo: s(r,"so_no"),
      href: `/sales-orders/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("invoices").select("id,invoice_no,status,total,balance_due,issue_date,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `inv-${s(r,"id")}`, kind: "invoice" as const,
      at: s(r,"issue_date") ?? s(r,"created_at") ?? "", title: `Invoice ${s(r,"invoice_no") ?? ""}`,
      amount: n(r,"total"), status: s(r,"status"), refNo: s(r,"invoice_no"),
      subtitle: n(r,"balance_due") ? `Balance ₹${n(r,"balance_due")}` : "Paid",
      href: `/invoices/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("receipts").select("id,receipt_no,status,net_amount,received_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `rcp-${s(r,"id")}`, kind: "receipt" as const,
      at: s(r,"received_at") ?? "", title: `Receipt ${s(r,"receipt_no") ?? ""}`,
      amount: n(r,"net_amount"), status: s(r,"status"), refNo: s(r,"receipt_no"),
      href: `/receipts/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("payments").select("id,amount,method,paid_at,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `pay-${s(r,"id")}`, kind: "payment" as const,
      at: s(r,"paid_at") ?? s(r,"created_at") ?? "", title: `Payment received`,
      amount: n(r,"amount"), subtitle: s(r,"method"),
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("dispatches").select("id,dispatch_no,status,dispatched_at,created_at,customer_id").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `dsp-${s(r,"id")}`, kind: "dispatch" as const,
      at: s(r,"dispatched_at") ?? s(r,"created_at") ?? "",
      title: `Dispatch ${s(r,"dispatch_no") ?? ""}`, status: s(r,"status"), refNo: s(r,"dispatch_no"),
      href: `/dispatch/${s(r,"id")}`,
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("site_visits").select("id,visit_date,purpose,status,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `sv-${s(r,"id")}`, kind: "site_visit" as const,
      at: s(r,"visit_date") ?? s(r,"created_at") ?? "", title: `Site visit`,
      subtitle: s(r,"purpose"), status: s(r,"status"),
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("followups").select("id,subject,due_at,status,channel,created_at").eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `fu-${s(r,"id")}`, kind: "followup" as const,
      at: s(r,"due_at") ?? s(r,"created_at") ?? "",
      title: `Follow-up: ${s(r,"subject") ?? ""}`, status: s(r,"status"), subtitle: s(r,"channel"),
    }));
  });

  push(async () => {
    const { data, error } = await supabase.from("message_queue")
      .select("id,channel,to_address,subject,body,status,created_at,read_at")
      .eq("customer_id", customerId).limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Row) => ({
      id: `msg-${s(r,"id")}`, kind: "message" as const,
      at: s(r,"created_at") ?? "", title: `${String(s(r,"channel") ?? "").toUpperCase()} → ${s(r,"to_address")}`,
      subtitle: s(r,"subject") ?? String(r["body"] ?? "").slice(0, 80),
      status: s(r,"status"),
    }));
  });

  await Promise.all(runs);

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events.slice(0, limit);
}

export async function getCustomerHeader(customerId: string): Promise<{ id: string; name: string; customer_code: string } | null> {
  const { data, error } = await supabase.from("customers").select("id,name,customer_code").eq("id", customerId).maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}
