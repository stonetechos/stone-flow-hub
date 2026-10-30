/**
 * OrderVendorAssignmentProvider — Detects confirmed sales orders and accepted
 * customer orders that have not been assigned to a fulfilment source (Live Stock vs Vendor).
 *
 * Rules:
 * - Orders that are delivered, completed, or have active/delivered dispatches (delivery challans)
 *   are NEVER flagged for vendor assignment (the material has already left the yard / arrived at customer).
 * - Orders fulfilled from Live Stock (In-House Yard / Material Lifted) do not require a vendor.
 * - Only genuine unassigned orders awaiting fulfilment are flagged.
 * - Delivery deadline promised:
 *   - If missing: flags that delivery deadline & fulfilment are not set.
 *   - If deadline <= 7 days (or overdue): flags as a high-priority "🚩 Red Flag".
 *   - If deadline > 7 days: flags for assignment with remaining buffer.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { parseItemFulfilment } from "@/lib/sales-orders/vendor-assignment";

export const ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID = "operations.order-vendor-assignment";

export const OrderVendorAssignmentProvider: InsightProvider = {
  id: ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID,
  label: "Order fulfilment & delivery deadlines",
  fetch: async () => {
    const [soRes, quotesRes, dispatchesRes] = await Promise.all([
      supabase
        .from("sales_orders")
        .select(
          `
          id, so_no, quote_id, status, delivery_date, order_date, total, notes, customer_id,
          customer:customers!sales_orders_customer_id_fkey(id, name),
          items:sales_order_items(id, product_name, description, fulfilment)
        `,
        )
        .in("status", ["draft", "confirmed", "in_production", "ready"])
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("quotes")
        .select(
          `
          id, quote_no, status, valid_until, total, notes, workflow_state, created_at, customer_id,
          customer:customers!quotes_customer_id_fkey(id, name, workflow_state)
        `,
        )
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("dispatches")
        .select("id, sales_order_id, customer_id, status, dispatch_no, delivered_by, dispatch_date")
        .neq("status", "cancelled")
        .limit(1000),
    ]);

    const salesOrders = soRes.data ?? [];
    const quotes = quotesRes.data ?? [];
    const dispatches = dispatchesRes.data ?? [];

    // Index dispatches by sales_order_id and customer_id
    const dispatchesBySoId = new Map<string, typeof dispatches>();
    const dispatchesByCustomerId = new Map<string, typeof dispatches>();

    for (const d of dispatches) {
      if (d.sales_order_id) {
        const list = dispatchesBySoId.get(d.sales_order_id) ?? [];
        list.push(d);
        dispatchesBySoId.set(d.sales_order_id, list);
      }
      if (d.customer_id) {
        const list = dispatchesByCustomerId.get(d.customer_id) ?? [];
        list.push(d);
        dispatchesByCustomerId.set(d.customer_id, list);
      }
    }

    const quoteMap = new Map(quotes.map((q) => [q.id, q]));
    const coveredQuoteIds = new Set<string>();
    for (const so of salesOrders) {
      if (so.quote_id) coveredQuoteIds.add(so.quote_id);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const insights: Insight[] = [];

    // 1. Process Sales Orders
    for (const so of salesOrders) {
      // Rule 1: Skip if order is marked delivered, completed, or shipped
      const soStatus = (so.status || "").toLowerCase();
      if (soStatus === "delivered" || soStatus === "completed" || soStatus === "shipped") {
        continue;
      }

      // Rule 2: Skip if material has already been delivered or dispatched via dispatches / delivery challans
      const linkedDispatches = dispatchesBySoId.get(so.id) || [];
      const hasDeliveredDispatch = linkedDispatches.some(
        (d) => (d.status || "").toLowerCase() === "delivered" || Boolean(d.delivered_by),
      );
      const hasActiveDispatch = linkedDispatches.some(
        (d) =>
          (d.status || "").toLowerCase() === "dispatched" ||
          (d.status || "").toLowerCase() === "in_transit" ||
          (d.status || "").toLowerCase() === "loading" ||
          (d.status || "").toLowerCase() === "completed",
      );

      if (hasDeliveredDispatch || hasActiveDispatch || linkedDispatches.length > 0) {
        // Material is already delivered or dispatched! No vendor assignment needed.
        continue;
      }

      // Check customer-level dispatches for cash orders with delivery challans
      if (so.customer_id) {
        const custDispatches = dispatchesByCustomerId.get(so.customer_id) || [];
        const hasDeliveredToCustomer = custDispatches.some(
          (d) => (d.status || "").toLowerCase() === "delivered" || Boolean(d.delivered_by),
        );
        if (hasDeliveredToCustomer && (so.notes || "").toLowerCase().includes("cash")) {
          continue;
        }
      }

      // Rule 3: Skip if order notes indicate Live Stock / in-house fulfillment
      const soNotes = (so.notes || "").toLowerCase();
      if (
        soNotes.includes("live stock") ||
        soNotes.includes("in-house stock") ||
        soNotes.includes("stock lifted") ||
        soNotes.includes("from stock")
      ) {
        continue;
      }

      // Rule 4: Skip if linked quote was already decided as Live Stock / in-house
      if (so.quote_id) {
        const linkedQuote = quoteMap.get(so.quote_id);
        if (linkedQuote) {
          const qWf = (linkedQuote.workflow_state as Record<string, unknown> | null) ?? {};
          if (
            qWf.fulfilment_type === "in_stock" ||
            qWf.fulfilment_type === "stock_lifted" ||
            qWf.assigned_vendor_id === "in_house_stock" ||
            qWf.assigned_vendor_id === "stock_lifted"
          ) {
            continue;
          }
        }
      }

      // Rule 5: Check items fulfilment state
      const items = (so.items || []) as Array<{
        id: string;
        product_name?: string | null;
        description?: string | null;
        fulfilment?: string | null;
      }>;

      let hasLiveStock = false;
      let hasUnassigned = false;

      for (const it of items) {
        const fState = parseItemFulfilment(it.fulfilment);
        if (fState.mode === "live_stock" || fState.mode === "stock_lifted") {
          hasLiveStock = true;
        } else if (fState.mode === "unassigned") {
          hasUnassigned = true;
        }
      }

      // If items exist and all are assigned (either Live Stock or Vendor), skip!
      if (items.length > 0 && !hasUnassigned) continue;
      // If marked live stock across items, skip!
      if (hasLiveStock && !hasUnassigned) continue;

      const customerName = so.customer?.name || "Customer";
      const orderNo = so.so_no || "SO";
      const deliveryDate = so.delivery_date || null;

      let priority = 80;
      let tone: Insight["tone"] = "warning";
      let kind: Insight["kind"] = "warning";
      let title: string;
      let why: string;

      if (!deliveryDate) {
        priority = 82;
        tone = "warning";
        kind = "warning";
        title = `Assign Fulfilment (Live Stock / Partner) for ${customerName} (Order ${orderNo}) — Delivery deadline not set`;
        why = `Confirmed order ${orderNo} for ${customerName} has not been assigned to Live Stock or a supplying partner, and no delivery deadline is set. Please designate fulfilment source.`;
      } else {
        const dDate = new Date(deliveryDate);
        const deadline = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
        const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          tone = "danger";
          kind = "risk";
          if (diffDays < 0) {
            priority = 98;
            title = `🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for ${customerName} (Order ${orderNo}) — Delivery deadline overdue by ${Math.abs(diffDays)}d`;
            why = `CRITICAL: Order ${orderNo} delivery deadline was ${deliveryDate} (${Math.abs(diffDays)} days overdue), but fulfilment (Live Stock or Supplying Partner) is pending.`;
          } else if (diffDays === 0) {
            priority = 97;
            title = `🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for ${customerName} (Order ${orderNo}) — Delivery deadline is TODAY`;
            why = `CRITICAL: Order ${orderNo} is promised for delivery TODAY (${deliveryDate}), but fulfilment (Live Stock or Supplying Partner) is pending.`;
          } else {
            priority = 95;
            title = `🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for ${customerName} (Order ${orderNo}) — Delivery deadline in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            why = `RED FLAG: Order ${orderNo} delivery deadline is in ${diffDays} day${diffDays === 1 ? "" : "s"} (${deliveryDate}), but fulfilment is pending.`;
          }
        } else {
          priority = 76;
          tone = "info";
          kind = "warning";
          title = `Assign Fulfilment (Live Stock / Partner) for ${customerName} (Order ${orderNo}) — Due in ${diffDays} days`;
          why = `Order ${orderNo} for ${customerName} has delivery deadline on ${deliveryDate} (${diffDays} days remaining). Assign Live Stock or Supplying Partner to start production.`;
        }
      }

      insights.push({
        id: `${ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID}:so:${so.id}`,
        source: ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID,
        module: "Operations",
        kind,
        tone,
        confidence: 0.95,
        title,
        why,
        action: {
          label: `Assign Live Stock / Partner · ${customerName}`,
          href: `/sales-orders/${so.id}`,
        },
        entity: {
          type: "sales_order",
          id: so.id,
          label: orderNo,
        },
        priority,
        value: Number(so.total || 0),
        generatedAt: now.toISOString(),
      });
    }

    // 2. Process Accepted Quotations (Approved orders awaiting conversion/assignment)
    for (const q of quotes) {
      if (coveredQuoteIds.has(q.id)) continue;

      const wf = (q.workflow_state as Record<string, unknown> | null) ?? {};
      const customerWf = (q.customer?.workflow_state as Record<string, unknown> | null) ?? {};
      const isCustomerOrderCompleted =
        customerWf.response_status === "order_completed" || q.status === "converted";
      const isStockFulfilled =
        wf.fulfilment_type === "in_stock" ||
        wf.fulfilment_type === "stock_lifted" ||
        wf.assigned_vendor_id === "in_house_stock" ||
        wf.assigned_vendor_id === "stock_lifted" ||
        isCustomerOrderCompleted;

      const vendorId = (wf.assigned_vendor_id as string | undefined) || null;
      const vendorName = (wf.assigned_vendor_name as string | undefined) || null;
      const isVendorAssigned = Boolean(vendorId && vendorName && vendorName !== "Unassigned Yet");

      if (isVendorAssigned || isStockFulfilled) continue;

      // Check if quote's customer has active dispatches already
      if (q.customer_id) {
        const custDispatches = dispatchesByCustomerId.get(q.customer_id) || [];
        if (custDispatches.some((d) => (d.status || "").toLowerCase() === "delivered")) {
          continue;
        }
      }

      const customerName = q.customer?.name || "Customer";
      const orderNo = q.quote_no || "QUO";
      const deliveryDate =
        (wf.promised_delivery_date as string | undefined) || q.valid_until || null;

      let priority = 80;
      let tone: Insight["tone"] = "warning";
      let kind: Insight["kind"] = "warning";
      let title: string;
      let why: string;

      if (!deliveryDate) {
        priority = 81;
        tone = "warning";
        kind = "warning";
        title = `Assign Fulfilment (Live Stock / Partner) for ${customerName} (Quote ${orderNo}) — Delivery deadline not set`;
        why = `Accepted quote ${orderNo} for ${customerName} has no fulfilment source (Live Stock or Supplying Partner) assigned and no promised delivery deadline set.`;
      } else {
        const dDate = new Date(deliveryDate);
        const deadline = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
        const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          tone = "danger";
          kind = "risk";
          if (diffDays < 0) {
            priority = 98;
            title = `🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for ${customerName} (Quote ${orderNo}) — Delivery deadline overdue by ${Math.abs(diffDays)}d`;
            why = `CRITICAL: Accepted order ${orderNo} delivery deadline was ${deliveryDate} (${Math.abs(diffDays)} days overdue), but fulfilment is pending.`;
          } else if (diffDays === 0) {
            priority = 97;
            title = `🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for ${customerName} (Quote ${orderNo}) — Delivery deadline is TODAY`;
            why = `CRITICAL: Accepted order ${orderNo} is promised for delivery TODAY (${deliveryDate}), but fulfilment is pending.`;
          } else {
            priority = 95;
            title = `🚩 Red Flag: Assign Fulfilment (Live Stock / Partner) for ${customerName} (Quote ${orderNo}) — Delivery deadline in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            why = `RED FLAG: Accepted order ${orderNo} delivery deadline is in ${diffDays} day${diffDays === 1 ? "" : "s"} (${deliveryDate}), but fulfilment is pending.`;
          }
        } else {
          priority = 75;
          tone = "info";
          kind = "warning";
          title = `Assign Fulfilment (Live Stock / Partner) for ${customerName} (Quote ${orderNo}) — Due in ${diffDays} days`;
          why = `Accepted order ${orderNo} has delivery deadline on ${deliveryDate} (${diffDays} days left). Fulfilment assignment is pending.`;
        }
      }

      insights.push({
        id: `${ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID}:quote:${q.id}`,
        source: ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID,
        module: "Operations",
        kind,
        tone,
        confidence: 0.9,
        title,
        why,
        action: {
          label: `Assign Live Stock / Partner · ${customerName}`,
          href: `/quotes/${q.id}`,
        },
        entity: {
          type: "quote",
          id: q.id,
          label: orderNo,
        },
        priority,
        value: Number(q.total || 0),
        generatedAt: now.toISOString(),
      });
    }

    return insights;
  },
};
