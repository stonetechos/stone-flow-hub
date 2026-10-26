/**
 * Quotation vs Delivery Challan Product Variance Engine
 *
 * Compares quotation specifications against delivery challan (dispatch) line items.
 * Detects:
 *   1. Quantity mismatches (e.g. Quoted 500 sqft vs Dispatched 450 sqft)
 *   2. Omitted items (quoted items missing from challan)
 *   3. Added / extra items (challan contains materials not in quotation)
 *   4. Unit mismatches (e.g. sqft vs pcs)
 *
 * Discrepancies are flagged on the executive dashboard to Super Admins and
 * dispatched via in-app/system notifications.
 */

export interface LineItemRef {
  product_id?: string | null;
  product_name?: string | null;
  description?: string | null;
  quantity: number | string | null;
  unit?: string | null;
}

export type VarianceType = "quantity_mismatch" | "item_omitted" | "item_added" | "unit_mismatch";

export interface ProductVarianceItem {
  type: VarianceType;
  productName: string;
  quotedQty?: number;
  dispatchedQty?: number;
  difference?: number;
  unit?: string;
  severity: "critical" | "warning";
  message: string;
}

export interface QuoteDispatchVarianceReport {
  hasVariance: boolean;
  varianceCount: number;
  variances: ProductVarianceItem[];
  summaryText: string;
}

export interface FlaggedChallanDiscrepancy {
  quoteId: string;
  quoteNo: string;
  dispatchId: string;
  dispatchNo: string;
  customerId: string | null;
  customerName: string;
  dispatchDate: string;
  dealType: "cash" | "invoiced";
  report: QuoteDispatchVarianceReport;
}

export function normalizeItemName(name?: string | null): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getItemKey(item: LineItemRef): string {
  if (item.product_id) return `p:${item.product_id}`;
  const name = normalizeItemName(item.product_name || item.description);
  return `d:${name}`;
}

export function getItemDisplayName(item: LineItemRef): string {
  return (
    item.product_name?.trim() ||
    item.description?.trim() ||
    (item.product_id ? `Product (${item.product_id.slice(0, 8)})` : "Unspecified item")
  );
}

/**
 * Pure comparison logic between quotation items and delivery challan items.
 */
export function compareQuoteAndDispatchItems(
  quoteItems: LineItemRef[],
  dispatchItems: LineItemRef[],
): QuoteDispatchVarianceReport {
  const variances: ProductVarianceItem[] = [];

  const quoteMap = new Map<string, { item: LineItemRef; totalQty: number }>();
  for (const qi of quoteItems) {
    const key = getItemKey(qi);
    const qty = Number(qi.quantity ?? 0);
    const existing = quoteMap.get(key);
    if (existing) {
      existing.totalQty += qty;
    } else {
      quoteMap.set(key, { item: qi, totalQty: qty });
    }
  }

  const dispatchMap = new Map<string, { item: LineItemRef; totalQty: number }>();
  for (const di of dispatchItems) {
    const key = getItemKey(di);
    const qty = Number(di.quantity ?? 0);
    const existing = dispatchMap.get(key);
    if (existing) {
      existing.totalQty += qty;
    } else {
      dispatchMap.set(key, { item: di, totalQty: qty });
    }
  }

  // 1. Check every quote item against dispatch items
  for (const [key, { item: qItem, totalQty: qQty }] of quoteMap.entries()) {
    const dEntry = dispatchMap.get(key);
    const displayName = getItemDisplayName(qItem);

    if (!dEntry || dEntry.totalQty <= 0) {
      variances.push({
        type: "item_omitted",
        productName: displayName,
        quotedQty: qQty,
        dispatchedQty: 0,
        difference: -qQty,
        unit: qItem.unit || undefined,
        severity: "critical",
        message: `Quoted ${qQty} ${qItem.unit || "units"} of "${displayName}" was not dispatched on this challan.`,
      });
    } else {
      const dQty = dEntry.totalQty;
      const dItem = dEntry.item;
      const diff = Math.round((dQty - qQty) * 1000) / 1000;

      // Quantity tolerance: 0.01 (accounts for float precision)
      if (Math.abs(diff) > 0.01) {
        const isExcess = diff > 0;
        variances.push({
          type: "quantity_mismatch",
          productName: displayName,
          quotedQty: qQty,
          dispatchedQty: dQty,
          difference: diff,
          unit: qItem.unit || dItem.unit || undefined,
          severity: Math.abs(diff) / Math.max(qQty, 1) > 0.1 ? "critical" : "warning",
          message: isExcess
            ? `Excess quantity dispatched: ${dQty} vs Quoted ${qQty} (+${diff} ${qItem.unit || ""}) for "${displayName}".`
            : `Short supply on challan: ${dQty} vs Quoted ${qQty} (${diff} ${qItem.unit || ""}) for "${displayName}".`,
        });
      }

      // Check unit consistency
      const qUnit = normalizeItemName(qItem.unit);
      const dUnit = normalizeItemName(dItem.unit);
      if (qUnit && dUnit && qUnit !== dUnit) {
        variances.push({
          type: "unit_mismatch",
          productName: displayName,
          quotedQty: qQty,
          dispatchedQty: dQty,
          severity: "warning",
          message: `Unit mismatch for "${displayName}": quoted in ${qItem.unit}, dispatched in ${dItem.unit}.`,
        });
      }
    }
  }

  // 2. Check for extra items on delivery challan not present on quotation
  for (const [key, { item: dItem, totalQty: dQty }] of dispatchMap.entries()) {
    if (!quoteMap.has(key)) {
      const displayName = getItemDisplayName(dItem);
      variances.push({
        type: "item_added",
        productName: displayName,
        quotedQty: 0,
        dispatchedQty: dQty,
        difference: dQty,
        unit: dItem.unit || undefined,
        severity: "critical",
        message: `Unquoted item on challan: ${dQty} ${dItem.unit || "units"} of "${displayName}" was not in Quote specs.`,
      });
    }
  }

  const hasVariance = variances.length > 0;
  const summaryParts: string[] = [];
  const omissions = variances.filter((v) => v.type === "item_omitted");
  const qtyDiffs = variances.filter((v) => v.type === "quantity_mismatch");
  const additions = variances.filter((v) => v.type === "item_added");

  if (omissions.length > 0) summaryParts.push(`${omissions.length} missing items`);
  if (qtyDiffs.length > 0) summaryParts.push(`${qtyDiffs.length} quantity variances`);
  if (additions.length > 0) summaryParts.push(`${additions.length} unquoted items added`);

  const summaryText = hasVariance
    ? summaryParts.join(", ")
    : "Quotation and delivery challan products match perfectly (100% verified)";

  return {
    hasVariance,
    varianceCount: variances.length,
    variances,
    summaryText,
  };
}
