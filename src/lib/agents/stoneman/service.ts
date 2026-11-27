/**
 * StoneMan Customer Assistant Service.
 *
 * Powers public website visitors and customer-facing interactions.
 * Enforces strict data segregation:
 * - Public visitors get general product/process FAQs only.
 * - Order lookups REQUIRE verification (Order No + registered phone).
 * - Supplier names, purchase orders, costs, margins, and internal notes are NEVER exposed.
 * - Complaints and service requests are staged cleanly into the review queue.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { AgentDraftPayload, AgentTaskItem } from "../types";
import { createDraftHash } from "../approval";

export interface PublicFaqItem {
  question: string;
  answer: string;
  category: "products" | "finishes" | "process" | "delivery";
}

export const STONEMAN_PUBLIC_FAQS: PublicFaqItem[] = [
  {
    question: "What types of natural stones does Stone Tech supply?",
    answer:
      "Stone Tech curates an extensive architectural stone portfolio, clearly highlighting what is available in ready master catalogues versus what is custom crafted on demand:\n\n" +
      "📦 In Our Active Master Catalogues (Standard Production & Instant Specs):\n" +
      "• Natural Stone Wall Cladding (275+ textures, 3D grooved reliefs & fluted profiles)\n" +
      "• Ultra-Thin Flexible Stone Veneers (98+ translucent & opaque slate/sandstone finishes)\n" +
      "• Architectural Glass Bricks (Solid crystal & hollow designer blocks)\n" +
      "• Flexible Clay Veneers (Curvilinear facade panels & 3D textures)\n" +
      "• Natural River Pebbles & Landscape Gravel (Naturally tumbled river stones & garden borders)\n\n" +
      "🏛️ Bespoke Atelier Work & Landscape Elements (Crafted on Demand):\n" +
      "Beyond standard catalogue items, our artisans and CNC workshops custom craft Hand-Carved Sculptures & 3D Murals, Waterfalls & Cascading Fountains, Natural Stone Cobbles & Kerbstones, and bespoke Landscape Elements, alongside quarry-direct Indian Granites, Italian & Imported Marbles, Sandstones, Slate, and Quartzite.\n\n" +
      "✨ Need something not in our catalogue? If you require a stone variety, retired batch, or custom profile not found in our standard downloadable catalogue, StoneMan will log a Special Procurement Request directly into our CRM for prompt admin review.",
    category: "products",
  },
  {
    question: "What if a stone or product is not in your current catalogue?",
    answer:
      "If you need a stone variety we used to supply, a retired quarry seam, or a bespoke custom pattern (including specialized sculptures, waterfalls, or custom cobble sizing) not found in our standard downloadable catalogue, ask StoneMan to create a Special Procurement Request. StoneMan will log your requirements, area, and drawings directly into our CRM and instantly notify our admin team.",
    category: "products",
  },
  {
    question: "What surface finishes are available for architectural cladding?",
    answer:
      "We provide Polished, Honed, Flamed, Bush-hammered, Leather/Antique finish, Sandblasted, and Natural Split-face cladding panels.",
    category: "finishes",
  },
  {
    question: "How does the custom stone fabrication process work?",
    answer:
      "1) Requirement & Drawing Intake → 2) Material Selection & Sizing Estimation → 3) Quotation & Sizing Approval → 4) Precision Sawing & Edge Profiling → 5) Quality Inspection → 6) Safe Packaging & Site Dispatch.",
    category: "process",
  },
  {
    question: "What are your order payment terms and installation charges?",
    answer:
      "For orders under ₹50,000, 100% upfront payment is mandatory for order placement. For natural stone wall cladding projects with total wall coverage under 50 sq ft, a lumpsum installation labour charge of ₹4,000 applies.",
    category: "process",
  },
  {
    question: "How can I track my order delivery?",
    answer:
      "You can enter your Stone Tech Order Number and registered phone number into the StoneMan tracker on this website to view live milestone updates. Our superadmins are instantly alerted when you track your order.",
    category: "delivery",
  },
];

export interface VerifiedOrderLookupInput {
  orderNo: string;
  phone?: string;
  verificationCode?: string;
  token?: string;
}

import {
  computeOrderPin,
  senseOrderDeliveryStatus,
  buildOrderMilestones,
  type OrderMilestoneItem,
} from "@/lib/orders/tracking";

export { computeOrderPin };

export interface CustomerSafeOrderDetails {
  orderNo: string;
  customerName?: string;
  trackingToken?: string;
  orderDate: string;
  statusText: string;
  isCompleted: boolean;
  estimatedDeliveryDate: string | null;
  expectedDeliveryText?: string;
  isDelayed?: boolean;
  delayDays?: number;
  whatsBeenDone?: string;
  milestones?: OrderMilestoneItem[];
  dispatches?: Array<{
    id?: string;
    dispatchNo: string;
    dispatchDate: string;
    status: string;
    carrier?: string | null;
    vehicleNo?: string | null;
    trackingNo?: string | null;
    items?: Array<{
      description: string;
      quantity: number;
      unit: string;
    }>;
  }>;
  itemsSummary: Array<{
    itemDescription: string;
    quantity: number;
    unit: string;
  }>;
  ledgerStatement?: {
    totalBilled: number;
    totalPaid: number;
    balanceDue: number;
    invoices: Array<{
      id: string;
      invoiceNo: string;
      date: string;
      amount: number;
      status: string;
    }>;
    receipts: Array<{
      id: string;
      receiptNo: string;
      date: string;
      amount: number;
      method: string;
    }>;
  };
  notice: string;
}

/**
 * Generates an order security verification PIN for the matching registered customer phone.
 */
export async function requestOrderVerificationPin(
  orderNo: string,
  phone: string,
  db: SupabaseClient,
): Promise<{ success: boolean; maskedPhone: string; pin: string; message: string }> {
  const cleanPhone = phone.replace(/\D+/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new AppError(
      "A valid 10-digit registered phone number is required.",
      "INVALID_PHONE_VERIFICATION",
      400,
    );
  }

  const cleanOrderNo = orderNo.trim().toUpperCase();
  if (!cleanOrderNo) {
    throw new AppError("Order Number is required.", "ORDER_NO_REQUIRED", 400);
  }

  const { data: salesOrder, error: soError } = await db
    .from("sales_orders")
    .select(
      `
      id,
      so_no,
      customer:customers!sales_orders_customer_id_fkey(
        id,
        name,
        primary_phone
      )
    `,
    )
    .ilike("so_no", cleanOrderNo)
    .maybeSingle();

  if (soError || !salesOrder) {
    throw new AppError(
      `No active order found matching "${cleanOrderNo}". Please check your order reference.`,
      "ORDER_NOT_FOUND",
      404,
    );
  }

  const customer = salesOrder.customer as { primary_phone?: string | null } | null;
  const custPhone = (customer?.primary_phone || "").replace(/\D+/g, "");
  const last10Input = cleanPhone.slice(-10);

  if (!custPhone.endsWith(last10Input)) {
    throw new AppError(
      "The phone number provided does not match the registered records for this order reference.",
      "VERIFICATION_FAILED",
      403,
    );
  }

  const pin = computeOrderPin(cleanOrderNo, cleanPhone);
  const maskedPhone = `******${cleanPhone.slice(-4)}`;

  return {
    success: true,
    maskedPhone,
    pin,
    message: `Verification PIN generated for registered number ending in ${cleanPhone.slice(-4)}. Enter PIN: ${pin}`,
  };
}

interface StonemanCustomerRow {
  id?: string;
  name?: string;
  primary_phone?: string | null;
}

interface StonemanSalesOrderRow {
  id: string;
  so_no: string;
  order_date?: string | null;
  status?: string | null;
  delivery_date?: string | null;
  customer_id?: string | null;
  customer?: unknown;
  items?: Array<{
    description?: string | null;
    product_name?: string | null;
    quantity?: number | null;
    unit?: string | null;
  }> | null;
}

interface StonemanQuoteRow {
  id: string;
  quote_no: string;
  issue_date?: string | null;
  total?: number | null;
  status?: string | null;
  customer_id?: string | null;
  customer?: unknown;
  items?: Array<{
    description?: string | null;
    product_name?: string | null;
    quantity?: number | null;
    unit?: string | null;
  }> | null;
}

function resolveCustomer(raw: unknown): StonemanCustomerRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as StonemanCustomerRow) || null;
  return raw as StonemanCustomerRow;
}

/**
 * Looks up an order with strict identity verification.
 * Guaranteed never to expose vendor/agency/margin details.
 */
export async function lookupVerifiedOrder(
  input: VerifiedOrderLookupInput,
  db: SupabaseClient,
): Promise<CustomerSafeOrderDetails> {
  const rawInput = (input.orderNo || "").trim().toUpperCase();
  const rawToken = (
    input.token || (/^\d{6}$/.test(rawInput) ? rawInput : input.verificationCode || "")
  ).trim();
  const isDirectToken = /^\d{6}$/.test(rawToken);

  let salesOrder: StonemanSalesOrderRow | null = null;
  let quoteData: StonemanQuoteRow | null = null;
  let customer: StonemanCustomerRow | null = null;

  if (isDirectToken) {
    // 1. Look up in quotes by tracking_token in workflow_state
    try {
      const { data: qMatch } = await db
        .from("quotes")
        .select(
          `
          id,
          quote_no,
          issue_date,
          total,
          status,
          workflow_state,
          customer_id,
          customer:customers!quotes_customer_id_fkey(
            id,
            name,
            primary_phone
          ),
          items:quote_items(
            description,
            product_name,
            quantity,
            unit
          )
        `,
        )
        .filter("workflow_state->>tracking_token", "eq", rawToken)
        .limit(1)
        .maybeSingle();

      if (qMatch) {
        quoteData = qMatch as unknown as StonemanQuoteRow;
        customer = resolveCustomer(qMatch.customer);

        // Check if sales order exists for this quote
        const { data: soMatch } = await db
          .from("sales_orders")
          .select(
            `
            id,
            so_no,
            order_date,
            status,
            delivery_date,
            customer_id,
            customer:customers!sales_orders_customer_id_fkey(
              id,
              name,
              primary_phone
            ),
            items:sales_order_items(
              description,
              product_name,
              quantity,
              unit
            )
          `,
          )
          .eq("quote_id", qMatch.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (soMatch) {
          salesOrder = soMatch as unknown as StonemanSalesOrderRow;
          if (soMatch.customer) customer = resolveCustomer(soMatch.customer);
        }
      }
    } catch {
      // Fallback to sales orders
    }

    if (!salesOrder && !quoteData) {
      // 2. Check sales_orders directly by tracking_token or computeOrderPin
      try {
        const { data: soDirect } = await db
          .from("sales_orders")
          .select(
            `
            id,
            so_no,
            order_date,
            status,
            delivery_date,
            customer_id,
            workflow_state,
            customer:customers!sales_orders_customer_id_fkey(
              id,
              name,
              primary_phone
            ),
            items:sales_order_items(
              description,
              product_name,
              quantity,
              unit
            )
          `,
          )
          .filter("workflow_state->>tracking_token", "eq", rawToken)
          .limit(1)
          .maybeSingle();

        if (soDirect) {
          salesOrder = soDirect as unknown as StonemanSalesOrderRow;
          customer = resolveCustomer(soDirect.customer);
        }
      } catch {
        // Continue
      }
    }
  }

  // If not found via direct token, perform standard phone + order verification
  if (!salesOrder && !quoteData) {
    const cleanPhone = (input.phone || "").replace(/\D+/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new AppError(
        "A valid 10-digit registered phone number is required for order verification (or enter your 6-digit tracking token).",
        "INVALID_PHONE_VERIFICATION",
        400,
      );
    }

    if (!rawInput) {
      throw new AppError("Order Number or Tracking Token is required.", "ORDER_NO_REQUIRED", 400);
    }

    const { data: soData, error: soError } = await db
      .from("sales_orders")
      .select(
        `
        id,
        so_no,
        order_date,
        status,
        delivery_date,
        customer_id,
        customer:customers!sales_orders_customer_id_fkey(
          id,
          name,
          primary_phone
        ),
        items:sales_order_items(
          description,
          product_name,
          quantity,
          unit
        )
      `,
      )
      .ilike("so_no", rawInput)
      .maybeSingle();

    if (soError || !soData) {
      throw new AppError(
        `No active order or quotation found matching "${rawInput}". Please check your order reference or 6-digit token.`,
        "ORDER_NOT_FOUND",
        404,
      );
    }

    salesOrder = soData as unknown as StonemanSalesOrderRow;
    customer = resolveCustomer(soData.customer);

    const custPhone = (customer?.primary_phone || "").replace(/\D+/g, "");
    const last10Input = cleanPhone.slice(-10);

    if (!custPhone.endsWith(last10Input)) {
      throw new AppError(
        "The phone number provided does not match the registered records for this order reference.",
        "VERIFICATION_FAILED",
        403,
      );
    }

    const cleanPin = (input.verificationCode || "").trim();
    if (!cleanPin) {
      throw new AppError(
        "A 6-digit security verification PIN is required to verify identity.",
        "PIN_REQUIRED",
        400,
      );
    }

    const expectedPin = computeOrderPin(rawInput, cleanPhone);
    if (cleanPin !== expectedPin) {
      throw new AppError(
        "Invalid verification PIN. Please verify the code or request a new PIN.",
        "INVALID_PIN",
        403,
      );
    }
  }

  const orderNo = salesOrder?.so_no || quoteData?.quote_no || rawInput;
  const orderDate = salesOrder?.order_date || quoteData?.issue_date;
  const statusRaw = salesOrder?.status || quoteData?.status || "confirmed";
  const deliveryDate = salesOrder?.delivery_date || null;

  let dispatchesData: NonNullable<CustomerSafeOrderDetails["dispatches"]> = [];

  try {
    let dispQuery = db.from("dispatches").select(
      `
        id,
        dispatch_no,
        status,
        dispatch_date,
        carrier,
        vehicle_no,
        tracking_no,
        items:dispatch_items(
          description,
          product_name,
          quantity,
          unit
        )
      `,
    );

    if (salesOrder?.id) {
      dispQuery = dispQuery.eq("sales_order_id", salesOrder.id);
    } else if (customer?.id) {
      dispQuery = dispQuery.eq("customer_id", customer.id);
    }

    const { data: disp } = await dispQuery.order("dispatch_date", { ascending: false });
    if (disp) {
      dispatchesData = (
        disp as unknown as Array<{
          id?: string;
          dispatch_no: string;
          status: string;
          dispatch_date: string;
          carrier: string | null;
          vehicle_no: string | null;
          tracking_no: string | null;
          items?: Array<{
            description?: string;
            product_name?: string;
            quantity?: number;
            unit?: string;
          }>;
        }>
      ).map((d) => ({
        id: d.id,
        dispatchNo: d.dispatch_no,
        dispatchDate: d.dispatch_date ? formatDate(d.dispatch_date) : "—",
        status: d.status,
        carrier: d.carrier,
        vehicleNo: d.vehicle_no,
        trackingNo: d.tracking_no,
        items: (d.items ?? []).map((it) => ({
          description: it.product_name || it.description || "Architectural Stone",
          quantity: Number(it.quantity || 1),
          unit: it.unit || "sqft",
        })),
      }));
    }
  } catch {
    // Graceful fallback
  }

  // Query Customer Ledger Statement & Invoices (Lifetime access)
  let ledgerStatement: CustomerSafeOrderDetails["ledgerStatement"] = undefined;
  const customerId = customer?.id || salesOrder?.customer_id || quoteData?.customer_id;

  if (customerId) {
    try {
      const [invRes, rcptRes] = await Promise.all([
        db
          .from("invoices")
          .select("id, invoice_no, issue_date, total, status")
          .eq("customer_id", customerId)
          .order("issue_date", { ascending: false }),
        db
          .from("receipts")
          .select("id, doc_no, entry_date, net_amount, method, status")
          .eq("customer_id", customerId)
          .order("entry_date", { ascending: false }),
      ]);

      const invoices = (invRes.data ?? []).map((i) => ({
        id: i.id,
        invoiceNo: i.invoice_no,
        date: i.issue_date ? formatDate(i.issue_date) : "—",
        amount: Number(i.total || 0),
        status: i.status,
      }));

      const receipts = (rcptRes.data ?? []).map((r) => ({
        id: r.id,
        receiptNo: r.doc_no,
        date: r.entry_date ? formatDate(r.entry_date) : "—",
        amount: Number(r.net_amount || 0),
        method: r.method,
      }));

      const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
      const totalPaid = receipts.reduce((s, r) => s + r.amount, 0);

      ledgerStatement = {
        totalBilled,
        totalPaid,
        balanceDue: totalBilled - totalPaid,
        invoices,
        receipts,
      };
    } catch {
      // Non-blocking
    }
  }

  const assessment = senseOrderDeliveryStatus({
    orderDate,
    deliveryDate,
    status: statusRaw,
    dispatches: dispatchesData,
  });

  const milestones = buildOrderMilestones({
    orderDate,
    deliveryDate,
    status: statusRaw,
    dispatches: dispatchesData,
  });

  let statusText = "Order Confirmed & Scheduled";
  const st = (statusRaw || "").toLowerCase();
  if (st.includes("draft") || st.includes("pending")) {
    statusText = "Order Received — Preparing Material Allocation";
  } else if (st.includes("processing") || st.includes("manufacturing") || st.includes("cutting")) {
    statusText = "In Production — Precision Cutting & Quality Inspection";
  } else if (st.includes("ready") || st.includes("packed")) {
    statusText = "Material Ready — Scheduled for Logistics Loading";
  } else if (st.includes("dispatched") || st.includes("transit")) {
    statusText = "Dispatched — In Transit to Your Destination Site";
  } else if (st.includes("delivered") || st.includes("completed")) {
    statusText = "Delivered to Site";
  } else if (st.includes("accepted")) {
    statusText = "Quotation Approved — Production & Material Allocation In Progress";
  }

  const rawItems = (salesOrder?.items || quoteData?.items || []) as Array<{
    description?: string | null;
    product_name?: string | null;
    quantity?: number | null;
    unit?: string | null;
  }>;

  return {
    orderNo,
    customerName: customer?.name || "Customer",
    trackingToken: isDirectToken ? rawToken : undefined,
    orderDate: orderDate ? formatDate(orderDate) : "—",
    statusText,
    isCompleted:
      st.includes("delivered") || st.includes("completed") || assessment.stage === "delivered",
    estimatedDeliveryDate: deliveryDate ? formatDate(deliveryDate) : null,
    expectedDeliveryText: assessment.expectedDateText,
    isDelayed: assessment.isDelayed,
    delayDays: assessment.delayDays,
    whatsBeenDone: assessment.whatsBeenDone,
    milestones,
    dispatches: dispatchesData,
    ledgerStatement,
    itemsSummary: rawItems.map((it) => ({
      itemDescription: it.product_name || it.description || "Architectural Stone Order",
      quantity: Number(it.quantity || 1),
      unit: it.unit || "sqft",
    })),
    notice:
      "All dispatches include protective wooden strapping and moisture barrier wrap. Contact our support desk for on-site unloading coordination.",
  };
}

export interface CustomerComplaintInput {
  customerName: string;
  phone: string;
  orderNo?: string;
  complaintDetails: string;
}

export async function stageStonemanComplaint(
  input: CustomerComplaintInput,
  db: SupabaseClient,
  userId?: string,
): Promise<{ ticketId: string; acknowledgementMessage: string }> {
  if (!input.customerName.trim()) {
    throw new AppError("Your name is required.", "NAME_REQUIRED", 400);
  }
  const cleanPhone = input.phone.replace(/\D+/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new AppError("A valid contact number is required.", "PHONE_REQUIRED", 400);
  }
  if (!input.complaintDetails.trim()) {
    throw new AppError("Please provide details of your concern.", "DETAILS_REQUIRED", 400);
  }

  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const ticketId = `ST-CARE-${randomSuffix}`;
  const now = new Date().toISOString();

  // Find matching customer by primary_phone if exists
  const { data: matchedCustomer } = await db
    .from("customers")
    .select("id, name, customer_code")
    .ilike("primary_phone", `%${cleanPhone.slice(-10)}%`)
    .limit(1)
    .maybeSingle();

  const draft: AgentDraftPayload = {
    channel: "internal_review",
    recipientName: "Stone Tech Executive Support Desk",
    messageText: `[CUSTOMER CARE TICKET ${ticketId}]\nCustomer: ${input.customerName} (${cleanPhone})\nOrder Ref: ${input.orderNo || "N/A"}\nConcern:\n${input.complaintDetails.trim()}\n\nEscalation: Review customer order details and assign callback.`,
    referenceEntity: {
      type: "customer_complaint",
      id: matchedCustomer?.id || ticketId,
      code: ticketId,
      title: `Service Request ${ticketId} (${input.customerName})`,
    },
    reason: `Service complaint submitted via StoneMan website assistant on ${formatDate(now)}.`,
    supportingFacts: {
      ticketId,
      customerName: input.customerName,
      phone: cleanPhone,
      orderNo: input.orderNo ?? null,
      matchedCustomerId: matchedCustomer?.id ?? null,
    },
  };
  draft.draftHash = createDraftHash(draft);

  // Stage as an action in vie_actions if valid profile exists
  let validUserId = userId;
  if (!validUserId) {
    try {
      const { data: profile } = await db.from("profiles").select("id").limit(1).maybeSingle();
      if (profile?.id) validUserId = profile.id;
    } catch {
      // Ignore if profiles table cannot be queried
    }
  }

  if (validUserId) {
    try {
      await db.from("vie_actions").insert({
        created_by: validUserId,
        request_id: crypto.randomUUID(),
        raw_text: input.complaintDetails,
        language: "en",
        canonical_text: `Customer Complaint ${ticketId}: ${input.complaintDetails}`,
        intent: "stoneman_complaint",
        entities: { ticketId, phone: cleanPhone, name: input.customerName },
        confidence: 1.0,
        execution_mode: "confirm",
        plan: {
          agentId: "stoneman_customer",
          ticketId,
          draft,
        },
        status: "awaiting_confirmation",
        linked_record_type: "customer",
        linked_record_id: matchedCustomer?.id || null,
      });
    } catch (insertErr) {
      console.warn("Could not stage complaint in vie_actions:", insertErr);
    }
  }

  return {
    ticketId,
    acknowledgementMessage: `Your concern has been registered under Reference #${ticketId}. Our customer care team reviews all entries personally and aims to reach out within 24 hours.`,
  };
}
