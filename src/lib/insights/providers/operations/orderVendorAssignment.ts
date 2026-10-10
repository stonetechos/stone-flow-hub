/**
 * OrderVendorAssignmentProvider — Detects confirmed sales orders and accepted
 * customer orders that have not been assigned to a vendor/fabricator yet.
 *
 * Checks delivery deadline promised:
 * - If missing: flags that delivery deadline is not set.
 * - If deadline <= 7 days (or overdue): flags as a high-priority "🚩 Red Flag".
 * - If deadline > 7 days: flags for vendor assignment with remaining buffer.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Insight, InsightProvider } from "@/lib/insights/types";
import { parseItemVendorAssignment } from "@/lib/sales-orders/vendor-assignment";

export const ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID = "operations.order-vendor-assignment";

export const OrderVendorAssignmentProvider: InsightProvider = {
  id: ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID,
  label: "Order vendor assignment & delivery deadlines",
  fetch: async () => {
    const [soRes, quotesRes] = await Promise.all([
      supabase
        .from("sales_orders")
        .select(
          `
          id, so_no, quote_id, status, delivery_date, order_date, total, notes,
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
          id, quote_no, status, valid_until, total, notes, workflow_state, created_at,
          customer:customers!quotes_customer_id_fkey(id, name)
        `,
        )
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const salesOrders = soRes.data ?? [];
    const quotes = quotesRes.data ?? [];

    const coveredQuoteIds = new Set<string>();
    for (const so of salesOrders) {
      if (so.quote_id) coveredQuoteIds.add(so.quote_id);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const insights: Insight[] = [];

    // 1. Process Sales Orders
    for (const so of salesOrders) {
      const items = (so.items || []) as Array<{
        id: string;
        product_name?: string | null;
        description?: string | null;
        fulfilment?: string | null;
      }>;

      // Check whether vendor is assigned on items
      const assignedCount = items.filter(
        (it) => parseItemVendorAssignment(it.fulfilment) !== null,
      ).length;
      const isUnassigned = assignedCount === 0;

      if (!isUnassigned) continue;

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
        title = `Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline not set`;
        why = `Confirmed order ${orderNo} for ${customerName} has no vendor or fabricator assigned, and no promised delivery deadline has been mentioned. Assign a vendor and set the delivery date.`;
      } else {
        const dDate = new Date(deliveryDate);
        const deadline = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
        const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          // RED FLAG priority
          tone = "danger";
          kind = "risk";
          if (diffDays < 0) {
            priority = 98;
            title = `🚩 Red Flag: Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline overdue by ${Math.abs(diffDays)}d`;
            why = `CRITICAL: Order ${orderNo} delivery deadline was ${deliveryDate} (${Math.abs(diffDays)} days overdue), but no vendor has been assigned yet.`;
          } else if (diffDays === 0) {
            priority = 97;
            title = `🚩 Red Flag: Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline is TODAY`;
            why = `CRITICAL: Order ${orderNo} is promised for delivery TODAY (${deliveryDate}), but no vendor has been assigned yet.`;
          } else {
            priority = 95;
            title = `🚩 Red Flag: Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            why = `RED FLAG: Order ${orderNo} delivery deadline is in ${diffDays} day${diffDays === 1 ? "" : "s"} (${deliveryDate}), but vendor assignment is pending.`;
          }
        } else {
          priority = 76;
          tone = "info";
          kind = "warning";
          title = `Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Due in ${diffDays} days`;
          why = `Order ${orderNo} for ${customerName} has delivery deadline on ${deliveryDate} (${diffDays} days remaining). Assign a vendor to ensure timely production.`;
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
          label: `Assign vendor · ${customerName}`,
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
      const vendorId = (wf.assigned_vendor_id as string | undefined) || null;
      const vendorName = (wf.assigned_vendor_name as string | undefined) || null;
      const isVendorAssigned = Boolean(vendorId && vendorName && vendorName !== "Unassigned Yet");

      if (isVendorAssigned) continue;

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
        title = `Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline not set`;
        why = `Accepted quote ${orderNo} for ${customerName} has no vendor assigned and no promised delivery deadline set.`;
      } else {
        const dDate = new Date(deliveryDate);
        const deadline = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
        const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          tone = "danger";
          kind = "risk";
          if (diffDays < 0) {
            priority = 98;
            title = `🚩 Red Flag: Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline overdue by ${Math.abs(diffDays)}d`;
            why = `CRITICAL: Accepted order ${orderNo} delivery deadline was ${deliveryDate} (${Math.abs(diffDays)} days overdue), but vendor assignment is pending.`;
          } else if (diffDays === 0) {
            priority = 97;
            title = `🚩 Red Flag: Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline is TODAY`;
            why = `CRITICAL: Accepted order ${orderNo} is promised for delivery TODAY (${deliveryDate}), but no vendor has been assigned yet.`;
          } else {
            priority = 95;
            title = `🚩 Red Flag: Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Delivery deadline in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
            why = `RED FLAG: Accepted order ${orderNo} delivery deadline is in ${diffDays} day${diffDays === 1 ? "" : "s"} (${deliveryDate}), but vendor assignment is pending.`;
          }
        } else {
          priority = 75;
          tone = "info";
          kind = "warning";
          title = `Kindly assign a vendor for ${customerName} (Order ${orderNo}) — Due in ${diffDays} days`;
          why = `Accepted order ${orderNo} has delivery deadline on ${deliveryDate} (${diffDays} days left). Vendor assignment is pending.`;
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
          label: `Assign vendor · ${customerName}`,
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
