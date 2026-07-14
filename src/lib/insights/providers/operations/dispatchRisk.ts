/**
 * DispatchRiskProvider — flags dispatch and delivery risk across the
 * Sales Order -> Production -> Dispatch pipeline.
 *
 * Reads: `listSalesOrders()` and `listDispatches()` (existing bulk fetches)
 * plus `listProductionOrders()` — a new bulk fetch added to
 * `manufacturing/api.ts` this phase, mirroring the existing per-Sales-Order
 * `listProductionOrdersForSalesOrder` (same shape, just not scoped to one
 * order) so this provider can see every order's production state at once.
 *
 * Four independent rules (per phase spec), each producing its own insight
 * — a Sales Order or dispatch can appear more than once if more than one
 * condition is true, the same approach FollowUpRecommendationProvider
 * (G.2) used for its overdue/due-today/due-tomorrow buckets.
 */
import { listSalesOrders } from "@/lib/sales-orders/api";
import { listDispatches } from "@/lib/dispatch/api";
import { listProductionOrders, type ProductionOrderListItem } from "@/lib/manufacturing/api";
import { formatInr } from "@/lib/format";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { daysSince, daysUntil } from "@/lib/insights/shared/dates";
import { computePriority } from "@/lib/insights/shared/priority";
import { DISPATCH_RISK_THRESHOLDS as THRESHOLDS } from "./thresholds";

export const DISPATCH_RISK_PROVIDER_ID = "operations.dispatch-risk";

const OPEN_SO_STATUSES = new Set(["draft", "confirmed", "in_production", "ready", "shipped"]);
const INCOMPLETE_PO_STATUSES = new Set(["planned", "in_progress", "on_hold"]);

export const DispatchRiskProvider: InsightProvider = {
  id: DISPATCH_RISK_PROVIDER_ID,
  label: "Dispatch risk",
  fetch: async () => {
    const [salesOrders, dispatches, productionOrders] = await Promise.all([
      listSalesOrders(),
      listDispatches(),
      listProductionOrders(),
    ]);
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const insights: Insight[] = [];

    for (const d of dispatches) {
      const customerPart = d.customer ? ` for ${d.customer.name}` : "";

      if (d.status === "planned") {
        const daysTo = daysUntil(d.dispatch_date, nowDate);
        if (daysTo < 0) {
          const overdueDays = -daysTo;
          insights.push({
            id: `${DISPATCH_RISK_PROVIDER_ID}:overdue:${d.id}`,
            source: DISPATCH_RISK_PROVIDER_ID,
            module: "Operations",
            kind: "risk",
            tone: "danger",
            confidence: 1,
            title: `Dispatch ${d.dispatch_no} is overdue — ${overdueDays}d`,
            why: `Dispatch ${d.dispatch_no}${customerPart} was planned for ${d.dispatch_date} and is still "planned" ${overdueDays} day${overdueDays === 1 ? "" : "s"} later.`,
            action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
            entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
            priority: computePriority({ urgencyDays: overdueDays }),
            generatedAt: now,
          });
        } else if (daysTo <= THRESHOLDS.dueSoonDays) {
          insights.push({
            id: `${DISPATCH_RISK_PROVIDER_ID}:due-soon:${d.id}`,
            source: DISPATCH_RISK_PROVIDER_ID,
            module: "Operations",
            kind: "warning",
            tone: "warning",
            confidence: 1,
            title: `Dispatch ${d.dispatch_no} due in ${daysTo}d`,
            why: `Dispatch ${d.dispatch_no}${customerPart} is planned for ${d.dispatch_date}, ${daysTo} day${daysTo === 1 ? "" : "s"} from now.`,
            action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
            entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
            priority: computePriority({ urgencyDays: THRESHOLDS.dueSoonDays - daysTo }),
            generatedAt: now,
          });
        }
      } else if (d.status === "in_transit") {
        const inTransitDays = daysSince(d.dispatch_date, nowDate);
        if (inTransitDays > THRESHOLDS.inTransitStallDays) {
          insights.push({
            id: `${DISPATCH_RISK_PROVIDER_ID}:pending-completion:${d.id}`,
            source: DISPATCH_RISK_PROVIDER_ID,
            module: "Operations",
            kind: "warning",
            tone: "warning",
            confidence: 1,
            title: `Dispatch ${d.dispatch_no} still in transit after ${inTransitDays}d`,
            why: `Dispatch ${d.dispatch_no}${customerPart} left "in_transit" on ${d.dispatch_date} and hasn't been marked delivered ${inTransitDays} days later.`,
            action: { label: "Open dispatch", href: `/dispatch/${d.id}` },
            entity: { type: "dispatch", id: d.id, label: d.dispatch_no },
            priority: computePriority({ urgencyDays: inTransitDays - THRESHOLDS.inTransitStallDays }),
            generatedAt: now,
          });
        }
      }
    }

    const productionBySo = new Map<string, ProductionOrderListItem[]>();
    for (const po of productionOrders) {
      if (!po.sales_order_id) continue;
      const list = productionBySo.get(po.sales_order_id) ?? [];
      list.push(po);
      productionBySo.set(po.sales_order_id, list);
    }

    for (const so of salesOrders) {
      if (!OPEN_SO_STATUSES.has(so.status) || !so.delivery_date) continue;
      const daysTo = daysUntil(so.delivery_date, nowDate);
      if (daysTo > THRESHOLDS.deliveryImminentDays || daysTo < 0) continue;

      const orders = productionBySo.get(so.id) ?? [];
      const incomplete = orders.filter((po) => INCOMPLETE_PO_STATUSES.has(po.status));
      if (incomplete.length === 0) continue;

      const customerPart = so.customer ? ` for ${so.customer.name}` : "";
      const valuePart = so.total > 0 ? ` Order value ${formatInr(so.total)}.` : "";

      insights.push({
        id: `${DISPATCH_RISK_PROVIDER_ID}:production-risk:${so.id}`,
        source: DISPATCH_RISK_PROVIDER_ID,
        module: "Operations",
        kind: "risk",
        tone: daysTo <= 1 ? "danger" : "warning",
        confidence: 1,
        title: `${so.so_no} delivery in ${daysTo}d — production not complete`,
        why:
          `${so.so_no}${customerPart} is due to deliver on ${so.delivery_date} (${daysTo} day${daysTo === 1 ? "" : "s"} away) ` +
          `but ${incomplete.length} of ${orders.length} production order${orders.length === 1 ? "" : "s"} ` +
          `${orders.length === 1 ? "is" : "are"} still in progress or on hold.${valuePart}`,
        action: { label: "Open sales order", href: `/sales-orders/${so.id}` },
        entity: { type: "sales_order", id: so.id, label: so.so_no },
        value: so.total > 0 ? so.total : undefined,
        priority: computePriority({ urgencyDays: THRESHOLDS.deliveryImminentDays - daysTo, valueInr: so.total }),
        generatedAt: now,
      });
    }

    return insights;
  },
};
