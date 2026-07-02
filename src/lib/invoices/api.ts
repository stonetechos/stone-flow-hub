/** Invoices data access. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import { invoiceUpdateSchema, recordPaymentSchema, setInvoiceStatusSchema, type InvoiceUpdateInput, type RecordPaymentInput, type SetInvoiceStatusInput } from "./schema";

export type InvoiceRow = DbTable<"invoices">;
export type InvoiceItemRow = DbTable<"invoice_items">;
export type PaymentRow = DbTable<"payments">;
export type PaymentLinkRow = DbTable<"payment_links">;

export type InvoiceListItem = InvoiceRow & {
  customer: { id: string; name: string; customer_code: string } | null;
  project: { id: string; name: string; project_code: string } | null;
};

const SELECT_WITH_JOINS =
  "*, customer:customers!invoices_customer_id_fkey(id,name,customer_code), project:projects!invoices_project_id_fkey(id,name,project_code)";

export async function listInvoices(query = ""): Promise<InvoiceListItem[]> {
  let q = supabase
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`invoice_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as InvoiceListItem[];
}

export async function listInvoicesForProject(projectId: string): Promise<InvoiceListItem[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as InvoiceListItem[];
}

export async function getInvoice(id: string): Promise<InvoiceListItem | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as InvoiceListItem | null) ?? null;
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItemRow[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getInvoicePayments(invoiceId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getInvoicePaymentLinks(invoiceId: string): Promise<PaymentLinkRow[]> {
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function setInvoiceStatus(input: SetInvoiceStatusInput): Promise<InvoiceRow> {
  const parsed = setInvoiceStatusSchema.parse(input);
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: parsed.status })
    .eq("id", parsed.invoice_id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function recordManualPayment(input: RecordPaymentInput): Promise<PaymentRow> {
  const parsed = recordPaymentSchema.parse(input);
  const { data, error } = await supabase
    .from("payments")
    .insert({
      payment_no: "",
      invoice_id: parsed.invoice_id,
      amount: parsed.amount,
      method: parsed.method,
      paid_at: parsed.paid_at ?? new Date().toISOString(),
      reference_no: parsed.reference_no ?? null,
      notes: parsed.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateInvoice(id: string, input: InvoiceUpdateInput): Promise<InvoiceRow> {
  const parsed = invoiceUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("invoices")
    .update({
      due_date: parsed.due_date ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
