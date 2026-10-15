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
  quotedRateSqft?: number | null;
  leadTimeDays?: number | null;
  isAssigned: boolean;
  salesOrderId?: string | null;
  salesOrderNo?: string | null;
  fulfilmentType: "in_stock" | "stock_lifted" | "vendor" | "unassigned";
  stockLocation?: string | null;
  isOrderCompleted?: boolean;
  rfqNotRequired?: boolean;
}

export function parseQuoteVendorAssignment(
  quote: {
    id: string;
    valid_until?: string | null;
    workflow_state?: unknown;
    status?: string | null;
    customer?: {
      id?: string;
      workflow_state?: unknown;
    } | null;
  },
  linkedSo?: {
    id: string;
    so_no: string;
    delivery_date?: string | null;
    items?: Array<{ fulfilment?: string | null }>;
  } | null,
): QuoteVendorAssignmentInfo {
  const wf = (quote.workflow_state as Record<string, unknown> | null) ?? {};
  const customerWf = (quote.customer?.workflow_state as Record<string, unknown> | null) ?? {};

  const customerCrmStatus = (customerWf.response_status as string | undefined) || null;
  const isCustomerOrderCompleted =
    customerCrmStatus === "order_completed" || quote.status === "converted";

  let vendorId = (wf.assigned_vendor_id as string | undefined) || null;
  let vendorName = (wf.assigned_vendor_name as string | undefined) || null;
  let rawFulfilmentType = (wf.fulfilment_type as string | undefined) || null;
  let stockLocation = (wf.stock_location as string | undefined) || null;
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

  const isExplicitVendorAssigned = Boolean(
    vendorId &&
    vendorId !== "in_house_stock" &&
    vendorId !== "stock_lifted" &&
    vendorId !== "Unassigned Yet" &&
    vendorName &&
    vendorName !== "Unassigned Yet" &&
    !vendorName.toLowerCase().includes("stock") &&
    rawFulfilmentType === "vendor",
  );

  const isStockLifted =
    rawFulfilmentType === "stock_lifted" ||
    vendorId === "stock_lifted" ||
    Boolean(vendorName && vendorName.toLowerCase().includes("lifted from stock")) ||
    (isCustomerOrderCompleted && !isExplicitVendorAssigned);

  const isInStock =
    !isStockLifted &&
    (rawFulfilmentType === "in_stock" ||
      vendorId === "in_house_stock" ||
      Boolean(
        vendorName &&
        (vendorName.toLowerCase().includes("in-house stock") ||
          vendorName.toLowerCase().includes("in house stock") ||
          vendorName.toLowerCase().includes("from stock")),
      ));

  if (isStockLifted) {
    vendorId = "stock_lifted";
    vendorName = "Material Lifted from Stock";
    rawFulfilmentType = "stock_lifted";
    stockLocation =
      stockLocation ||
      (isCustomerOrderCompleted
        ? "Lifted from Stock · Order Completed"
        : "Lifted from Stock / Yard");
  } else if (isInStock) {
    vendorId = "in_house_stock";
    vendorName = "In-House Stock";
    rawFulfilmentType = "in_stock";
  }

  const isAssigned = Boolean(
    isStockLifted || isInStock || (vendorId && vendorName && vendorName !== "Unassigned Yet"),
  );

  const fulfilmentType: "in_stock" | "stock_lifted" | "vendor" | "unassigned" = isStockLifted
    ? "stock_lifted"
    : isInStock
      ? "in_stock"
      : isAssigned
        ? "vendor"
        : "unassigned";

  const quotedRateSqft = typeof wf.quoted_rate_sqft === "number" ? wf.quoted_rate_sqft : null;
  const leadTimeDays = typeof wf.lead_time_days === "number" ? wf.lead_time_days : null;

  return {
    quoteId: quote.id,
    vendorId,
    vendorName,
    promisedDeliveryDate,
    quotedRateSqft,
    leadTimeDays,
    isAssigned,
    salesOrderId,
    salesOrderNo,
    fulfilmentType,
    stockLocation,
    isOrderCompleted: isCustomerOrderCompleted,
    rfqNotRequired: isStockLifted || isInStock || isCustomerOrderCompleted,
  };
}

export interface AssignVendorToQuoteInput {
  quoteId: string;
  fulfilmentType?: "in_stock" | "stock_lifted" | "vendor";
  vendorId?: string | null;
  vendorName?: string | null;
  stockLocation?: string | null;
  promisedDeliveryDate?: string | null;
  quotedRateSqft?: number | null;
  leadTimeDays?: number | null;
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
  const isStockLifted =
    input.fulfilmentType === "stock_lifted" || input.vendorId === "stock_lifted";
  const isInStock =
    !isStockLifted && (input.fulfilmentType === "in_stock" || input.vendorId === "in_house_stock");

  const targetFulfilment = isStockLifted ? "stock_lifted" : isInStock ? "in_stock" : "vendor";
  const targetVendorId = isStockLifted
    ? "stock_lifted"
    : isInStock
      ? "in_house_stock"
      : (input.vendorId ?? null);
  const targetVendorName = isStockLifted
    ? "Material Lifted from Stock"
    : isInStock
      ? "In-House Stock"
      : (input.vendorName ?? null);
  const targetLocation = isStockLifted
    ? input.stockLocation?.trim() || "Lifted from Stock / Yard"
    : isInStock
      ? input.stockLocation?.trim() || "Main Warehouse / Yard Stock"
      : null;

  const updatedWf: Record<string, unknown> = {
    ...currentWf,
    fulfilment_type: targetFulfilment,
    assigned_vendor_id: targetVendorId,
    assigned_vendor_name: targetVendorName,
    stock_location: targetLocation,
    vendor_assigned_at: new Date().toISOString(),
  };

  if (input.promisedDeliveryDate) {
    updatedWf.promised_delivery_date = input.promisedDeliveryDate;
  }
  if (input.quotedRateSqft != null) {
    updatedWf.quoted_rate_sqft = input.quotedRateSqft;
  }
  if (input.leadTimeDays != null) {
    updatedWf.lead_time_days = input.leadTimeDays;
  }

  let updatedNotes = existing.notes;
  if (input.notes && input.notes.trim()) {
    const timestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const label = isStockLifted
      ? `Material Lifted from Stock (${targetLocation})`
      : isInStock
        ? `Fulfilled from In-House Stock (${targetLocation})`
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
