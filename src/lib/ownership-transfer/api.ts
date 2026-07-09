/**
 * Commercial Ownership Transfer — client API.
 *
 * Wraps three server RPCs:
 *  - preview_ownership_transfer   (impact analysis for wizard)
 *  - transfer_commercial_ownership (executes the transfer, returns transfer id)
 *  - rollback_ownership_transfer   (reverses until first finalised invoice)
 *
 * Ownership only — never duplicates records. Original commercial customer is
 * preserved on quotes/sales_orders/projects/invoices via `original_customer_id`.
 * The enquiry's `customer_id` is only touched when scope.enquiries is true, so
 * "Originally Enquired By" is retained by default.
 */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export type TransferSourceType = "customer" | "enquiry" | "quote" | "sales_order" | "project";

export interface TransferScope {
  enquiries: boolean;
  quotes: boolean;
  sales_orders: boolean;
  projects: boolean;
  installations: boolean;
  payment_schedules: boolean;
  draft_invoices: boolean;
}

export const DEFAULT_SCOPE: TransferScope = {
  enquiries: false,
  quotes: true,
  sales_orders: true,
  projects: true,
  installations: true,
  payment_schedules: true,
  draft_invoices: true,
};

export interface TransferPreview {
  from: { id: string; name: string; code: string | null; gst: string | null };
  to: { id: string; name: string; code: string | null; gst: string | null };
  counts: Record<string, number>;
  warnings: Array<{ level: string; code: string; message: string }>;
}

export async function previewOwnershipTransfer(
  fromCustomerId: string,
  toCustomerId: string,
): Promise<TransferPreview> {
  const { data, error } = await supabase.rpc("preview_ownership_transfer", {
    p_from_customer_id: fromCustomerId,
    p_to_customer_id: toCustomerId,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as TransferPreview;
}

export async function transferCommercialOwnership(input: {
  sourceType: TransferSourceType;
  sourceId: string;
  fromCustomerId: string;
  toCustomerId: string;
  scope: TransferScope;
}): Promise<string> {
  const { data, error } = await supabase.rpc("transfer_commercial_ownership", {
    p_source_type: input.sourceType,
    p_source_id: input.sourceId,
    p_from_customer_id: input.fromCustomerId,
    p_to_customer_id: input.toCustomerId,
    p_scope: input.scope as unknown as Record<string, boolean>,
  });
  if (error) throw new AppError(mapDbError(error));
  return data as unknown as string;
}

export async function rollbackOwnershipTransfer(transferId: string): Promise<void> {
  const { error } = await supabase.rpc("rollback_ownership_transfer", {
    p_transfer_id: transferId,
  });
  if (error) throw new AppError(mapDbError(error));
}
