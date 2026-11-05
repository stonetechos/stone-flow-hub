/** Invoices data access. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import {
  invoiceCreateSchema,
  invoiceUpdateSchema,
  recordPaymentSchema,
  setInvoiceStatusSchema,
  type InvoiceCreateInput,
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

export type InvoicePaymentRecord = {
  id: string;
  source: "receipt" | "payment";
  payment_no: string;
  paid_at: string;
  method: string;
  reference_no: string | null;
  amount: number;
  receipt_id?: string;
};

export async function recalcInvoiceBalances(invoiceId: string): Promise<InvoiceRow | null> {
  const { data: inv } = await getDb()
    .from("invoices")
    .select("id, status, total")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return null;

  // 1. Calculate items subtotal and tax
  const { data: items } = await getDb()
    .from("invoice_items")
    .select("quantity, unit_price, tax_pct")
    .eq("invoice_id", invoiceId);

  let subtotal = 0;
  let taxAmount = 0;
  (items ?? []).forEach((it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    const lineSub = q * p;
    subtotal += lineSub;
    taxAmount += lineSub * ((Number(it.tax_pct) || 0) / 100);
  });
  subtotal = Math.round(subtotal * 100) / 100;
  taxAmount = Math.round(taxAmount * 100) / 100;
  const calculatedTotal = subtotal + taxAmount;
  const total = calculatedTotal > 0 ? calculatedTotal : Number(inv.total || 0);

  // 2. Sum legacy payments
  const { data: pymts } = await getDb()
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);
  const paymentsSum = (pymts ?? []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // 3. Sum active receipt allocations
  const { data: allocs } = await getDb()
    .from("receipt_allocations")
    .select("amount, receipt:receipts(status)")
    .eq("invoice_id", invoiceId);

  const receiptsSum = (allocs ?? [])
    .filter((a) => {
      const r = (a as unknown as { receipt?: { status?: string } | null })?.receipt;
      return !r?.status || r.status === "active";
    })
    .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

  const totalPaid = Math.round((paymentsSum + receiptsSum) * 100) / 100;
  const balanceDue = Math.max(0, Math.round((total - totalPaid) * 100) / 100);

  // 4. Update status if appropriate
  let nextStatus = inv.status;
  if (nextStatus !== "cancelled" && nextStatus !== "void") {
    if (totalPaid >= total && total > 0) {
      nextStatus = "paid";
    } else if (totalPaid > 0) {
      nextStatus = "partially_paid";
    } else if (nextStatus === "paid" || nextStatus === "partially_paid") {
      nextStatus = "sent";
    }
  }

  const { data: updated, error } = await getDb()
    .from("invoices")
    .update({
      subtotal,
      tax_amount: taxAmount,
      total,
      amount_paid: totalPaid,
      balance_due: balanceDue,
      status: nextStatus,
    } as never)
    .eq("id", invoiceId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("[recalcInvoiceBalances] Failed to update invoice:", error);
    return null;
  }
  return updated;
}

export async function getInvoice(id: string): Promise<InvoiceListItem | null> {
  const { data, error } = await getDb()
    .from("invoices")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  if (!data) return null;

  try {
    const synced = await recalcInvoiceBalances(id);
    if (synced) {
      return {
        ...data,
        subtotal: synced.subtotal,
        tax_amount: synced.tax_amount,
        total: synced.total,
        amount_paid: synced.amount_paid,
        balance_due: synced.balance_due,
        status: synced.status,
      } as InvoiceListItem;
    }
  } catch (syncErr) {
    console.warn("[getInvoice] auto-sync error:", syncErr);
  }

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

export async function getInvoicePayments(invoiceId: string): Promise<InvoicePaymentRecord[]> {
  const [paymentsRes, allocsRes] = await Promise.all([
    getDb()
      .from("payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("paid_at", { ascending: false }),
    getDb()
      .from("receipt_allocations")
      .select(
        "id, amount, created_at, receipt:receipts(id, receipt_no, received_at, method, reference_no, status)",
      )
      .eq("invoice_id", invoiceId),
  ]);

  const list: InvoicePaymentRecord[] = [];

  (paymentsRes.data ?? []).forEach((p) => {
    list.push({
      id: p.id,
      source: "payment",
      payment_no: p.payment_no || "Payment",
      paid_at: p.paid_at,
      method: p.method,
      reference_no:
        p.reference_no ??
        (p as { razorpay_payment_id?: string | null }).razorpay_payment_id ??
        null,
      amount: Number(p.amount) || 0,
    });
  });

  (allocsRes.data ?? []).forEach((ra) => {
    const rcpt = (
      ra as unknown as {
        receipt?: {
          id: string;
          receipt_no: string;
          received_at: string;
          method: string;
          reference_no: string | null;
          status: string;
        } | null;
      }
    )?.receipt;

    if (!rcpt?.status || rcpt.status === "active") {
      list.push({
        id: ra.id,
        source: "receipt",
        payment_no: rcpt?.receipt_no || "Receipt",
        paid_at: rcpt?.received_at || ra.created_at,
        method: rcpt?.method || "bank_transfer",
        reference_no: rcpt?.reference_no || null,
        amount: Number(ra.amount) || 0,
        receipt_id: rcpt?.id,
      });
    }
  });

  list.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  return list;
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
  // 1. Fetch invoice info
  const { data: inv, error: fErr } = await getDb()
    .from("invoices")
    .select("id, invoice_no, quote_id")
    .eq("id", id)
    .maybeSingle();

  if (fErr) throw new AppError(mapDbError(fErr));
  if (!inv) throw new AppError("Invoice not found", "NOT_FOUND", 404);

  const invoiceNo = inv.invoice_no;

  // 2. Try the delete_or_void_invoice RPC if available
  try {
    const { data, error } = await getDb().rpc(
      "delete_or_void_invoice" as never,
      {
        p_invoice_id: id,
      } as never,
    );
    if (!error && data) {
      return data as unknown as DeleteOrVoidResult;
    }
  } catch (rpcErr) {
    console.warn("[deleteInvoice] RPC failed, falling back to direct safe deletion:", rpcErr);
  }

  // 3. Fallback: Direct safe deletion
  // A. Collect affected receipt IDs so we can recalculate their allocated amounts
  const { data: allocs } = await getDb()
    .from("receipt_allocations")
    .select("receipt_id")
    .eq("invoice_id", id);
  const affectedReceiptIds = [...new Set((allocs ?? []).map((a) => a.receipt_id).filter(Boolean))];

  // B. Clean up child relations
  await getDb().from("receipt_allocations").delete().eq("invoice_id", id);
  await getDb().from("payment_links").delete().eq("invoice_id", id);
  await getDb().from("payments").delete().eq("invoice_id", id);
  await getDb()
    .from("credit_notes")
    .update({ invoice_id: null } as never)
    .eq("invoice_id", id);
  await getDb().from("invoice_items").delete().eq("invoice_id", id);

  // C. Delete invoice
  const { error: delErr } = await getDb().from("invoices").delete().eq("id", id);
  if (delErr) throw new AppError(mapDbError(delErr));

  // D. Revert quote to 'accepted' if no other active invoice exists
  if (inv.quote_id) {
    try {
      const { data: remaining } = await getDb()
        .from("invoices")
        .select("id")
        .eq("quote_id", inv.quote_id)
        .neq("status", "cancelled");

      if (!remaining || remaining.length === 0) {
        await getDb().from("quotes").update({ status: "accepted" }).eq("id", inv.quote_id);
      }
    } catch (qErr) {
      console.warn("[deleteInvoice] Failed to revert quote status:", qErr);
    }
  }

  // E. Sync affected receipts so allocated and unallocated amounts update immediately
  for (const rId of affectedReceiptIds) {
    try {
      const { data: rAllocs } = await getDb()
        .from("receipt_allocations")
        .select("amount")
        .eq("receipt_id", rId);
      const sumAlloc = (rAllocs ?? []).reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
      await getDb()
        .from("receipts")
        .update({ allocated_amount: sumAlloc } as never)
        .eq("id", rId);
    } catch (rErr) {
      console.warn("[deleteInvoice] Failed to sync receipt totals:", rErr);
    }
  }

  return {
    action: "deleted",
    invoice_id: id,
    invoice_no: invoiceNo,
    message: `Invoice ${invoiceNo} deleted successfully.`,
  };
}

export async function createInvoice(input: InvoiceCreateInput): Promise<InvoiceRow> {
  const parsed = invoiceCreateSchema.parse(input);

  let projectId: string;
  let customerId: string;

  if (parsed.project_id) {
    const { getProject } = await import("@/lib/projects/api");
    const project = await getProject(parsed.project_id);
    if (!project) throw new AppError("Selected project not found", "NOT_FOUND", 404);
    projectId = project.id;
    customerId = project.customer_id;
  } else {
    const { getCustomer } = await import("@/lib/customers/api");
    const customer = await getCustomer(parsed.customer_id!);
    if (!customer) throw new AppError("Selected customer not found", "NOT_FOUND", 404);

    const { data: existingProjects } = await getDb()
      .from("projects")
      .select("id")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingProjects && existingProjects.length > 0 && existingProjects[0]?.id) {
      projectId = existingProjects[0].id;
    } else {
      const { createProject } = await import("@/lib/projects/api");
      const project = await createProject({
        customer_id: customer.id,
        name: customer.name?.trim() || "General Project",
        city: customer.city?.trim() || "Not specified",
        project_type: "other",
      });
      projectId = project.id;
    }
    customerId = customer.id;
  }

  const wfObj: Record<string, unknown> = {};
  if (parsed.dispatch_remarks) wfObj.dispatch_remarks = parsed.dispatch_remarks;
  if (parsed.lr_no) wfObj.lr_no = parsed.lr_no;

  let invoice: InvoiceRow;

  if (parsed.reuse_invoice_id) {
    const { data: vInv, error: vErr } = await getDb()
      .from("invoices")
      .select("*")
      .eq("id", parsed.reuse_invoice_id)
      .maybeSingle();

    if (vErr || !vInv) throw new AppError("Void invoice not found", "NOT_FOUND", 404);
    if (vInv.status !== "void" && vInv.status !== "cancelled") {
      throw new AppError(
        `Only void or cancelled invoices can be reused (current status: ${vInv.status})`,
        "BAD_REQUEST",
        400,
      );
    }

    const { error: delErr } = await getDb()
      .from("invoice_items")
      .delete()
      .eq("invoice_id", vInv.id);
    if (delErr) throw new AppError(mapDbError(delErr));

    const curWf = (vInv.workflow_state as Record<string, unknown> | null) ?? {};
    const { data: updatedInv, error: upErr } = await getDb()
      .from("invoices")
      .update({
        customer_id: customerId,
        project_id: projectId,
        quote_id: parsed.quote_id ?? null,
        status: "draft",
        issue_date: parsed.issue_date || new Date().toISOString().slice(0, 10),
        due_date: parsed.due_date || null,
        notes: parsed.notes || null,
        terms: parsed.terms || null,
        workflow_state: {
          ...curWf,
          ...wfObj,
        },
      } as never)
      .eq("id", vInv.id)
      .select("*")
      .single();

    if (upErr) throw new AppError(mapDbError(upErr));
    invoice = updatedInv;
  } else {
    const { data: newInv, error: insErr } = await getDb()
      .from("invoices")
      .insert({
        invoice_no: "",
        customer_id: customerId,
        project_id: projectId,
        quote_id: parsed.quote_id ?? null,
        status: "draft",
        issue_date: parsed.issue_date || new Date().toISOString().slice(0, 10),
        due_date: parsed.due_date || null,
        notes: parsed.notes || null,
        terms: parsed.terms || null,
        workflow_state: wfObj,
      } as never)
      .select("*")
      .single();

    if (insErr) throw new AppError(mapDbError(insErr));
    invoice = newInv;
  }

  const rows = parsed.items.map((it, idx) => ({
    invoice_id: invoice.id,
    product_id: it.product_id ?? null,
    description: it.description,
    quantity: Math.round(Number(it.quantity) * 1000) / 1000,
    unit: it.unit ?? null,
    unit_price: it.unit_price,
    tax_pct: it.tax_pct ?? 0,
    hsn_sac: it.hsn_sac ?? null,
    sort_order: it.sort_order ?? idx,
  }));

  const { data: insertedItems, error: itemsErr } = await getDb()
    .from("invoice_items")
    .insert(rows as never)
    .select("id, sort_order");
  if (itemsErr) throw new AppError(mapDbError(itemsErr));

  const notesMap: Record<string, string> = {};
  parsed.items.forEach((it, idx) => {
    if (it.notes && it.notes.trim()) {
      const ins = insertedItems?.[idx];
      if (ins?.id) notesMap[ins.id] = it.notes.trim();
      notesMap[String(idx)] = it.notes.trim();
    }
  });

  if (Object.keys(notesMap).length > 0) {
    const curWf = (invoice.workflow_state as Record<string, unknown> | null) ?? {};
    const existingNotes = (curWf.line_item_notes as Record<string, string> | null) ?? {};
    await getDb()
      .from("invoices")
      .update({
        workflow_state: {
          ...curWf,
          line_item_notes: { ...existingNotes, ...notesMap },
        },
      } as never)
      .eq("id", invoice.id);
  }

  try {
    const { data: reloaded } = await getDb()
      .from("invoices")
      .select("*")
      .eq("id", invoice.id)
      .single();
    return reloaded ?? invoice;
  } catch {
    return invoice;
  }
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
