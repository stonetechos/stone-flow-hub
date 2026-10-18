/**
 * Vendor & Live Stock Fulfilment Assignment on Sales Order Line Items.
 *
 * Allows operations teams to designate whether a sales order line item is:
 * 1. Fulfilled directly from Live Stock (In-House Yard / Warehouse)
 * 2. Lifted from Live Stock (Self-pickup / delivered from yard)
 * 3. Outsourced to an external Vendor / Fabricator / Quarry
 */

export interface ItemVendorAssignment {
  vendor_id: string;
  vendor_name: string;
  vendor_phone?: string;
  advance_required_inr?: number;
  advance_paid_inr?: number;
  advance_status: "unpaid" | "partial" | "paid";
  production_status: "assigned" | "advance_pending" | "in_fabrication" | "ready" | "dispatched";
  manufacturer_notes?: string;
  assigned_at: string;
}

export type ItemFulfilmentMode = "live_stock" | "stock_lifted" | "vendor" | "unassigned";

export interface ItemFulfilmentState {
  mode: ItemFulfilmentMode;
  label: string;
  location?: string;
  vendorAssignment?: ItemVendorAssignment | null;
}

/**
 * Parses full fulfilment state (Live Stock, Lifted from Stock, Vendor, or Unassigned).
 */
export function parseItemFulfilment(fulfilment: string | null | undefined): ItemFulfilmentState {
  if (!fulfilment || typeof fulfilment !== "string") {
    return { mode: "unassigned", label: "Unassigned" };
  }
  const trimmed = fulfilment.trim();
  const lower = trimmed.toLowerCase();

  // Keyword check
  if (
    lower === "live_stock" ||
    lower === "in_house_stock" ||
    lower === "in_stock" ||
    lower === "stock"
  ) {
    return {
      mode: "live_stock",
      label: "Live Stock (In-House Yard)",
      location: "Main Yard / Slab Storage",
    };
  }
  if (lower === "stock_lifted" || lower === "lifted") {
    return {
      mode: "stock_lifted",
      label: "Material Lifted from Stock",
      location: "Lifted from Stock / Yard",
    };
  }

  // JSON payload
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const data = JSON.parse(trimmed) as Record<string, unknown>;
      const fType = (data.fulfilment_type as string | undefined)?.toLowerCase();
      const vendorId = (data.vendor_id as string | undefined)?.toLowerCase();
      const vendorName = (data.vendor_name as string | undefined)?.toLowerCase();
      const loc =
        (data.location as string | undefined) ||
        (data.stock_location as string | undefined) ||
        undefined;

      if (
        fType === "live_stock" ||
        fType === "in_stock" ||
        vendorId === "in_house_stock" ||
        vendorId === "live_stock" ||
        vendorName?.includes("live stock") ||
        vendorName?.includes("in-house stock")
      ) {
        return {
          mode: "live_stock",
          label: "Live Stock (In-House Yard)",
          location: loc || "Main Yard / Slab Storage",
        };
      }

      if (
        fType === "stock_lifted" ||
        vendorId === "stock_lifted" ||
        vendorName?.includes("lifted from stock")
      ) {
        return {
          mode: "stock_lifted",
          label: "Material Lifted from Stock",
          location: loc || "Lifted from Stock / Yard",
        };
      }

      if (data.vendor_id && data.vendor_name && data.vendor_name !== "Unassigned Yet") {
        const vendorAssignment = parseItemVendorAssignment(fulfilment);
        if (vendorAssignment) {
          return {
            mode: "vendor",
            label: vendorAssignment.vendor_name,
            vendorAssignment,
          };
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  return { mode: "unassigned", label: "Unassigned" };
}

/**
 * Safely parse vendor assignment from a line item's fulfilment field.
 * Returns null if the item is fulfilled from Live Stock or unassigned.
 */
export function parseItemVendorAssignment(
  fulfilment: string | null | undefined,
): ItemVendorAssignment | null {
  if (!fulfilment || typeof fulfilment !== "string") return null;
  const trimmed = fulfilment.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const data = JSON.parse(trimmed) as Partial<ItemVendorAssignment> & {
      fulfilment_type?: string;
    };
    if (
      data.fulfilment_type === "live_stock" ||
      data.fulfilment_type === "stock_lifted" ||
      data.vendor_id === "in_house_stock" ||
      data.vendor_id === "live_stock" ||
      data.vendor_id === "stock_lifted"
    ) {
      return null;
    }

    if (data && data.vendor_id && data.vendor_name && data.vendor_name !== "Unassigned Yet") {
      return {
        vendor_id: data.vendor_id,
        vendor_name: data.vendor_name,
        vendor_phone: data.vendor_phone,
        advance_required_inr: Number(data.advance_required_inr || 0),
        advance_paid_inr: Number(data.advance_paid_inr || 0),
        advance_status: data.advance_status || "unpaid",
        production_status: data.production_status || "assigned",
        manufacturer_notes: data.manufacturer_notes || "",
        assigned_at: data.assigned_at || new Date().toISOString(),
      };
    }
  } catch {
    // If not JSON, ignore
  }
  return null;
}

/**
 * Serializes Live Stock fulfilment into the fulfilment column string.
 */
export function serializeLiveStockAssignment(opts?: { location?: string; notes?: string }): string {
  return JSON.stringify({
    fulfilment_type: "live_stock",
    vendor_id: "in_house_stock",
    vendor_name: "Live Stock (In-House Yard)",
    location: opts?.location || "Main Yard / Slab Storage",
    notes: opts?.notes || "",
    assigned_at: new Date().toISOString(),
  });
}

/**
 * Serializes Material Lifted from Stock into the fulfilment column string.
 */
export function serializeStockLiftedAssignment(opts?: {
  location?: string;
  notes?: string;
}): string {
  return JSON.stringify({
    fulfilment_type: "stock_lifted",
    vendor_id: "stock_lifted",
    vendor_name: "Material Lifted from Stock",
    location: opts?.location || "Lifted from Stock / Yard",
    notes: opts?.notes || "",
    assigned_at: new Date().toISOString(),
  });
}

/**
 * Serializes vendor assignment into the fulfilment column string.
 */
export function serializeItemVendorAssignment(assignment: ItemVendorAssignment): string {
  return JSON.stringify({
    fulfilment_type: "vendor",
    ...assignment,
  });
}
