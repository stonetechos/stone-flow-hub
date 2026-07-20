/**
 * VendorPaymentQueueProvider — ranks vendors by payment priority using
 * existing vendor scores, ledger history, and open purchase commitments.
 *
 * Reads: `vendor_ledger_entries` / `vendor_payments` / `vendor_performance_cache`
 * via `listVendorScores()` (the `vendor-intel.ts` aggregation, extended this
 * phase so it exposes every vendor, not just the top-15-per-category slices
 * `getVendorIntel()` returns — see that file's `computeVendorScores`
 * extraction), and `purchase_orders` via the existing `listPurchaseOrders()`
 * for open commitment counts.
 *
 * Deliberately does NOT invent a cash forecast or a payment due date —
 * `purchase_orders` / `vendor_payments` have no reliable per-obligation due
 * date in this schema (payment_schedule is a per-PO JSON blob, not a simple
 * comparable field). Instead this uses the vendor ledger's own
 * server-computed `running_balance` (via `listVendorLedger`) to find how
 * long the CURRENT outstanding balance has persisted — a real, observable
 * fact — as a stand-in for "overdue status" without fabricating terms.
 */
import { listVendorScores } from "@/lib/executive/vendor-intel";
import { listVendorLedger, type VendorLedgerRow } from "@/lib/vendors/ledger";
import { listPurchaseOrders } from "@/lib/purchase-orders/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince } from "@/lib/insights/shared/dates";
import { computeConfidence, computePriority } from "@/lib/insights/shared/priority";
import { VENDOR_PAYMENT_QUEUE_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const VENDOR_PAYMENT_QUEUE_PROVIDER_ID = "finance.vendor-payment-queue";

const OPEN_PO_STATUSES = new Set(["draft", "sent", "acknowledged", "partially_received"]);

/** Finds the entry_date the vendor's current outstanding streak began, by
 *  walking the ledger backward over its own server-computed running_balance
 *  — no assumed payment terms, no forecast, just when the balance last went
 *  from cleared (<= 0) to owed and stayed that way. */
export function outstandingSinceDate(rows: VendorLedgerRow[]): string | null {
  if (rows.length === 0) return null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].running_balance <= 0) {
      return rows[i + 1]?.entry_date ?? rows[rows.length - 1].entry_date;
    }
  }
  return rows[0].entry_date;
}

export const VendorPaymentQueueProvider: InsightProvider = {
  id: VENDOR_PAYMENT_QUEUE_PROVIDER_ID,
  label: "Vendor payment queue",
  fetch: async () => {
    const [scores, purchaseOrders] = await Promise.all([listVendorScores(), listPurchaseOrders()]);

    const owed = scores.filter((s) => s.outstanding >= THRESHOLDS.minOutstandingInr);
    if (owed.length === 0) return [];

    const openPoCountByVendor = new Map<string, number>();
    for (const po of purchaseOrders) {
      if (!po.vendor_id || !OPEN_PO_STATUSES.has(po.status)) continue;
      openPoCountByVendor.set(po.vendor_id, (openPoCountByVendor.get(po.vendor_id) ?? 0) + 1);
    }

    const ledgerByVendor = await Promise.all(
      owed.map((v) => listVendorLedger(v.vendor_id).catch(() => [] as VendorLedgerRow[])),
    );

    const now = new Date().toISOString();

    return owed.map((vendor, i) => {
      const ledgerRows = ledgerByVendor[i];
      const sinceDate = outstandingSinceDate(ledgerRows);
      const outstandingDays = sinceDate ? daysSince(sinceDate) : 0;
      const openPoCount = openPoCountByVendor.get(vendor.vendor_id) ?? 0;
      const isCriticalSupplier = vendor.is_preferred && vendor.risk >= THRESHOLDS.criticalRiskScore;

      const reasons: string[] = [`${formatInr(vendor.outstanding)} outstanding`];
      if (sinceDate)
        reasons.push(`owed for ${outstandingDays} day${outstandingDays === 1 ? "" : "s"}`);
      if (vendor.is_preferred) reasons.push("preferred vendor");
      if (openPoCount > 0) {
        reasons.push(
          `${openPoCount} open purchase order${openPoCount === 1 ? "" : "s"} depending on this relationship`,
        );
      }
      if (isCriticalSupplier)
        reasons.push("high risk score — a payment delay here is more likely to disrupt supply");

      const tone: Insight["tone"] =
        isCriticalSupplier || outstandingDays > 30
          ? "danger"
          : outstandingDays > 14
            ? "warning"
            : "info";

      let urgency = Math.min(40, outstandingDays);
      if (vendor.is_preferred) urgency += 15;
      if (openPoCount > 0) urgency += Math.min(15, openPoCount * 5);
      if (isCriticalSupplier) urgency += 20;

      return {
        id: `${VENDOR_PAYMENT_QUEUE_PROVIDER_ID}:${vendor.vendor_id}`,
        source: VENDOR_PAYMENT_QUEUE_PROVIDER_ID,
        module: "Finance",
        kind: isCriticalSupplier ? "risk" : "action",
        tone,
        confidence: computeConfidence(sinceDate ? 0 : 1),
        title: `Pay ${vendor.name} — ${formatInr(vendor.outstanding)} owed${vendor.is_preferred ? " (preferred)" : ""}`,
        why: `${reasons.join(", ")}.`,
        action: { label: "Open vendor ledger", href: `/vendors/${vendor.vendor_id}/ledger` },
        entity: { type: "vendor", id: vendor.vendor_id, label: vendor.name },
        value: vendor.outstanding,
        priority: computePriority({ urgencyDays: urgency, valueInr: vendor.outstanding }),
        generatedAt: now,
      };
    });
  },
};
