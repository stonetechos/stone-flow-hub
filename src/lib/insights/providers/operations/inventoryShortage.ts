/**
 * InventoryShortageProvider — flags inventory items at risk, using only
 * shortages supported by real committed demand (no forecasting).
 *
 * Reads: `listInventory()` (existing bulk fetch — quantity_on_hand,
 * reorder_level), `listCommittedDemandByProduct()` and
 * `listOpenPurchaseProductIds()` (both new bulk fetches added this phase
 * to `dispatch/api.ts` / `purchase-orders/api.ts` — see those files'
 * doc comments for why: no existing bulk API answered "how much of this
 * product is already committed to open Sales Orders" or "does this
 * product already have an open PO").
 *
 * "Low stock" reuses the exact same on-hand-vs-reorder-level comparison
 * already used in `lib/executive/command-center.ts`'s "short stock" KPI
 * (quantity_on_hand < reorder_level) rather than inventing a new ratio.
 * "Committed exceeds available" and "negative stock" are read directly
 * off real numbers — nothing here predicts future demand.
 *
 * One insight per item (not per reason) — an item can be both negative
 * and over-committed at once, so all applicable reasons are folded into
 * a single `why`, with tone/kind driven by the worst one.
 */
import { listInventory } from "@/lib/inventory/api";
import { listCommittedDemandByProduct } from "@/lib/dispatch/api";
import { listOpenPurchaseProductIds } from "@/lib/purchase-orders/api";
import type { Insight, InsightKind, InsightProvider } from "@/lib/insights/types";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";

export const INVENTORY_SHORTAGE_PROVIDER_ID = "operations.inventory-shortage";

/** 1 = low stock, 2 = committed exceeds available, 3 = negative stock. */
type Severity = 0 | 1 | 2 | 3;

function toneFor(severity: Severity): Insight["tone"] {
  return severity >= 2 ? "danger" : "warning";
}
function kindFor(severity: Severity): InsightKind {
  return severity >= 2 ? "risk" : "warning";
}

export const InventoryShortageProvider: InsightProvider = {
  id: INVENTORY_SHORTAGE_PROVIDER_ID,
  label: "Inventory shortage",
  fetch: async () => {
    const [items, committedRows, openPurchaseProductIds] = await Promise.all([
      listInventory(),
      listCommittedDemandByProduct(),
      listOpenPurchaseProductIds(),
    ]);
    const committedByProduct = new Map(committedRows.map((r) => [r.product_id, r.committed_qty]));
    const now = new Date().toISOString();
    const insights: Insight[] = [];

    for (const item of items) {
      const onHand = Number(item.quantity_on_hand);
      const reorderLevel = Number(item.reorder_level);
      const committed = item.product_id ? (committedByProduct.get(item.product_id) ?? 0) : 0;
      const productName = item.product?.name ?? item.stock_code;
      const unit = item.unit ?? "units";

      const reasons: string[] = [];
      let severity: Severity = 0;

      if (onHand < 0) {
        reasons.push(`stock is negative (${onHand} ${unit})`);
        severity = 3;
      }
      if (committed > onHand) {
        reasons.push(
          `${committed} ${unit} is already committed to open sales orders against ${onHand} on hand`,
        );
        severity = Math.max(severity, 2) as Severity;
      }
      if (reorderLevel > 0 && onHand >= 0 && onHand < reorderLevel) {
        reasons.push(`on hand (${onHand} ${unit}) is below the reorder level of ${reorderLevel}`);
        severity = Math.max(severity, 1) as Severity;
      }

      if (severity === 0) continue;

      const hasOpenPo = item.product_id ? openPurchaseProductIds.has(item.product_id) : false;
      const poNote = hasOpenPo
        ? " A purchase order is already open for this item."
        : " No open purchase order currently covers this item.";

      insights.push({
        id: `${INVENTORY_SHORTAGE_PROVIDER_ID}:${item.id}`,
        source: INVENTORY_SHORTAGE_PROVIDER_ID,
        module: "Operations",
        kind: kindFor(severity),
        tone: toneFor(severity),
        confidence: computeConfidence(item.product_id ? 0 : 1),
        title: `${productName} — shortage risk`,
        why: `${productName} (${item.stock_code}): ${reasons.join("; ")}.${poNote}`,
        action: { label: "Open inventory item", href: `/inventory/${item.id}` },
        entity: { type: "inventory_item", id: item.id, label: item.stock_code },
        priority: computePriority({ urgencyDays: severity * 5 + (hasOpenPo ? 0 : 3) }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
