/**
 * Vendor Delivery Proximity Prompts & WhatsApp Nudge Generator.
 *
 * Scans active vendor-assigned orders, purchase orders, and sales order items
 * approaching their delivery due date (5 days prior to due date).
 *
 * Generates ready-to-send WhatsApp status check messages for the assigned vendor:
 * "Kindly share the status of this order, we have got X days to deliver it"
 * where X = actual days remaining - 1 (giving a 1-day operational safety buffer).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseItemVendorAssignment } from "@/lib/sales-orders/vendor-assignment";

export interface VendorDeliveryDaysResult {
  actualDays: number;
  vendorDays: number;
  isPromptDue: boolean;
  vendorDaysText: string;
  formattedDueDate: string;
}

export interface VendorDeliveryPromptItem {
  id: string;
  orderType: "po" | "so" | "quote";
  orderNo: string;
  orderId: string;
  productName: string;
  itemDescription?: string | null;
  vendorId: string | null;
  vendorName: string;
  vendorPhone: string | null;
  deliveryDate: string;
  actualDaysRemaining: number;
  vendorDaysRemaining: number;
  vendorDaysText: string;
  formattedDueDate: string;
  projectName?: string | null;
  projectCode?: string | null;
  customerName?: string | null;
  status: string;
}

/**
 * Calculates delivery countdown days and 1-day-less safety buffer for vendor inquiry.
 * Returns null if the delivery date is invalid or missing.
 */
export function calculateVendorDeliveryDays(
  deliveryDateStr: string | null | undefined,
  referenceDate: Date = new Date(),
): VendorDeliveryDaysResult | null {
  if (!deliveryDateStr) return null;

  const targetDate = new Date(deliveryDateStr);
  if (isNaN(targetDate.getTime())) return null;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const actualDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Active prompt window: 0 to 5 days remaining
  const isPromptDue = actualDays >= 0 && actualDays <= 5;

  // Vendor communicated days: 1 day less than actual days
  const vendorDays = Math.max(0, actualDays - 1);

  let vendorDaysText = "";
  if (vendorDays > 1) {
    vendorDaysText = `${vendorDays} days`;
  } else if (vendorDays === 1) {
    vendorDaysText = "1 day";
  } else if (actualDays === 1) {
    vendorDaysText = "less than 24 hours";
  } else {
    vendorDaysText = "today";
  }

  const formattedDueDate = target.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    actualDays,
    vendorDays,
    isPromptDue,
    vendorDaysText,
    formattedDueDate,
  };
}

export interface VendorPromptMessageOptions {
  vendorName?: string | null;
  orderNo: string;
  productName: string;
  vendorDaysText: string;
  formattedDueDate: string;
  projectName?: string | null;
  customerName?: string | null;
}

/**
 * Builds the WhatsApp message template for the assigned vendor.
 * Incorporates product name and safety buffer days.
 */
export function buildVendorDeliveryPromptWhatsappMessage(
  options: VendorPromptMessageOptions,
): string {
  const rawVendor = options.vendorName?.trim();
  const vendorGreeting =
    rawVendor && rawVendor !== "Unassigned Vendor" && rawVendor !== "Assigned Vendor"
      ? `Namaste ${rawVendor},`
      : "Namaste,";

  const lines: string[] = [
    vendorGreeting,
    "",
    `Regarding Order #${options.orderNo} for ${options.productName}:`,
    `Kindly share the status of this order, we have got ${options.vendorDaysText} to deliver it.`,
    "",
    "Order Details:",
    `• Product: ${options.productName}`,
  ];

  if (options.projectName?.trim()) {
    lines.push(`• Project: ${options.projectName.trim()}`);
  }
  if (options.customerName?.trim()) {
    lines.push(`• Client: ${options.customerName.trim()}`);
  }
  lines.push(`• Target Delivery: ${options.formattedDueDate}`);

  lines.push("");
  lines.push("Please confirm current fabrication and dispatch status at your earliest.");
  lines.push("");
  lines.push("Thank you,");
  lines.push("Stone Tech Operations");

  return lines.join("\n");
}

/**
 * Fetches all orders approaching their delivery deadline within 5 days.
 */
export async function listUpcomingVendorDeliveryPrompts(
  referenceDate: Date = new Date(),
): Promise<VendorDeliveryPromptItem[]> {
  const prompts: VendorDeliveryPromptItem[] = [];

  // 1. Fetch Purchase Orders approaching delivery
  const poPromise = supabase
    .from("purchase_orders")
    .select(
      `
      id, po_no, status, order_date, expected_date, vendor_delivery_date, notes,
      vendor:vendors!purchase_orders_vendor_id_fkey(id, company_name, vendor_code, mobile_number, whatsapp_number),
      customer:customers!purchase_orders_customer_id_fkey(id, name, customer_code),
      project:projects!purchase_orders_project_id_fkey(id, name, project_code)
    `,
    )
    .not("status", "in", '("received","cancelled","closed")')
    .order("expected_date", { ascending: true })
    .limit(100);

  // 2. Fetch Active Sales Orders with Line Items
  const soPromise = supabase
    .from("sales_orders")
    .select(
      `
      id, so_no, quote_id, status, order_date, delivery_date, notes,
      customer:customers!sales_orders_customer_id_fkey(id, name, customer_code),
      project:projects!sales_orders_project_id_fkey(id, name, project_code),
      items:sales_order_items(id, product_name, description, quantity, fulfilment)
    `,
    )
    .in("status", ["confirmed", "in_production", "ready", "shipped"])
    .order("delivery_date", { ascending: true })
    .limit(100);

  const [poResult, soResult] = await Promise.all([poPromise, soPromise]);

  // Process Purchase Orders
  if (poResult.data) {
    for (const po of poResult.data) {
      const deliveryDate = po.vendor_delivery_date || po.expected_date;
      const timing = calculateVendorDeliveryDays(deliveryDate, referenceDate);
      if (!timing || !timing.isPromptDue) continue;

      const vendor = po.vendor as {
        id: string;
        company_name: string;
        vendor_code: string;
        mobile_number?: string | null;
        whatsapp_number?: string | null;
      } | null;

      const customer = po.customer as { id: string; name: string } | null;
      const project = po.project as { id: string; name: string; project_code: string } | null;

      // Extract product name from notes or project, or default fallback
      let productName = "Stone Fabrication Order";
      if (po.notes && po.notes.trim()) {
        const firstLine = po.notes.trim().split("\n")[0];
        if (firstLine.length < 60) productName = firstLine;
      } else if (project?.name) {
        productName = `${project.name} Stones`;
      }

      prompts.push({
        id: `po-${po.id}`,
        orderType: "po",
        orderNo: po.po_no || `PO-${po.id.slice(0, 8)}`,
        orderId: po.id,
        productName,
        itemDescription: po.notes,
        vendorId: vendor?.id ?? null,
        vendorName: vendor?.company_name || "Assigned Vendor",
        vendorPhone: vendor?.whatsapp_number || vendor?.mobile_number || null,
        deliveryDate: deliveryDate!,
        actualDaysRemaining: timing.actualDays,
        vendorDaysRemaining: timing.vendorDays,
        vendorDaysText: timing.vendorDaysText,
        formattedDueDate: timing.formattedDueDate,
        projectName: project?.name,
        projectCode: project?.project_code,
        customerName: customer?.name,
        status: po.status,
      });
    }
  }

  // Process Sales Orders Line Items with assigned vendors
  if (soResult.data) {
    // Gather vendor IDs that need phone number lookup
    const vendorIdsToLookup = new Set<string>();

    for (const so of soResult.data) {
      const deliveryDate = so.delivery_date;
      const timing = calculateVendorDeliveryDays(deliveryDate, referenceDate);
      if (!timing || !timing.isPromptDue) continue;

      const items = (so.items || []) as Array<{
        id: string;
        product_name?: string | null;
        description?: string | null;
        fulfilment?: string | null;
      }>;

      for (const item of items) {
        const assignment = parseItemVendorAssignment(item.fulfilment);
        if (assignment && assignment.vendor_id) {
          if (!assignment.vendor_phone) {
            vendorIdsToLookup.add(assignment.vendor_id);
          }
        }
      }
    }

    // Lookup missing vendor phones
    const vendorPhoneMap = new Map<string, string>();
    if (vendorIdsToLookup.size > 0) {
      const { data: vendorRows } = await supabase
        .from("vendors")
        .select("id, mobile_number, whatsapp_number")
        .in("id", Array.from(vendorIdsToLookup));
      if (vendorRows) {
        for (const v of vendorRows) {
          const phone = v.whatsapp_number || v.mobile_number;
          if (phone) vendorPhoneMap.set(v.id, phone);
        }
      }
    }

    for (const so of soResult.data) {
      const deliveryDate = so.delivery_date;
      const timing = calculateVendorDeliveryDays(deliveryDate, referenceDate);
      if (!timing || !timing.isPromptDue) continue;

      const customer = so.customer as { id: string; name: string } | null;
      const project = so.project as { id: string; name: string; project_code: string } | null;

      const items = (so.items || []) as Array<{
        id: string;
        product_name?: string | null;
        description?: string | null;
        fulfilment?: string | null;
      }>;

      let foundAssignedItem = false;

      for (const item of items) {
        const assignment = parseItemVendorAssignment(item.fulfilment);
        if (assignment && assignment.vendor_id) {
          // If already dispatched, skip
          if (
            assignment.production_status === "dispatched" ||
            assignment.production_status === "ready"
          ) {
            continue;
          }

          foundAssignedItem = true;
          const phone = assignment.vendor_phone || vendorPhoneMap.get(assignment.vendor_id) || null;

          const prodName = item.product_name || item.description || "Custom Stone Material";

          prompts.push({
            id: `so-item-${item.id}`,
            orderType: "so",
            orderNo: so.so_no,
            orderId: so.id,
            productName: prodName,
            itemDescription: item.description,
            vendorId: assignment.vendor_id,
            vendorName: assignment.vendor_name || "Assigned Fabricator",
            vendorPhone: phone,
            deliveryDate: deliveryDate!,
            actualDaysRemaining: timing.actualDays,
            vendorDaysRemaining: timing.vendorDays,
            vendorDaysText: timing.vendorDaysText,
            formattedDueDate: timing.formattedDueDate,
            projectName: project?.name,
            projectCode: project?.project_code,
            customerName: customer?.name,
            status: assignment.production_status,
          });
        }
      }

      // If no specific item vendor assigned but SO is in production and due soon, include order level prompt
      if (
        !foundAssignedItem &&
        items.length > 0 &&
        so.status !== "ready" &&
        so.status !== "shipped"
      ) {
        const firstItem = items[0];
        const prodName = firstItem.product_name || firstItem.description || "Stone Order";
        prompts.push({
          id: `so-${so.id}`,
          orderType: "so",
          orderNo: so.so_no,
          orderId: so.id,
          productName: items.length > 1 ? `${prodName} (+${items.length - 1} items)` : prodName,
          itemDescription: so.notes,
          vendorId: null,
          vendorName: "Pending Vendor Assignment",
          vendorPhone: null,
          deliveryDate: deliveryDate!,
          actualDaysRemaining: timing.actualDays,
          vendorDaysRemaining: timing.vendorDays,
          vendorDaysText: timing.vendorDaysText,
          formattedDueDate: timing.formattedDueDate,
          projectName: project?.name,
          projectCode: project?.project_code,
          customerName: customer?.name,
          status: so.status,
        });
      }
    }
  }

  // Sort by actualDaysRemaining ascending (due today / closest due date first)
  return prompts.sort((a, b) => a.actualDaysRemaining - b.actualDaysRemaining);
}

export function useVendorDeliveryPrompts() {
  return useQuery({
    queryKey: ["vendor-delivery-prompts"],
    queryFn: () => listUpcomingVendorDeliveryPrompts(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // Re-check every 5 minutes
  });
}
