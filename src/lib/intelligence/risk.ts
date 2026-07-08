/**
 * Stone Tech Intelligence — Risk detection.
 *
 * Aggregates operational risks across enquiries, quotations, invoices,
 * dispatches, installations, RFQs, POs and receipts. Read-only: never
 * mutates records. Consumers use it to surface warnings and to power the
 * Business Health / Daily Action dashboards.
 */
import { supabase } from "@/integrations/supabase/client";
import { STAGE_TO_UMBRELLA } from "@/lib/constants";
import { STAGE_AGE_WARNING_DAYS } from "@/lib/lead-stage/health";
import type { LeadStage } from "@/lib/types";

export type RiskKey =
  | "quotation_stale"
  | "no_followup"
  | "project_delayed"
  | "dispatch_overdue"
  | "installation_overdue"
  | "vendor_delay"
  | "payment_overdue"
  | "inactive_enquiry"
  | "no_salesperson"
  | "missing_quotation"
  | "missing_rfq"
  | "missing_po"
  | "missing_invoice"
  | "missing_installation"
  | "missing_completion";

export interface RiskItem {
  key: RiskKey;
  severity: "low" | "medium" | "high";
  entity: "enquiry" | "quote" | "invoice" | "dispatch" | "installation" | "po" | "rfq";
  entityId: string;
  label: string;
  reason: string;
  daysOverdue: number;
  href: string;
}

export interface RiskSummary {
  items: RiskItem[];
  counts: Record<RiskKey, number>;
}

const now = () => Date.now();
const days = (iso: string | null) => (iso ? Math.max(0, Math.floor((now() - new Date(iso).getTime()) / 86_400_000)) : 0);

export async function getRiskSummary(quoteStaleDays = 14): Promise<RiskSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (t: string) => (supabase.from as unknown as (n: string) => any)(t);

  const [enqRes, quoteRes, invRes, dispRes, instRes, poRes, rfqRes] = await Promise.all([
    from("enquiries").select("id,enquiry_no,stage,assigned_to,updated_at,created_at").limit(2000),
    from("quotes").select("id,quote_no,status,created_at,customer_id").in("status", ["draft", "sent"]).limit(2000),
    from("invoices").select("id,invoice_no,status,due_date,balance_due,customer_id").limit(2000),
    from("dispatches").select("id,dispatch_no,status,dispatch_date").limit(2000),
    from("installations").select("id,installation_no,status,planned_end_date,actual_end_date").limit(2000),
    from("purchase_orders").select("id,po_no,status,expected_delivery_date").limit(2000),
    from("rfqs").select("id,rfq_no,status,due_date").limit(2000),
  ]);

  const items: RiskItem[] = [];
  const counts = {} as Record<RiskKey, number>;
  const bump = (k: RiskKey) => (counts[k] = (counts[k] ?? 0) + 1);
  const add = (r: RiskItem) => { items.push(r); bump(r.key); };

  for (const e of (enqRes.data ?? []) as Array<{ id: string; enquiry_no: string; stage: LeadStage; assigned_to: string | null; updated_at: string; created_at: string }>) {
    const umb = STAGE_TO_UMBRELLA[e.stage];
    if (umb === "lost" || umb === "cancelled" || umb === "completed") continue;
    const inactive = days(e.updated_at ?? e.created_at);
    const warn = STAGE_AGE_WARNING_DAYS[umb];
    if (!e.assigned_to) add({ key: "no_salesperson", severity: "high", entity: "enquiry", entityId: e.id, label: e.enquiry_no, reason: "No salesperson assigned", daysOverdue: inactive, href: `/enquiries/${e.id}` });
    if (inactive > warn * 2) add({ key: "inactive_enquiry", severity: "high", entity: "enquiry", entityId: e.id, label: e.enquiry_no, reason: `Untouched for ${inactive} days`, daysOverdue: inactive - warn, href: `/enquiries/${e.id}` });
    else if (inactive > warn) add({ key: "inactive_enquiry", severity: "medium", entity: "enquiry", entityId: e.id, label: e.enquiry_no, reason: `Slow — ${inactive} days in stage`, daysOverdue: inactive - warn, href: `/enquiries/${e.id}` });
  }

  for (const q of (quoteRes.data ?? []) as Array<{ id: string; quote_no: string; created_at: string }>) {
    const age = days(q.created_at);
    if (age > quoteStaleDays) add({ key: "quotation_stale", severity: age > quoteStaleDays * 2 ? "high" : "medium", entity: "quote", entityId: q.id, label: q.quote_no, reason: `Quotation open for ${age} days`, daysOverdue: age - quoteStaleDays, href: `/quotes/${q.id}` });
  }

  for (const i of (invRes.data ?? []) as Array<{ id: string; invoice_no: string; status: string; due_date: string | null; balance_due: number | null }>) {
    if (i.status === "paid" || (i.balance_due ?? 0) <= 0) continue;
    if (i.due_date && new Date(i.due_date).getTime() < now()) {
      const d = days(i.due_date);
      add({ key: "payment_overdue", severity: d > 30 ? "high" : "medium", entity: "invoice", entityId: i.id, label: i.invoice_no, reason: `Payment overdue ${d} days (₹${Number(i.balance_due ?? 0).toLocaleString("en-IN")})`, daysOverdue: d, href: `/invoices/${i.id}` });
    }
  }

  for (const d of (dispRes.data ?? []) as Array<{ id: string; dispatch_no: string; status: string; dispatch_date: string | null }>) {
    if (["delivered", "cancelled"].includes(String(d.status))) continue;
    if (d.dispatch_date && new Date(d.dispatch_date).getTime() < now()) {
      const od = days(d.dispatch_date);
      add({ key: "dispatch_overdue", severity: od > 7 ? "high" : "medium", entity: "dispatch", entityId: d.id, label: d.dispatch_no ?? "Dispatch", reason: `Dispatch overdue ${od} days`, daysOverdue: od, href: `/dispatch/${d.id}` });
    }
  }

  for (const i of (instRes.data ?? []) as Array<{ id: string; installation_no: string; status: string; planned_end_date: string | null; actual_end_date: string | null }>) {
    if (i.status === "completed" || i.actual_end_date) continue;
    if (i.planned_end_date && new Date(i.planned_end_date).getTime() < now()) {
      const od = days(i.planned_end_date);
      add({ key: "installation_overdue", severity: od > 7 ? "high" : "medium", entity: "installation", entityId: i.id, label: i.installation_no ?? "Install", reason: `Installation overdue ${od} days`, daysOverdue: od, href: `/installations/${i.id}` });
    }
  }

  for (const p of (poRes.data ?? []) as Array<{ id: string; po_no: string; status: string; expected_delivery_date: string | null }>) {
    if (["received", "closed", "cancelled"].includes(String(p.status))) continue;
    if (p.expected_delivery_date && new Date(p.expected_delivery_date).getTime() < now()) {
      const od = days(p.expected_delivery_date);
      add({ key: "vendor_delay", severity: od > 14 ? "high" : "medium", entity: "po", entityId: p.id, label: p.po_no, reason: `Vendor delivery late ${od} days`, daysOverdue: od, href: `/purchase-orders/${p.id}` });
    }
  }

  for (const r of (rfqRes.data ?? []) as Array<{ id: string; rfq_no: string; status: string; due_date: string | null }>) {
    if (["closed", "awarded", "cancelled"].includes(String(r.status))) continue;
    if (r.due_date && new Date(r.due_date).getTime() < now()) {
      const od = days(r.due_date);
      add({ key: "vendor_delay", severity: "medium", entity: "rfq", entityId: r.id, label: r.rfq_no, reason: `RFQ past due ${od} days`, daysOverdue: od, href: `/rfqs/${r.id}` });
    }
  }

  items.sort((a, b) => (a.severity === b.severity ? b.daysOverdue - a.daysOverdue : (a.severity === "high" ? -1 : b.severity === "high" ? 1 : a.severity === "medium" ? -1 : 1)));
  return { items, counts };
}
