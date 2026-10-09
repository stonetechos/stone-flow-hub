/**
 * Order Pipeline for Customer & Vendor Deadlines Tracking.
 *
 * Tracks orders assigned to vendors, comparing vendor delivery deadlines
 * against committed customer deadlines to ensure on-time delivery and
 * structured operational follow-ups.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { normalizeCustomerRow } from "./normalize";
import { parseItemVendorAssignment } from "@/lib/sales-orders/vendor-assignment";

export type DeadlineHealth =
  | "overdue"
  | "critical_delay" // vendor deadline is after customer deadline (negative buffer)
  | "tight_buffer" // buffer is 0 to 2 days
  | "on_track" // buffer is >= 3 days
  | "completed"; // delivered / received

export interface OrderPipelineItem {
  id: string;
  orderType: "po" | "so";
  orderNo: string;
  orderId: string;
  orderDate: string;

  // Customer details
  customerId: string | null;
  customerName: string;
  customerCode?: string | null;
  contactPerson?: string | null;
  firmName?: string | null;
  customerPhone?: string | null;

  // Vendor details
  vendorId: string | null;
  vendorName: string;
  vendorCode?: string | null;
  vendorPhone?: string | null;

  // Products / Items description
  itemDescription?: string | null;

  // Deadlines
  vendorDeadline: string | null; // deadline given to vendor
  customerDeadline: string | null; // deadline promised to customer

  // Buffer and health
  bufferDays: number | null; // customerDeadline - vendorDeadline in days
  health: DeadlineHealth;

  // Status & Metadata
  status: string;
  notes?: string | null;
  projectCode?: string | null;
  projectName?: string | null;
}

/**
 * Computes health status and buffer days between vendor deadline and customer deadline.
 */
export function calculateDeadlineHealth(
  vendorDeadline: string | null | undefined,
  customerDeadline: string | null | undefined,
  status: string,
  referenceDate = new Date(),
): { bufferDays: number | null; health: DeadlineHealth } {
  const normalizedStatus = (status || "").toLowerCase();
  const isComplete = [
    "received",
    "completed",
    "partially_received",
    "dispatched",
    "delivered",
    "closed",
  ].includes(normalizedStatus);

  if (isComplete) {
    return { bufferDays: null, health: "completed" };
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const vDate = vendorDeadline ? new Date(vendorDeadline) : null;
  const cDate = customerDeadline ? new Date(customerDeadline) : null;

  if (vDate && !isNaN(vDate.getTime())) vDate.setHours(0, 0, 0, 0);
  if (cDate && !isNaN(cDate.getTime())) cDate.setHours(0, 0, 0, 0);

  const validVDate = vDate && !isNaN(vDate.getTime()) ? vDate : null;
  const validCDate = cDate && !isNaN(cDate.getTime()) ? cDate : null;

  // Check if vendor deadline is already in the past
  if (validVDate && validVDate.getTime() < today.getTime()) {
    const buffer = validCDate
      ? Math.round((validCDate.getTime() - validVDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { bufferDays: buffer, health: "overdue" };
  }

  // If both vendor and customer deadlines exist, calculate buffer
  if (validVDate && validCDate) {
    const bufferDays = Math.round(
      (validCDate.getTime() - validVDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (bufferDays < 0) {
      // Vendor deadline is after customer deadline! High delivery risk
      return { bufferDays, health: "critical_delay" };
    }
    if (bufferDays <= 2) {
      // 0 to 2 days is a tight operational buffer
      return { bufferDays, health: "tight_buffer" };
    }
    return { bufferDays, health: "on_track" };
  }

  // If only customer deadline is present
  if (validCDate) {
    if (validCDate.getTime() < today.getTime()) {
      return { bufferDays: null, health: "overdue" };
    }
    const daysLeft = Math.round((validCDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      return { bufferDays: null, health: "tight_buffer" };
    }
    return { bufferDays: null, health: "on_track" };
  }

  return { bufferDays: null, health: "on_track" };
}

/**
 * Fetches the unified order pipeline combining Purchase Orders (vendor supply)
 * and Sales Orders (customer commitments).
 */
export async function listOrderPipeline(): Promise<OrderPipelineItem[]> {
  const db = getDb();

  // 1. Fetch Purchase Orders (which directly link vendors to customers/projects)
  const poPromise = db
    .from("purchase_orders")
    .select(
      `
      id, po_no, status, order_date, expected_date, vendor_delivery_date, customer_delivery_date, notes,
      vendor:vendors!purchase_orders_vendor_id_fkey(id, company_name, vendor_code, mobile_number, whatsapp_number),
      customer:customers!purchase_orders_customer_id_fkey(id, name, customer_code, primary_phone, whatsapp, external_ref),
      project:projects!purchase_orders_project_id_fkey(id, name, project_code)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  // 2. Fetch Active Sales Orders
  const soPromise = db
    .from("sales_orders")
    .select(
      `
      id, so_no, status, order_date, delivery_date, notes,
      customer:customers!sales_orders_customer_id_fkey(id, name, customer_code, primary_phone, whatsapp, external_ref),
      project:projects!sales_orders_project_id_fkey(id, name, project_code),
      items:sales_order_items(id, product_name, description, quantity, fulfilment)
    `,
    )
    .in("status", ["confirmed", "in_production", "ready", "shipped"])
    .order("created_at", { ascending: false })
    .limit(100);

  const [poResult, soResult] = await Promise.all([poPromise, soPromise]);

  const pipeline: OrderPipelineItem[] = [];
  const coveredSoNos = new Set<string>();

  // Process Purchase Orders
  if (poResult.data) {
    for (const po of poResult.data) {
      const rawCustomer = po.customer;
      const normCustomer = normalizeCustomerRow(rawCustomer);

      const vendorDeadline = po.vendor_delivery_date || po.expected_date || null;
      const customerDeadline = po.customer_delivery_date || null;
      const { bufferDays, health } = calculateDeadlineHealth(
        vendorDeadline,
        customerDeadline,
        po.status,
      );

      const vendorPhone = po.vendor?.mobile_number ?? po.vendor?.whatsapp_number ?? null;

      pipeline.push({
        id: `po-${po.id}`,
        orderType: "po",
        orderNo: po.po_no || `PO-${po.id.slice(0, 8)}`,
        orderId: po.id,
        orderDate: po.order_date,

        customerId: rawCustomer?.id ?? null,
        customerName: normCustomer.name || "General Stock / Unassigned",
        customerCode: normCustomer.customer_code || null,
        contactPerson: normCustomer.contact_person || null,
        firmName: normCustomer.company_name || null,
        customerPhone: normCustomer.primary_phone || normCustomer.whatsapp || null,

        vendorId: po.vendor?.id ?? null,
        vendorName: po.vendor?.company_name ?? "Unassigned Vendor",
        vendorCode: po.vendor?.vendor_code ?? null,
        vendorPhone,

        vendorDeadline,
        customerDeadline,
        bufferDays,
        health,

        status: po.status,
        notes: po.notes,
        projectCode: po.project?.project_code ?? null,
        projectName: po.project?.name ?? null,
      });
    }
  }

  // Process Sales Orders (especially those with assigned fabricators or awaiting production)
  if (soResult.data) {
    for (const so of soResult.data) {
      coveredSoNos.add(so.so_no);
      const rawCustomer = so.customer;
      const normCustomer = normalizeCustomerRow(rawCustomer);
      const items = (so.items || []) as Array<{
        id: string;
        product_name?: string | null;
        description?: string | null;
        fulfilment?: string | null;
      }>;

      // Check if any items have assigned vendors
      const assignedItems = items
        .map((item) => ({
          item,
          assignment: parseItemVendorAssignment(item.fulfilment),
        }))
        .filter((entry) => entry.assignment !== null);

      if (assignedItems.length > 0) {
        for (const { item, assignment } of assignedItems) {
          if (!assignment) continue;
          const vendorDeadline = so.delivery_date ? so.delivery_date : null;
          const customerDeadline = so.delivery_date ? so.delivery_date : null;
          const { bufferDays, health } = calculateDeadlineHealth(
            vendorDeadline,
            customerDeadline,
            assignment.production_status,
          );

          pipeline.push({
            id: `so-item-${item.id}`,
            orderType: "so",
            orderNo: `${so.so_no} · ${item.product_name || "Custom Stone"}`,
            orderId: so.id,
            orderDate: so.order_date,

            customerId: rawCustomer?.id ?? null,
            customerName: normCustomer.name || "Client Order",
            customerCode: normCustomer.customer_code || null,
            contactPerson: normCustomer.contact_person || null,
            firmName: normCustomer.company_name || null,
            customerPhone: normCustomer.primary_phone || normCustomer.whatsapp || null,

            vendorId: assignment.vendor_id,
            vendorName: assignment.vendor_name,
            vendorPhone: assignment.vendor_phone,

            itemDescription: item.description || item.product_name,
            vendorDeadline,
            customerDeadline,
            bufferDays,
            health,

            status: assignment.production_status.replace("_", " "),
            notes: assignment.manufacturer_notes || so.notes,
            projectCode: so.project?.project_code ?? null,
            projectName: so.project?.name ?? null,
          });
        }
      } else {
        // Active sales order awaiting vendor placement
        const customerDeadline = so.delivery_date || null;
        const { bufferDays, health } = calculateDeadlineHealth(null, customerDeadline, so.status);

        pipeline.push({
          id: `so-${so.id}`,
          orderType: "so",
          orderNo: so.so_no,
          orderId: so.id,
          orderDate: so.order_date,

          customerId: rawCustomer?.id ?? null,
          customerName: normCustomer.name || "Client Order",
          customerCode: normCustomer.customer_code || null,
          contactPerson: normCustomer.contact_person || null,
          firmName: normCustomer.company_name || null,
          customerPhone: normCustomer.primary_phone || normCustomer.whatsapp || null,

          vendorId: null,
          vendorName: "Pending Vendor Assignment",
          vendorCode: null,
          vendorPhone: null,

          vendorDeadline: null,
          customerDeadline,
          bufferDays,
          health,

          status: so.status.replace("_", " "),
          notes: so.notes,
          projectCode: so.project?.project_code ?? null,
          projectName: so.project?.name ?? null,
        });
      }
    }
  }

  // Sort by urgency:
  // 1. overdue
  // 2. critical_delay
  // 3. tight_buffer
  // 4. on_track
  // 5. completed
  const healthWeight: Record<DeadlineHealth, number> = {
    overdue: 0,
    critical_delay: 1,
    tight_buffer: 2,
    on_track: 3,
    completed: 4,
  };

  return pipeline.sort((a, b) => {
    const diffHealth = healthWeight[a.health] - healthWeight[b.health];
    if (diffHealth !== 0) return diffHealth;
    if (a.bufferDays !== null && b.bufferDays !== null) {
      return a.bufferDays - b.bufferDays;
    }
    return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
  });
}
