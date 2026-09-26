/**
 * Vendor & Manufacturer Assignment on Sales Order Line Items.
 *
 * Allows operations teams to attach specific stone fabricators / manufacturers
 * to individual products within a confirmed Sales Order, tracking advance payments
 * and preventing delivery delays.
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

/**
 * Safely parse vendor assignment from a line item's fulfilment field.
 */
export function parseItemVendorAssignment(
  fulfilment: string | null | undefined,
): ItemVendorAssignment | null {
  if (!fulfilment || typeof fulfilment !== "string") return null;
  const trimmed = fulfilment.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const data = JSON.parse(trimmed) as Partial<ItemVendorAssignment>;
    if (data && data.vendor_id && data.vendor_name) {
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
 * Serializes vendor assignment into the fulfilment column string.
 */
export function serializeItemVendorAssignment(assignment: ItemVendorAssignment): string {
  return JSON.stringify(assignment);
}
