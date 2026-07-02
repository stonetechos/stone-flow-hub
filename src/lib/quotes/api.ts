/** Quotes data access — includes creation-with-items and convert-to-invoice. */
import { supabase } from "@/integrations/supabase/client";
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
  let q = supabase
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
  const { data, error } = await supabase
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as QuoteListItem[];
}

export async function getQuote(id: string): Promise<QuoteListItem | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select(SELECT_WITH_JOINS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return (data as QuoteListItem | null) ?? null;
}

export async function getQuoteItems(quoteId: string): Promise<QuoteItemRow[]> {
  const { data, error } = await supabase
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

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      quote_no: "",
      project_id: project.id,
      customer_id: project.customer_id,
      enquiry_id: parsed.enquiry_id ?? null,
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
    })
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
  }));
  const { error: itemErr } = await supabase.from("quote_items").insert(rows);
  if (itemErr) throw new AppError(mapDbError(itemErr));

  // Reload to reflect totals
  const { data: reloaded } = await supabase.from("quotes").select("*").eq("id", quote.id).single();
  return reloaded ?? quote;
}

export async function setQuoteStatus(
  id: string,
  status: DbTable<"quotes">["status"],
): Promise<QuoteRow> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase.rpc("convert_quote_to_invoice", {
    p_quote_id: parsed.quote_id,
    p_due_date: parsed.due_date ?? undefined,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as DbTable<"invoices">;
}

export async function updateQuote(id: string, input: QuoteUpdateInput): Promise<QuoteRow> {
  const parsed = quoteUpdateSchema.parse(input);
  const { data, error } = await supabase
    .from("quotes")
    .update({
      valid_until: parsed.valid_until ?? null,
      notes: parsed.notes ?? null,
      terms: parsed.terms ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
