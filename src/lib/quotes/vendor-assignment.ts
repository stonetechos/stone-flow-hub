/**
 * Vendor Assignment & Promised Delivery Date for Quotes & Accepted Orders.
 *
 * Tracks whether an accepted order / quotation has been assigned to a vendor
 * or remains unassigned, along with client promised delivery dates.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { parseItemVendorAssignment } from "@/lib/sales-orders/vendor-assignment";
import type { DbTable } from "@/lib/types";

export interface QuoteVendorAssignmentInfo {
  quoteId: string;
  vendorId: string | null;
  vendorName: string | null;
  promisedDeliveryDate: string | null;
  isAssigned: boolean;
  salesOrderId?: string | null;
  salesOrderNo?: string | null;
  fulfilmentType: "in_stock" | "vendor" | "unassigned";
  stockLocation?: string | null;
}

export function parseQuoteVendorAssignment(
  quote: {
    id: string;
    valid_until?: string | null;
    workflow_state?: unknown;
  },
  linkedSo?: {
    id: string;
    so_no: string;
    delivery_date?: string | null;
    items?: Array<{ fulfilment?: string | null }>;
  } | null,
): QuoteVendorAssignmentInfo {
  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};

  let vendorId = (wf.assigned_vendor_id as string | undefined) || null;
  let vendorName = (wf.assigned_vendor_name as string | undefined) || null;
  let rawFulfilmentType = (wf.fulfilment_type as string | undefined) || null;
  const stockLocation = (wf.stock_location as string | undefined) || null;
  let promisedDeliveryDate =
    (wf.promised_delivery_date as string | undefined) || quote.valid_until || null;

  let salesOrderId: string | null = null;
  let salesOrderNo: string | null = null;

  if (linkedSo) {
    salesOrderId = linkedSo.id;
    salesOrderNo = linkedSo.so_no;
    if (linkedSo.delivery_date) {
      promisedDeliveryDate = linkedSo.delivery_date;
    }
    if (linkedSo.items && linkedSo.items.length > 0) {
      for (const it of linkedSo.items) {
        const assignment = parseItemVendorAssignment(it.fulfilment);
        if (assignment && assignment.vendor_id) {
          vendorId = assignment.vendor_id;
          vendorName = assignment.vendor_name;
          break;
        }
      }
    }
  }

  const isInStock =
    rawFulfilmentType === "in_stock" ||
    vendorId === "in_house_stock" ||
    Boolean(
      vendorName &&
      (vendorName.toLowerCase().includes("in-house stock") ||
        vendorName.toLowerCase().includes("in house stock") ||
        vendorName.toLowerCase().includes("from stock")),
    );

  if (isInStock) {
    vendorId = "in_house_stock";
    vendorName = "In-House Stock";
    rawFulfilmentType = "in_stock";
  }

  const isAssigned = Boolean(
    isInStock || (vendorId && vendorName && vendorName !== "Unassigned Yet"),
  );

  const fulfilmentType: "in_stock" | "vendor" | "unassigned" = isInStock
    ? "in_stock"
    : isAssigned
      ? "vendor"
      : "unassigned";

  return {
    quoteId: quote.id,
    vendorId,
    vendorName,
    promisedDeliveryDate,
    isAssigned,
    salesOrderId,
    salesOrderNo,
    fulfilmentType,
    stockLocation,
  };
}

export interface AssignVendorToQuoteInput {
  quoteId: string;
  fulfilmentType?: "in_stock" | "vendor";
  vendorId?: string | null;
  vendorName?: string | null;
  stockLocation?: string | null;
  promisedDeliveryDate?: string | null;
  notes?: string | null;
}

export async function assignVendorToQuote(
  input: AssignVendorToQuoteInput,
): Promise<DbTable<"quotes">> {
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("quotes")
    .select("workflow_state, notes")
    .eq("id", input.quoteId)
    .single();

  if (fetchErr || !existing) {
    throw new AppError(fetchErr ? mapDbError(fetchErr) : "Quote not found");
  }

  const currentWf = (existing.workflow_state as Record<string, unknown> | null) ?? {};
  const isInStock = input.fulfilmentType === "in_stock" || input.vendorId === "in_house_stock";

  const updatedWf: Record<string, unknown> = {
    ...currentWf,
    fulfilment_type: isInStock ? "in_stock" : "vendor",
    assigned_vendor_id: isInStock ? "in_house_stock" : (input.vendorId ?? null),
    assigned_vendor_name: isInStock ? "In-House Stock" : (input.vendorName ?? null),
    stock_location: isInStock ? input.stockLocation?.trim() || "Main Warehouse / Yard Stock" : null,
    vendor_assigned_at: new Date().toISOString(),
  };

  if (input.promisedDeliveryDate) {
    updatedWf.promised_delivery_date = input.promisedDeliveryDate;
  }

  let updatedNotes = existing.notes;
  if (input.notes && input.notes.trim()) {
    const timestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const label = isInStock
      ? `Fulfilled from In-House Stock (${input.stockLocation?.trim() || "Main Warehouse / Yard Stock"})`
      : `Assigned to ${input.vendorName || "Vendor"}`;
    const log = `\n[Fulfilment Updated · ${timestamp}] ${label}. ${input.notes.trim()}`;
    updatedNotes = existing.notes ? `${existing.notes.trim()}${log}` : log.trim();
  }

  const { data: updated, error: updateErr } = await db
    .from("quotes")
    .update({
      workflow_state: updatedWf as never,
      notes: updatedNotes,
    })
    .eq("id", input.quoteId)
    .select("*")
    .single();

  if (updateErr) throw new AppError(mapDbError(updateErr));
  return updated;
}

export async function unassignQuoteVendor(quoteId: string): Promise<DbTable<"quotes">> {
  const db = getDb();
  const { data: existing, error: fetchErr } = await db
    .from("quotes")
    .select("workflow_state")
    .eq("id", quoteId)
    .single();

  if (fetchErr || !existing) {
    throw new AppError(fetchErr ? mapDbError(fetchErr) : "Quote not found");
  }

  const currentWf = (existing.workflow_state as Record<string, unknown> | null) ?? {};
  const updatedWf = { ...currentWf };
  delete updatedWf.fulfilment_type;
  delete updatedWf.assigned_vendor_id;
  delete updatedWf.assigned_vendor_name;
  delete updatedWf.stock_location;
  delete updatedWf.vendor_assigned_at;

  const { data: updated, error: updateErr } = await db
    .from("quotes")
    .update({
      workflow_state: updatedWf as never,
    })
    .eq("id", quoteId)
    .select("*")
    .single();

  if (updateErr) throw new AppError(mapDbError(updateErr));
  return updated;
}
