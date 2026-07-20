/** Quotes data access — includes creation-with-items and convert-to-invoice. */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { sanitizeSearch } from "@/lib/zod";
import { getProject } from "@/lib/projects/api";
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
  customer: { id: string; name: string; customer_code: string } | null;
  project: { id: string; name: string; project_code: string } | null;
};

const SELECT_WITH_JOINS =
  "*, customer:customers!quotes_customer_id_fkey(id,name,customer_code), project:projects!quotes_project_id_fkey(id,name,project_code)";

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
  return (data ?? []) as QuoteListItem[];
}

export async function listQuotesForProject(projectId: string): Promise<QuoteListItem[]> {
  const { data, error } = await getDb()
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as QuoteListItem[];
}

export async function getQuote(id: string): Promise<QuoteListItem | null> {
  const { data, error } = await getDb()
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as QuoteListItem | null) ?? null;
}

export async function getQuoteItems(quoteId: string): Promise<QuoteItemRow[]> {
  const { data, error } = await getDb()
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function createQuote(input: QuoteCreateInput): Promise<QuoteRow> {
  const parsed = quoteCreateSchema.parse(input);
  const project = await getProject(parsed.project_id);
  if (!project) throw new AppError("Selected project not found", "NOT_FOUND", 404);

  const { data: quote, error } = await getDb()
    .from("quotes")
    .insert({
      quote_no: "",
      project_id: project.id,
      customer_id: project.customer_id,
      enquiry_id: parsed.enquiry_id ?? null,
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
      ...(parsed.category ? { category: parsed.category } : {}),
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  const rows = parsed.items.map((it, idx) => ({
    quote_id: quote.id,
    product_id: it.product_id ?? null,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit ?? null,
    unit_price: it.unit_price,
    tax_pct: it.tax_pct,
    sort_order: idx,
    ...(it.fulfilment ? { fulfilment: it.fulfilment } : {}),
  }));
  const { error: itemErr } = await getDb()
    .from("quote_items")
    .insert(rows as never);
  if (itemErr) throw new AppError(mapDbError(itemErr));

  // Reload to reflect totals
  const { data: reloaded } = await getDb().from("quotes").select("*").eq("id", quote.id).single();
  return reloaded ?? quote;
}

export async function setQuoteStatus(
  id: string,
  status: DbTable<"quotes">["status"],
): Promise<QuoteRow> {
  const { data, error } = await getDb()
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function convertQuoteToInvoice(input: ConvertQuoteInput) {
  const parsed = convertQuoteSchema.parse(input);
  const { data, error } = await getDb().rpc("convert_quote_to_invoice", {
    p_quote_id: parsed.quote_id,
    p_due_date: parsed.due_date ?? undefined,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as DbTable<"invoices">;
}

export async function updateQuote(id: string, input: QuoteUpdateInput): Promise<QuoteRow> {
  const parsed = quoteUpdateSchema.parse(input);
  const { data, error } = await getDb()
    .from("quotes")
    .update({
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
      category: parsed.category ?? null,
    } as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
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
  quantity?: number;
  unit?: string | null;
  unit_price?: number;
  tax_pct?: number;
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
      sort_order: patch.sort_order ?? nextSort,
      ...(patch.fulfilment ? { fulfilment: patch.fulfilment } : {}),
    } as never)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function updateQuoteItem(
  itemId: string,
  patch: QuoteItemPatch,
): Promise<QuoteItemRow> {
  const { data, error } = await getDb()
    .from("quote_items")
    .update(patch as never)
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
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
      const anyIt = it as unknown as { fulfilment?: string | null };
      return {
        product_id: it.product_id ?? null,
        description: it.description,
        quantity: Number(it.quantity),
        unit: it.unit ?? null,
        unit_price: Number(it.unit_price),
        tax_pct: Number(it.tax_pct),
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
