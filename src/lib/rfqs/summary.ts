export interface QuoteSendRfqItem {
  id?: string;
  product_name?: string | null;
  description?: string | null;
  notes?: string | null;
  product_id?: string | null;
  quantity?: number;
  uom?: string | null;
  unit?: string | null;
}

/**
 * Resolves the manual description / specifications for an RFQ stone item.
 * Prioritizes custom edited text, then line item notes, then custom description if distinct from catalog name.
 */
export function resolveRfqItemDescription(item: QuoteSendRfqItem, customText?: string): string {
  if (customText !== undefined && customText !== null) {
    return customText.trim();
  }
  if (item.notes && item.notes.trim()) {
    return item.notes.trim();
  }
  if (
    item.description &&
    item.product_name &&
    item.description.trim().toLowerCase() !== item.product_name.trim().toLowerCase()
  ) {
    return item.description.trim();
  }
  return "";
}

/**
 * Formats stone line items for the WhatsApp RFQ message, embedding the manual description & specs.
 */
export function formatRfqItemsSummary(
  items: QuoteSendRfqItem[],
  customDescriptions?: Record<string, string>,
): string {
  return items
    .map((it, idx) => {
      const itemKey = it.id || String(idx);
      const name = it.product_name || it.description || `Stone Material #${idx + 1}`;
      const qty = it.quantity ?? 1;
      const uom = it.uom || it.unit || "sqft";
      const manualDesc = resolveRfqItemDescription(it, customDescriptions?.[itemKey]);
      const descBlock = manualDesc ? `\n   📝 *Description & Specs:* ${manualDesc}` : "";
      return `• *${name}* — ${qty} ${uom}${descBlock}`;
    })
    .join("\n\n");
}
