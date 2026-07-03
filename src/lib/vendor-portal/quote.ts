/** Vendor quote draft + submit. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { z } from "zod";
import type { DbTable } from "@/lib/types";

export type VendorQuoteRow = DbTable<"vendor_quotes">;

export const quoteDraftSchema = z.object({
  price_total: z
    .number({ message: "Price is required" })
    .nonnegative("Price cannot be negative")
    .optional(),
  freight_inr: z.number().nonnegative().optional().nullable(),
  dispatch_days: z.number().int().nonnegative().optional().nullable(),
  gst_included: z.boolean().optional(),
  stock_available: z.boolean().optional(),
  valid_until: z.string().optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  quote_pdf_file_id: z.string().uuid().optional().nullable(),
});
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export async function getExistingQuote(vendorRequestId: string): Promise<VendorQuoteRow | null> {
  const { data, error } = await supabase
    .from("vendor_quotes")
    .select("*")
    .eq("vendor_request_id", vendorRequestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

/**
 * Upsert-style save: creates a draft if none exists, otherwise updates it.
 * Only editable while not approved / not rejected (enforced by RLS).
 */
export async function saveQuoteDraft(
  vendorRequestId: string,
  input: QuoteDraft,
): Promise<VendorQuoteRow> {
  const parsed = quoteDraftSchema.parse(input);
  const existing = await getExistingQuote(vendorRequestId);

  const payload = {
    total_inr: parsed.price_total ?? 0,
    freight_inr: parsed.freight_inr ?? undefined,
    dispatch_days: parsed.dispatch_days ?? undefined,
    gst_included: parsed.gst_included ?? false,
    stock_available: parsed.stock_available ?? false,
    valid_until: parsed.valid_until ?? undefined,
    remarks: parsed.remarks ?? undefined,
    quote_pdf_file_id: parsed.quote_pdf_file_id ?? undefined,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("vendor_quotes")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new AppError(mapDbError(error));
    return data;
  }
  const { data, error } = await supabase
    .from("vendor_quotes")
    .insert({ vendor_request_id: vendorRequestId, ...payload })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function submitQuote(vendorRequestId: string): Promise<VendorQuoteRow> {
  const existing = await getExistingQuote(vendorRequestId);
  if (!existing) throw new AppError("Save the quote before submitting.");
  const { data: sess } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("vendor_quotes")
    .update({ submitted_at: new Date().toISOString(), submitted_by: sess.user?.id ?? null })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));

  await supabase.from("vendor_requests").update({ response_status: "submitted" }).eq("id", vendorRequestId);

  await supabase.rpc("log_notification_event", {
    _event: "QUOTE_SUBMITTED",
    _entity_type: "vendor_quote",
    _entity_id: data.id,
    _payload: { vendor_request_id: vendorRequestId },
  });

  return data;
}
