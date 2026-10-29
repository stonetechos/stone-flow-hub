/** Quotes data access — includes creation-with-items and convert-to-invoice. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import { getProject, createProject } from "@/lib/projects/api";
import { getCustomer } from "@/lib/customers/api";
import {
  convertQuoteSchema,
  quoteCreateSchema,
  quoteUpdateSchema,
  type ConvertQuoteInput,
  type QuoteCreateInput,
  type QuoteUpdateInput,
} from "./schema";

export type QuoteRow = DbTable<"quotes">;
export type QuoteItemRow = DbTable<"quote_items">;
export type QuoteListItem = QuoteRow & {
  customer: {
    id: string;
    name: string;
    customer_code: string;
    workflow_state?: unknown;
    external_ref?: unknown;
  } | null;
  project: { id: string; name: string; project_code: string } | null;
  invoices?: Array<{
    id: string;
    invoice_no: string;
    status: string;
    total: number;
  }> | null;
};

const SELECT_WITH_JOINS =
  "*, customer:customers!quotes_customer_id_fkey(id,name,customer_code,workflow_state,external_ref), project:projects!quotes_project_id_fkey(id,name,project_code), invoices:invoices!invoices_quote_id_fkey(id,invoice_no,status,total)";

function reconcileQuoteItem(quote: QuoteListItem): QuoteListItem {
  if (quote.status === "converted") {
    const hasActiveInvoice =
      Array.isArray(quote.invoices) &&
      quote.invoices.some((inv) => inv && inv.status !== "cancelled");
    if (!hasActiveInvoice) {
      // Background heal the database record so orphaned quotes can be re-invoiced
      void getDb()
        .from("quotes")
        .update({ status: "accepted" })
        .eq("id", quote.id)
        .then(
          () => {},
          (err) => console.warn("[quotes] auto-heal quote status failed", err),
        );

      return {
        ...quote,
        status: "accepted",
      };
    }
  }
  return quote;
}

export async function listQuotes(query = ""): Promise<QuoteListItem[]> {
  let q = getDb()
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .order("created_at", { ascending: false })
    .limit(200);
  const s = sanitizeSearch(query);
  if (s) q = q.or(`quote_no.ilike.%${s}%,notes.ilike.%${s}%`);
  const { data, error } = await q;
  if (error) throw new AppError(mapDbError(error));
  return ((data ?? []) as QuoteListItem[]).map(reconcileQuoteItem);
}

export async function listQuotesForProject(projectId: string): Promise<QuoteListItem[]> {
  const { data, error } = await getDb()
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return ((data ?? []) as QuoteListItem[]).map(reconcileQuoteItem);
}

export async function getQuote(id: string): Promise<QuoteListItem | null> {
  const { data, error } = await getDb()
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data ? reconcileQuoteItem(data as QuoteListItem) : null;
}

export async function getQuoteItems(quoteId: string): Promise<QuoteItemRow[]> {
  const { data, error } = await getDb()
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));

  const { data: q } = await getDb()
    .from("quotes")
    .select("workflow_state")
    .eq("id", quoteId)
    .maybeSingle();
  const wf = (q?.workflow_state as Record<string, unknown> | null) ?? {};
  const notesMap = (wf.line_item_notes as Record<string, string> | null) ?? {};

  return (data ?? []).map((it, idx) => {
    const serverNote = (it as { notes?: string | null }).notes;
    const wfNote =
      notesMap[it.id] ??
      notesMap[String(idx)] ??
      notesMap[it.description?.trim().toLowerCase()] ??
      null;
    return {
      ...it,
      notes: serverNote || wfNote || null,
    };
  });
}

export function pruneOversizedDataUrls<T>(obj: T, maxChars = 200_000): T {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => pruneOversizedDataUrls(item, maxChars)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === "string" && value.startsWith("data:") && value.length > maxChars) {
      console.warn(
        `[quotes/api] Truncating oversized base64 data URL on key "${key}" (${value.length} chars)`,
      );
      result[key] = undefined;
    } else if (typeof value === "object" && value !== null) {
      result[key] = pruneOversizedDataUrls(value, maxChars);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export async function getNextQuoteNumber(): Promise<string> {
  try {
    const [{ data: byNo }, { data: byDate }] = await Promise.all([
      getDb().from("quotes").select("quote_no").order("quote_no", { ascending: false }).limit(50),
      getDb().from("quotes").select("quote_no").order("created_at", { ascending: false }).limit(50),
    ]);

    let maxNum = 0;
    const rows = [...(byNo ?? []), ...(byDate ?? [])];
    for (const row of rows) {
      const match = /QUO-(\d+)/i.exec(row.quote_no || "");
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `QUO-${String(maxNum + 1).padStart(6, "0")}`;
  } catch (e) {
    console.warn("[getNextQuoteNumber] Failed to query existing quotes, using fallback code:", e);
    return `QUO-${String(Date.now()).slice(-6)}`;
  }
}

export async function createQuote(input: QuoteCreateInput): Promise<QuoteRow> {
  const parsed = quoteCreateSchema.parse(input);

  let projectId: string;
  let customerId: string;
  if (parsed.project_id) {
    const project = await getProject(parsed.project_id);
    if (!project) throw new AppError("Selected project not found", "NOT_FOUND", 404);
    projectId = project.id;
    customerId = project.customer_id;
  } else {
    // Customer-first flow: reuse customer's existing project if one exists,
    // otherwise auto-create a lightweight project behind the scenes so
    // quotes.project_id (still NOT NULL) and downstream SO/Invoice chains work.
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
  const lineItemImages: Record<string, string> = {};
  if (parsed.wall_estimate && typeof parsed.wall_estimate === "object") {
    const we = parsed.wall_estimate as {
      products?: Array<{ productName?: string; imageDataUrl?: string }>;
    };
    if (Array.isArray(we.products)) {
      for (const p of we.products) {
        if (p.productName && p.imageDataUrl) {
          lineItemImages[p.productName.trim().toLowerCase()] = p.imageDataUrl;
        }
      }
    }
  }
  for (const it of parsed.items) {
    if (it.image_url) {
      lineItemImages[it.description.trim().toLowerCase()] = it.image_url;
    }
  }

  const lineItemNotes: Record<string, string> = {};
  parsed.items.forEach((it, idx) => {
    if (it.notes && it.notes.trim()) {
      lineItemNotes[it.description.trim().toLowerCase()] = it.notes.trim();
      lineItemNotes[String(idx)] = it.notes.trim();
    }
  });

  const rawWorkflowState = {
    sale_mode: parsed.sale_mode ?? "invoiced",
    ...(parsed.hybrid_cash_amount !== undefined
      ? { hybrid_cash_amount: parsed.hybrid_cash_amount }
      : {}),
    ...(parsed.hybrid_invoiced_amount !== undefined
      ? { hybrid_invoiced_amount: parsed.hybrid_invoiced_amount }
      : {}),
    ...(Object.keys(lineItemImages).length > 0 ? { line_item_images: lineItemImages } : {}),
    ...(Object.keys(lineItemNotes).length > 0 ? { line_item_notes: lineItemNotes } : {}),
  };

  const safeQuoteNo = await getNextQuoteNumber();
  const quotePayload = {
    quote_no: safeQuoteNo,
    project_id: projectId,
    customer_id: customerId,
    enquiry_id: parsed.enquiry_id ?? null,
    valid_until: parsed.valid_until ?? null,
    notes: parsed.notes ?? null,
    terms: parsed.terms ?? null,
    wall_estimate: pruneOversizedDataUrls(parsed.wall_estimate ?? null),
    workflow_state: pruneOversizedDataUrls(rawWorkflowState),
    ...(parsed.category ? { category: parsed.category } : {}),
  };

  let { data: quote, error } = await getDb()
    .from("quotes")
    .insert(quotePayload as never)
    .select("*")
    .single();

  // Collision or timeout recovery: if DB sequence hits an existing quote_no or times out on lock
  if (error) {
    const isRetryable =
      error.code === "23505" ||
      error.code === "57014" ||
      /unique|duplicate|timeout|deadlock/i.test(error.message || "") ||
      /quotes_quote_no_key/i.test(error.details || error.message || "");

    if (isRetryable) {
      console.warn(
        `[createQuote] quote insert failed (${error.code || error.message}). Auto-resolving next unique quote_no...`,
      );
      await new Promise((r) => setTimeout(r, 100));
      const retryQuoteNo = await getNextQuoteNumber();
      const match = /QUO-(\d+)/i.exec(retryQuoteNo);
      const prevMatch = /QUO-(\d+)/i.exec(safeQuoteNo);
      const nextNum = Math.max(
        match ? parseInt(match[1], 10) : 1,
        (prevMatch ? parseInt(prevMatch[1], 10) : 0) + 1,
      );
      const finalSafeQuoteNo = `QUO-${String(nextNum).padStart(6, "0")}`;

      const retry = await getDb()
        .from("quotes")
        .insert({ ...quotePayload, quote_no: finalSafeQuoteNo } as never)
        .select("*")
        .single();
      quote = retry.data;
      error = retry.error;
    }
  }

  if (error || !quote) throw new AppError(mapDbError(error));

  const isCashSale = parsed.sale_mode === "cash";
  const rows = parsed.items.map((it, idx) => ({
    quote_id: quote.id,
    product_id: it.product_id ?? null,
    description: it.description,
    quantity: Math.round(Number(it.quantity) * 1000) / 1000,
    unit: it.unit ?? null,
    unit_price: it.unit_price,
    tax_pct: isCashSale ? 0 : it.tax_pct,
    hsn_sac: it.hsn_sac ?? null,
    sort_order: idx,
    ...(it.fulfilment ? { fulfilment: it.fulfilment } : {}),
  }));
  const { data: insertedRows, error: itemErr } = await getDb()
    .from("quote_items")
    .insert(rows as never)
    .select("id, description, sort_order");
  if (itemErr) throw new AppError(mapDbError(itemErr));

  if (insertedRows && insertedRows.length > 0) {
    let hasNotes = false;
    insertedRows.forEach((ins, idx) => {
      const itNote = parsed.items[idx]?.notes;
      if (itNote && itNote.trim()) {
        lineItemNotes[ins.id] = itNote.trim();
        hasNotes = true;
      }
    });
    if (hasNotes) {
      try {
        await getDb()
          .from("quotes")
          .update({
            workflow_state: pruneOversizedDataUrls({
              ...rawWorkflowState,
              line_item_notes: lineItemNotes,
            }),
          } as never)
          .eq("id", quote.id);
      } catch (err) {
        console.warn(
          "[createQuote] Non-fatal error updating line_item_notes in workflow_state:",
          err,
        );
      }
    }
  }

  // Reload to reflect totals
  try {
    const { data: reloaded } = await getDb().from("quotes").select("*").eq("id", quote.id).single();
    return reloaded ?? quote;
  } catch {
    return quote;
  }
}

export async function setQuoteStatus(
  id: string,
  status: DbTable<"quotes">["status"],
): Promise<QuoteRow> {
  const { data, error } = await getDb()
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .select("*, customer:customers!quotes_customer_id_fkey(name)")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (status === "accepted" && data) {
    try {
      const { broadcastQuoteApproved } = await import("@/lib/notifications/broadcast");
      const customerName =
        (data as unknown as { customer?: { name?: string } | null })?.customer?.name ?? null;
      broadcastQuoteApproved({
        id: data.id,
        quote_no: data.quote_no,
        total_amount: Number(data.total ?? 0),
        customer_name: customerName,
      });
    } catch (e) {
      console.warn("[quotes] approval broadcast skipped", e);
    }
  } else if (status === "sent" && data) {
    try {
      const { broadcastQuoteSent } = await import("@/lib/notifications/broadcast");
      const customerName =
        (data as unknown as { customer?: { name?: string } | null })?.customer?.name ?? null;
      broadcastQuoteSent({
        id: data.id,
        quote_no: data.quote_no,
        total_amount: Number(data.total ?? 0),
        customer_name: customerName,
      });
    } catch (e) {
      console.warn("[quotes] sent broadcast skipped", e);
    }
  }

  return data;
}

export async function convertQuoteToInvoice(input: ConvertQuoteInput) {
  const parsed = convertQuoteSchema.parse(input);
  const { data, error } = await getDb().rpc("convert_quote_to_invoice", {
    p_quote_id: parsed.quote_id,
    p_due_date: parsed.due_date ?? undefined,
  });
  if (error) throw new AppError(mapDbError(error));
  const invoice = data as DbTable<"invoices">;
  if (invoice?.id) {
    const invUpdate: Record<string, unknown> = {};
    if (parsed.issue_date) {
      invUpdate.issue_date = parsed.issue_date;
    }
    const { data: q } = await getDb()
      .from("quotes")
      .select("quote_no, workflow_state")
      .eq("id", parsed.quote_id)
      .maybeSingle();
    const qWf = (q?.workflow_state as Record<string, unknown> | null) ?? {};
    if (qWf.line_item_notes) {
      const { data: curInv } = await getDb()
        .from("invoices")
        .select("workflow_state")
        .eq("id", invoice.id)
        .maybeSingle();
      const invWf = (curInv?.workflow_state as Record<string, unknown> | null) ?? {};
      invUpdate.workflow_state = { ...invWf, line_item_notes: qWf.line_item_notes };
    }

    // Auto-link Delivery Challan number to invoice
    let linkedDispatchNo = parsed.dispatch_no;
    let linkedDispatchId = parsed.dispatch_id;

    if (!linkedDispatchNo) {
      const { data: lineageD } = await getDb()
        .from("document_lineage")
        .select("target_id, meta")
        .eq("source_type", "quote")
        .eq("source_id", parsed.quote_id)
        .eq("target_type", "dispatch")
        .order("converted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lineageD?.target_id) {
        linkedDispatchId = lineageD.target_id;
        const meta = lineageD.meta as Record<string, unknown> | null;
        if (typeof meta?.dispatch_no === "string") {
          linkedDispatchNo = meta.dispatch_no;
        }
      }
    }

    if (linkedDispatchId && !linkedDispatchNo) {
      const { data: dRow } = await getDb()
        .from("dispatches")
        .select("dispatch_no, dispatch_date")
        .eq("id", linkedDispatchId)
        .maybeSingle();
      if (dRow) {
        linkedDispatchNo = dRow.dispatch_no;
        if (dRow.dispatch_date && !invUpdate.dispatch_date) {
          invUpdate.dispatch_date = dRow.dispatch_date;
        }
      }
    }

    if (linkedDispatchNo) {
      invUpdate.dispatch_remarks = `Delivery Challan ${linkedDispatchNo}`;
      if (!invUpdate.lr_no) {
        invUpdate.lr_no = linkedDispatchNo;
      }
    }

    if (Object.keys(invUpdate).length > 0) {
      const { data: updated, error: updErr } = await getDb()
        .from("invoices")
        .update(invUpdate as never)
        .eq("id", invoice.id)
        .select("*")
        .single();
      if (!updErr && updated) {
        // Record lineage
        try {
          const { recordConversion } = await import("@/lib/lineage/api");
          if (linkedDispatchId) {
            void recordConversion({
              sourceType: "dispatch",
              sourceId: linkedDispatchId,
              targetType: "invoice",
              targetId: invoice.id,
              customerId: updated.customer_id,
              projectId: updated.project_id,
              meta: { dispatch_no: linkedDispatchNo, invoice_no: updated.invoice_no },
            });
          }
          void recordConversion({
            sourceType: "quote",
            sourceId: parsed.quote_id,
            targetType: "invoice",
            targetId: invoice.id,
            customerId: updated.customer_id,
            projectId: updated.project_id,
            meta: {
              quote_no: q?.quote_no,
              invoice_no: updated.invoice_no,
              dispatch_no: linkedDispatchNo,
            },
          });
        } catch (e) {
          console.warn("[lineage] failed to record conversion for invoice", e);
        }

        return updated as DbTable<"invoices">;
      }
    }
  }
  return invoice;
}

export async function updateQuote(id: string, input: QuoteUpdateInput): Promise<QuoteRow> {
  const parsed = quoteUpdateSchema.parse(input);

  // Fetch current quote to merge workflow_state
  const { data: current } = await getDb()
    .from("quotes")
    .select("workflow_state")
    .eq("id", id)
    .maybeSingle();
  const currentWf = (current?.workflow_state as Record<string, unknown> | null) ?? {};

  const nextWf = {
    ...currentWf,
    ...(parsed.sale_mode ? { sale_mode: parsed.sale_mode } : {}),
    ...(parsed.hybrid_cash_amount !== undefined
      ? { hybrid_cash_amount: parsed.hybrid_cash_amount }
      : {}),
    ...(parsed.hybrid_invoiced_amount !== undefined
      ? { hybrid_invoiced_amount: parsed.hybrid_invoiced_amount }
      : {}),
  };

  const { data, error } = await getDb()
    .from("quotes")
    .update({
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
      category: parsed.category ?? null,
      workflow_state: nextWf,
    } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (parsed.sale_mode === "cash") {
    // When switching to cash sale, remove GST % from all line items
    await getDb()
      .from("quote_items")
      .update({ tax_pct: 0 } as never)
      .eq("quote_id", id);
    // Reload quote to reflect new zero-tax totals
    const { data: reloaded } = await getDb().from("quotes").select("*").eq("id", id).single();
    if (reloaded) return reloaded;
  }

  return data;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await getDb().from("quotes").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}

/** 1-click conversion: create a Sales Order (with a full snapshot of line items and
 *  financial totals) from an existing Quote. Idempotent — the server-side RPC
 *  returns the existing SO if one already exists for this quote. */
export async function convertQuoteToSalesOrder(quoteId: string): Promise<DbTable<"sales_orders">> {
  const { data, error } = await getDb().rpc("convert_quote_to_sales_order", {
    p_quote_id: quoteId,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as DbTable<"sales_orders">;
}

/** Look up the sales order created from a given quote, if any. */
export async function getSalesOrderForQuote(
  quoteId: string,
): Promise<Pick<DbTable<"sales_orders">, "id" | "so_no"> | null> {
  const { data, error } = await getDb()
    .from("sales_orders")
    .select("id, so_no")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data ?? null;
}

/** Look up the (latest) quote created from a given estimate, if any. */
export async function getQuoteForEstimate(
  estimateId: string,
): Promise<Pick<QuoteRow, "id" | "quote_no" | "status"> | null> {
  const { data, error } = await getDb()
    .from("quotes")
    .select("id, quote_no, status")
    .eq("estimate_id", estimateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data ?? null;
}

/** Look up the source estimate for a quote (header fields only). */
export async function getEstimateForQuote(
  estimateId: string,
): Promise<{ id: string; estimate_no: string } | null> {
  const { data, error } = await getDb()
    .from("estimates")
    .select("id, estimate_no")
    .eq("id", estimateId)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data ?? null;
}

/* ------------------------------------------------------------------ */
/* Draft-only line item editing                                        */
/* ------------------------------------------------------------------ */
/** Only the writable fields of a quote line item. */
export type QuoteItemPatch = {
  description?: string;
  notes?: string | null;
  quantity?: number;
  unit?: string | null;
  unit_price?: number;
  tax_pct?: number;
  hsn_sac?: string | null;
  fulfilment?: string | null;
  sort_order?: number;
};

export async function addQuoteItem(
  quoteId: string,
  patch: QuoteItemPatch & { description: string; quantity: number; unit_price: number },
): Promise<QuoteItemRow> {
  const { data: existing, error: exErr } = await getDb()
    .from("quote_items")
    .select("sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (exErr) throw new AppError(mapDbError(exErr));
  const nextSort = (existing?.[0]?.sort_order ?? -1) + 1;
  const { data, error } = await getDb()
    .from("quote_items")
    .insert({
      quote_id: quoteId,
      description: patch.description,
      quantity: patch.quantity,
      unit: patch.unit ?? null,
      unit_price: patch.unit_price,
      tax_pct: patch.tax_pct ?? 0,
      hsn_sac: patch.hsn_sac ?? null,
      sort_order: patch.sort_order ?? nextSort,
      ...(patch.fulfilment ? { fulfilment: patch.fulfilment } : {}),
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  if (patch.notes && patch.notes.trim()) {
    await updateQuoteItemNote(quoteId, data.id, patch.notes.trim());
  }
  return { ...data, notes: patch.notes ?? null };
}

export async function updateQuoteItem(
  itemId: string,
  patch: QuoteItemPatch,
): Promise<QuoteItemRow> {
  if (patch.notes !== undefined) {
    const { data: item } = await getDb()
      .from("quote_items")
      .select("quote_id")
      .eq("id", itemId)
      .maybeSingle();
    if (item?.quote_id) {
      await updateQuoteItemNote(item.quote_id, itemId, patch.notes);
    }
  }

  const { notes, ...dbPatch } = patch;
  if (Object.keys(dbPatch).length > 0) {
    const { data, error } = await getDb()
      .from("quote_items")
      .update(dbPatch as never)
      .eq("id", itemId)
      .select("*")
      .single();
    if (error) throw new AppError(mapDbError(error));
    return { ...data, notes: patch.notes ?? null };
  }

  const { data, error } = await getDb().from("quote_items").select("*").eq("id", itemId).single();
  if (error) throw new AppError(mapDbError(error));
  return { ...data, notes: patch.notes ?? null };
}

export async function updateQuoteItemNote(
  quoteId: string,
  itemId: string,
  notes: string | null,
): Promise<void> {
  const { data: q, error: fetchErr } = await getDb()
    .from("quotes")
    .select("id, workflow_state")
    .eq("id", quoteId)
    .single();
  if (fetchErr || !q) return;

  const wf = (q.workflow_state as Record<string, unknown> | null) ?? {};
  const currentNotes = { ...((wf.line_item_notes as Record<string, string> | null) ?? {}) };

  if (notes && notes.trim()) {
    currentNotes[itemId] = notes.trim();
  } else {
    delete currentNotes[itemId];
  }

  const updatedWf = { ...wf, line_item_notes: currentNotes };
  const { error } = await getDb()
    .from("quotes")
    .update({ workflow_state: updatedWf } as never)
    .eq("id", quoteId);
  if (error) throw new AppError(mapDbError(error));
}

export async function deleteQuoteItem(itemId: string): Promise<void> {
  const { error } = await getDb().from("quote_items").delete().eq("id", itemId);
  if (error) throw new AppError(mapDbError(error));
}

export async function reorderQuoteItems(orderedIds: string[]): Promise<void> {
  // Two-phase reorder to avoid unique-index conflicts if one exists.
  await Promise.all(
    orderedIds.map((id, idx) =>
      getDb()
        .from("quote_items")
        .update({ sort_order: idx + 1000 } as never)
        .eq("id", id),
    ),
  );
  await Promise.all(
    orderedIds.map((id, idx) =>
      getDb()
        .from("quote_items")
        .update({ sort_order: idx } as never)
        .eq("id", id),
    ),
  );
}

/**
 * Duplicate an accepted quote into a new draft quote (revision).
 * The original quote is preserved untouched for audit; the new draft carries
 * the same project, customer, category, terms, notes and line items and can
 * then be edited freely.
 */
export async function reviseQuote(quoteId: string): Promise<QuoteRow> {
  const src = await getQuote(quoteId);
  if (!src) throw new AppError("Quote not found", "NOT_FOUND", 404);
  const items = await getQuoteItems(quoteId);
  if (items.length === 0) {
    throw new AppError("Cannot revise a quote with no line items.", "VALIDATION", 400);
  }
  const srcAny = src as unknown as {
    enquiry_id?: string | null;
    category?: string | null;
  };
  return createQuote({
    project_id: src.project_id,
    enquiry_id: srcAny.enquiry_id ?? null,
    category: (srcAny.category as never) ?? null,
    valid_until: src.valid_until ?? null,
    notes: src.notes
      ? `Revision of ${src.quote_no}\n\n${src.notes}`
      : `Revision of ${src.quote_no}`,
    terms: src.terms ?? null,
    items: items.map((it) => {
      const anyIt = it as unknown as { fulfilment?: string | null; hsn_sac?: string | null };
      return {
        product_id: it.product_id ?? null,
        description: it.description,
        quantity: Number(it.quantity),
        unit: it.unit ?? null,
        unit_price: Number(it.unit_price),
        tax_pct: Number(it.tax_pct),
        hsn_sac: anyIt.hsn_sac ?? null,
        fulfilment: (anyIt.fulfilment as never) ?? null,
      };
    }),
  });
}

/**
 * Reassign the commercial ownership of a quotation to a different customer.
 * Server-side RPC enforces:
 *  - caller has role admin or sales_manager,
 *  - no finalised (non-draft, non-cancelled) tax invoice exists,
 *  - full audit trail written to activity_log.
 * Draft invoices attached to the quote are moved to the new customer so future
 * documents flow through automatically — no duplication of quotes/projects/enquiries.
 */
export async function reassignQuoteCustomer(
  quoteId: string,
  newCustomerId: string,
): Promise<QuoteRow> {
  const { data, error } = await getDb().rpc("reassign_quote_customer", {
    p_quote_id: quoteId,
    p_new_customer_id: newCustomerId,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as QuoteRow;
}

export async function updateQuoteItemImage(
  quoteId: string,
  itemKeyOrDesc: string,
  imageUrl: string | null,
): Promise<void> {
  const { data: q, error: fetchErr } = await getDb()
    .from("quotes")
    .select("id, workflow_state")
    .eq("id", quoteId)
    .single();
  if (fetchErr || !q) throw new AppError("Quotation not found");

  const wf = (q.workflow_state as Record<string, unknown> | null) ?? {};
  const currentImages = { ...((wf.line_item_images as Record<string, string> | null) ?? {}) };

  const key = itemKeyOrDesc.trim().toLowerCase();
  if (imageUrl) {
    currentImages[key] = imageUrl;
  } else {
    delete currentImages[key];
  }

  const updatedWf = { ...wf, line_item_images: currentImages };
  const { error } = await getDb()
    .from("quotes")
    .update({ workflow_state: updatedWf } as never)
    .eq("id", quoteId);
  if (error) throw new AppError(mapDbError(error));
}
