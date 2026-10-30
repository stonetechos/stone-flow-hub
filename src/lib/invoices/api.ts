/** Invoices data access. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import {
  invoiceUpdateSchema,
  recordPaymentSchema,
  setInvoiceStatusSchema,
  type InvoiceUpdateInput,
  type RecordPaymentInput,
  type SetInvoiceStatusInput,
} from "./schema";

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
  let q = getDb()
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false })
    .limit(100);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`invoice_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as InvoiceListItem[];
}

export async function listInvoicesForProject(projectId: string): Promise<InvoiceListItem[]> {
  const { data, error } = await getDb()
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as InvoiceListItem[];
}

export async function getInvoice(id: string): Promise<InvoiceListItem | null> {
  const { data, error } = await getDb()
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as InvoiceListItem | null) ?? null;
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItemRow[]> {
  const { data, error } = await getDb()
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));

  const { data: inv } = await getDb()
    .from("invoices")
    .select("workflow_state, quote_id")
    .eq("id", invoiceId)
    .maybeSingle();
  const wf = (inv?.workflow_state as Record<string, unknown> | null) ?? {};
  const notesMap = { ...((wf.line_item_notes as Record<string, string> | null) ?? {}) };

  if (inv?.quote_id) {
    const { data: q } = await getDb()
      .from("quotes")
      .select("workflow_state")
      .eq("id", inv.quote_id)
      .maybeSingle();
    const qWf = (q?.workflow_state as Record<string, unknown> | null) ?? {};
    const qNotes = (qWf.line_item_notes as Record<string, string> | null) ?? {};
    Object.entries(qNotes).forEach(([k, v]) => {
      if (!notesMap[k]) notesMap[k] = v;
    });
  }

  return (data ?? []).map((it, idx) => ({
    ...it,
    notes:
      (it as { notes?: string | null }).notes ||
      notesMap[it.id] ||
      notesMap[String(idx)] ||
      notesMap[it.description?.trim().toLowerCase()] ||
      null,
  }));
}

export async function getInvoicePayments(invoiceId: string): Promise<PaymentRow[]> {
  const { data, error } = await getDb()
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function getInvoicePaymentLinks(invoiceId: string): Promise<PaymentLinkRow[]> {
  const { data, error } = await getDb()
    .from("payment_links")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function setInvoiceStatus(input: SetInvoiceStatusInput): Promise<InvoiceRow> {
  const parsed = setInvoiceStatusSchema.parse(input);
  const statusToSave = parsed.status === "issued" ? "sent" : parsed.status;
  const { data, error } = await getDb()
    .from("invoices")
    .update({ status: statusToSave })
    .eq("id", parsed.invoice_id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (statusToSave === "cancelled" && data?.quote_id) {
    const { data: remaining } = await getDb()
      .from("invoices")
      .select("id")
      .eq("quote_id", data.quote_id)
      .neq("status", "cancelled");

    if (!remaining || remaining.length === 0) {
      await getDb().from("quotes").update({ status: "accepted" }).eq("id", data.quote_id);
    }
  }

  return data;
}

export async function recordManualPayment(input: RecordPaymentInput): Promise<PaymentRow> {
  const parsed = recordPaymentSchema.parse(input);
  const { data, error } = await getDb()
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

  if (data) {
    try {
      const { notifyAdminPaymentReceived } = await import("@/lib/notifications/broadcast");
      notifyAdminPaymentReceived({
        amount: data.amount,
        method: data.method,
        reference_no: data.reference_no,
      });
    } catch (e) {
      console.warn("[invoices] admin payment notification skipped", e);
    }
  }

  return data;
}

export async function updateInvoice(id: string, input: InvoiceUpdateInput): Promise<InvoiceRow> {
  const parsed = invoiceUpdateSchema.parse(input);
  const patch: Record<string, unknown> = {
    due_date: parsed.due_date ?? null,
    notes: parsed.notes ?? null,
    terms: parsed.terms ?? null,
  };
  if (parsed.issue_date !== undefined) {
    patch.issue_date = parsed.issue_date || null;
  }
  const { data, error } = await getDb()
    .from("invoices")
    .update(patch as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export type DeleteOrVoidResult = {
  action: "deleted" | "voided";
  invoice_id: string;
  invoice_no: string;
  message: string;
};

export async function deleteInvoice(id: string): Promise<DeleteOrVoidResult> {
  const { data, error } = await getDb().rpc(
    "delete_or_void_invoice" as never,
    {
      p_invoice_id: id,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as DeleteOrVoidResult;
}

export async function reuseVoidInvoice(input: {
  invoiceId: string;
  quoteId: string;
  issueDate?: string;
  dueDate?: string;
}): Promise<InvoiceRow> {
  const { data, error } = await getDb().rpc(
    "reuse_void_invoice" as never,
    {
      p_invoice_id: input.invoiceId,
      p_quote_id: input.quoteId,
      p_issue_date: input.issueDate ?? undefined,
      p_due_date: input.dueDate ?? undefined,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as InvoiceRow;
}

export async function getVoidInvoiceDateWindow(invoiceId: string): Promise<{
  invoice_no: string;
  prev_invoice_no: string | null;
  prev_date: string | null;
  next_invoice_no: string | null;
  next_date: string | null;
  suggested_min_date: string | null;
  suggested_max_date: string | null;
}> {
  const { data, error } = await getDb().rpc(
    "get_void_invoice_date_window" as never,
    {
      p_invoice_id: invoiceId,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as {
    invoice_no: string;
    prev_invoice_no: string | null;
    prev_date: string | null;
    next_invoice_no: string | null;
    next_date: string | null;
    suggested_min_date: string | null;
    suggested_max_date: string | null;
  };
}

export async function getNextInvoiceNo(date?: string): Promise<string> {
  const { data, error } = await getDb().rpc(
    "get_next_invoice_no" as never,
    {
      p_date: date ?? undefined,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as string;
}

export async function listVoidInvoices(): Promise<InvoiceListItem[]> {
  const { data, error } = await getDb()
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .in("status", ["void", "cancelled"])
    .order("invoice_no", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as InvoiceListItem[];
}

/* ------------------------------------------------------------------ */
/* Invoice Line Items                                                 */
/* ------------------------------------------------------------------ */

export type InvoiceItemPatch = {
  description?: string;
  notes?: string | null;
  quantity?: number;
  unit?: string | null;
  unit_price?: number;
  tax_pct?: number;
  hsn_sac?: string | null;
  sort_order?: number;
};

export async function addInvoiceItem(
  invoiceId: string,
  patch: InvoiceItemPatch & { description: string; quantity: number; unit_price: number },
): Promise<InvoiceItemRow> {
  const { data: existing, error: exErr } = await getDb()
    .from("invoice_items")
    .select("sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (exErr) throw new AppError(mapDbError(exErr));
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await getDb()
    .from("invoice_items")
    .insert({
      invoice_id: invoiceId,
      description: patch.description,
      quantity: patch.quantity,
      unit: patch.unit ?? null,
      unit_price: patch.unit_price,
      tax_pct: patch.tax_pct ?? 0,
      hsn_sac: patch.hsn_sac ?? null,
      sort_order: patch.sort_order ?? nextSort,
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (patch.notes && patch.notes.trim()) {
    await updateInvoiceItemNote(invoiceId, data.id, patch.notes.trim());
  }
  return { ...data, notes: patch.notes ?? null };
}

export async function updateInvoiceItem(
  itemId: string,
  patch: InvoiceItemPatch,
): Promise<InvoiceItemRow> {
  if (patch.notes !== undefined) {
    const { data: item } = await getDb()
      .from("invoice_items")
      .select("invoice_id")
      .eq("id", itemId)
      .maybeSingle();
    if (item?.invoice_id) {
      await updateInvoiceItemNote(item.invoice_id, itemId, patch.notes);
    }
  }

  const { notes, ...dbPatch } = patch;
  if (Object.keys(dbPatch).length > 0) {
    const { data, error } = await getDb()
      .from("invoice_items")
      .update(dbPatch as never)
      .eq("id", itemId)
      .select("*")
      .single();
    if (error) throw new AppError(mapDbError(error));
    return { ...data, notes: patch.notes ?? null };
  }

  const { data, error } = await getDb().from("invoice_items").select("*").eq("id", itemId).single();
  if (error) throw new AppError(mapDbError(error));
  return { ...data, notes: patch.notes ?? null };
}

export async function updateInvoiceItemNote(
  invoiceId: string,
  itemId: string,
  notes: string | null,
): Promise<void> {
  const { data: inv, error: fetchErr } = await getDb()
    .from("invoices")
    .select("id, workflow_state")
    .eq("id", invoiceId)
    .single();
  if (fetchErr || !inv) return;

  const wf = (inv.workflow_state as Record<string, unknown> | null) ?? {};
  const currentNotes = { ...((wf.line_item_notes as Record<string, string> | null) ?? {}) };

  if (notes && notes.trim()) {
    currentNotes[itemId] = notes.trim();
  } else {
    delete currentNotes[itemId];
  }

  const updatedWf = { ...wf, line_item_notes: currentNotes };
  const { error } = await getDb()
    .from("invoices")
    .update({ workflow_state: updatedWf } as never)
    .eq("id", invoiceId);
  if (error) throw new AppError(mapDbError(error));
}

export async function deleteInvoiceItem(itemId: string): Promise<void> {
  const { error } = await getDb().from("invoice_items").delete().eq("id", itemId);
  if (error) throw new AppError(mapDbError(error));
}
