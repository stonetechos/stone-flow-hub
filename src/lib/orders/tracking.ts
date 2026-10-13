/**
 * Customer Order Tracking, Delay Sensing & WhatsApp Status Dispatch.
 *
 * Implements:
 * 1. Deterministic PIN generation & Public Tracking URL generation.
 * 2. Delay Sensing: Compares promised delivery date against current stage and calendar date.
 * 3. Milestone stage mapping ("What's been done yet"):
 *    Confirmed -> Fabrication -> Quality & Crating -> Dispatched -> Delivered.
 * 4. Contextual WhatsApp message generation for On-Time vs Delayed vs Dispatched orders.
 */

import { formatDate } from "@/lib/format";

/**
 * Computes a deterministic 6-digit security verification PIN based on order reference and registered phone.
 */
export function computeOrderPin(orderNo: string, phone: string): string {
  const cleanOrder = orderNo.trim().toUpperCase();
  const cleanPhone = phone.replace(/\D+/g, "").slice(-10);
  let hash = 0x811c9dc5;
  const str = `${cleanOrder}:${cleanPhone}:stoneman-secret-salt-2026`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const pinNum = (Math.abs(hash) % 900000) + 100000;
  return String(pinNum);
}

export type OrderProgressStage = "confirmed" | "production" | "ready" | "dispatched" | "delivered";

export interface OrderMilestoneItem {
  key: OrderProgressStage;
  label: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  completedAt?: string | null;
}

export interface OrderDelayAssessment {
  stage: OrderProgressStage;
  stageLabel: string;
  whatsBeenDone: string;
  isDelayed: boolean;
  delayDays: number;
  expectedDateText: string;
  deliveryDate: string | null;
  summaryBadge: "on_time" | "delayed" | "completed";
}

export interface DispatchSummaryInfo {
  dispatchNo: string;
  dispatchDate: string;
  status: string;
  carrier?: string | null;
  vehicleNo?: string | null;
  trackingNo?: string | null;
}

/**
 * Standard Customer-Facing Milestones for Stone Fabrication & Delivery.
 */
export const STANDARD_ORDER_MILESTONES: Array<{
  key: OrderProgressStage;
  label: string;
  description: string;
}> = [
  {
    key: "confirmed",
    label: "Order Confirmed",
    description: "Drawings verified, specifications approved & stone slabs allocated",
  },
  {
    key: "production",
    label: "Fabrication & Sizing",
    description: "Precision gangsaw cutting, edge profiling & surface finishing",
  },
  {
    key: "ready",
    label: "Quality & Crating",
    description: "Tolerance check, polishing inspection & protective wooden strapped crating",
  },
  {
    key: "dispatched",
    label: "Dispatched for Delivery",
    description: "Loaded onto carrier transport with delivery challan",
  },
  {
    key: "delivered",
    label: "Delivered to Site",
    description: "Safely received at customer project destination",
  },
];

/**
 * Resolves current stage from internal order status and linked dispatches.
 */
export function resolveOrderStage(
  orderStatus?: string | null,
  dispatches?: Array<{ status?: string | null }>,
): OrderProgressStage {
  const st = (orderStatus || "").toLowerCase();

  // Check if any dispatch is delivered
  const hasDeliveredDispatch = dispatches?.some(
    (d) => (d.status || "").toLowerCase() === "delivered",
  );
  if (st.includes("delivered") || st.includes("completed") || hasDeliveredDispatch) {
    return "delivered";
  }

  // Check if any dispatch is in transit or dispatched
  const hasInTransitDispatch = dispatches?.some(
    (d) =>
      (d.status || "").toLowerCase() === "in_transit" ||
      (d.status || "").toLowerCase() === "dispatched",
  );
  if (st.includes("dispatched") || st.includes("transit") || hasInTransitDispatch) {
    return "dispatched";
  }

  // Check if any dispatch was created (planned/loaded) or order is packed/ready
  const hasDispatchRecord = Boolean(dispatches && dispatches.length > 0);
  if (st.includes("ready") || st.includes("packed") || hasDispatchRecord) {
    return "ready";
  }

  if (
    st.includes("processing") ||
    st.includes("manufacturing") ||
    st.includes("cutting") ||
    st.includes("in_production")
  ) {
    return "production";
  }

  return "confirmed";
}

/**
 * Senses whether an order is delayed, on-time, or delivered.
 * Compares current date with promised delivery date.
 */
export function senseOrderDeliveryStatus(params: {
  orderDate?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
  dispatches?: Array<{ status?: string | null; dispatch_date?: string | null }>;
  currentDate?: Date;
}): OrderDelayAssessment {
  const stage = resolveOrderStage(params.status, params.dispatches);
  const now = params.currentDate ?? new Date();
  const deliveryDateStr = params.deliveryDate?.trim() || null;

  let isDelayed = false;
  let delayDays = 0;
  let expectedDateText = deliveryDateStr ? formatDate(deliveryDateStr) : "To be scheduled";

  if (stage === "delivered") {
    return {
      stage,
      stageLabel: "Delivered to Site",
      whatsBeenDone:
        "All stone materials have been precision-cut, quality-checked, and safely delivered to your project destination.",
      isDelayed: false,
      delayDays: 0,
      expectedDateText: deliveryDateStr
        ? `Delivered · ${formatDate(deliveryDateStr)}`
        : "Delivered",
      deliveryDate: deliveryDateStr,
      summaryBadge: "completed",
    };
  }

  if (deliveryDateStr) {
    const targetDate = new Date(`${deliveryDateStr}T23:59:59`);
    if (!isNaN(targetDate.getTime())) {
      const diffMs = now.getTime() - targetDate.getTime();
      if (diffMs > 0) {
        isDelayed = true;
        delayDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }
  }

  let whatsBeenDone = "";
  let stageLabel = "";

  switch (stage) {
    case "dispatched":
      stageLabel = "Dispatched & In Transit";
      whatsBeenDone =
        "Materials precision-fabricated, inspected, strapped in protective crating, and currently in transit with delivery carrier.";
      break;
    case "ready":
      stageLabel = "Quality Verified & Packed";
      whatsBeenDone =
        "Stone precision cutting and surface finishing completed. Order packed in protective wooden strapping ready for carrier dispatch.";
      break;
    case "production":
      stageLabel = "In Production & Sizing";
      whatsBeenDone =
        "Raw stone blocks sawn. Precision sizing, edge profiling, and surface polishing actively underway in our factory.";
      break;
    case "confirmed":
    default:
      stageLabel = "Order Confirmed & Allocated";
      whatsBeenDone =
        "Order drawings and measurements confirmed. Premium natural stone slabs allocated and scheduled for fabrication.";
      break;
  }

  if (isDelayed) {
    expectedDateText = deliveryDateStr
      ? `Schedule revision in progress (Original promise: ${formatDate(deliveryDateStr)} · ${delayDays}d elapsed)`
      : "Schedule revision in progress";
  } else if (deliveryDateStr) {
    expectedDateText = `Expected to arrive on time: ${formatDate(deliveryDateStr)}`;
  }

  return {
    stage,
    stageLabel,
    whatsBeenDone,
    isDelayed,
    delayDays,
    expectedDateText,
    deliveryDate: deliveryDateStr,
    summaryBadge: isDelayed ? "delayed" : "on_time",
  };
}

/**
 * Builds the list of 5 progress milestones with active/completed states.
 */
export function buildOrderMilestones(params: {
  orderDate?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
  dispatches?: Array<{ status?: string | null; dispatch_date?: string | null }>;
}): OrderMilestoneItem[] {
  const currentStage = resolveOrderStage(params.status, params.dispatches);
  const stageOrder: OrderProgressStage[] = [
    "confirmed",
    "production",
    "ready",
    "dispatched",
    "delivered",
  ];
  const currentIndex = stageOrder.indexOf(currentStage);

  return STANDARD_ORDER_MILESTONES.map((m, idx) => {
    let milestoneStatus: OrderMilestoneItem["status"] = "upcoming";
    if (idx < currentIndex) {
      milestoneStatus = "completed";
    } else if (idx === currentIndex) {
      milestoneStatus = currentStage === "delivered" ? "completed" : "current";
    }

    let completedAt: string | null = null;
    if (m.key === "confirmed" && params.orderDate) {
      completedAt = formatDate(params.orderDate);
    } else if (m.key === "dispatched" && params.dispatches?.[0]?.dispatch_date) {
      completedAt = formatDate(params.dispatches[0].dispatch_date);
    }

    return {
      key: m.key,
      label: m.label,
      description: m.description,
      status: milestoneStatus,
      completedAt,
    };
  });
}

/**
 * Generates the public customer tracking URL.
 * Automatically appends registered phone (last 10 digits) and security PIN
 * so customer can open the link in 1 tap without manual OTP entry.
 */
export function buildOrderTrackingUrl(params: {
  orderNo: string;
  phone?: string | null;
  origin?: string;
}): string {
  const cleanOrder = params.orderNo.trim().toUpperCase();
  const rawPhone = (params.phone || "").replace(/\D+/g, "").slice(-10);
  const base =
    params.origin ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://stonetech.in");

  if (!rawPhone || rawPhone.length < 10) {
    return `${base}/track/${encodeURIComponent(cleanOrder)}`;
  }

  const pin = computeOrderPin(cleanOrder, rawPhone);
  return `${base}/track/${encodeURIComponent(cleanOrder)}?phone=${encodeURIComponent(rawPhone)}&pin=${encodeURIComponent(pin)}`;
}

export interface GenerateWhatsappMessageInput {
  customerName?: string | null;
  customerPhone?: string | null;
  orderNo: string;
  orderDate?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
  dispatches?: Array<{
    dispatch_no?: string | null;
    status?: string | null;
    dispatch_date?: string | null;
    carrier?: string | null;
    vehicle_no?: string | null;
  }>;
  itemsSummary?: Array<{
    itemDescription: string;
    quantity: number;
    unit: string;
  }>;
  origin?: string;
}

export interface GenerateWhatsappMessageResult {
  messageText: string;
  trackingUrl: string;
  trackingPin: string;
  assessment: OrderDelayAssessment;
  normalizedPhone: string;
}

/**
 * Crafts an AI-tuned WhatsApp status update according to whether the order is
 * on-time, delayed, dispatched, or delivered.
 */
export function generateOrderTrackingWhatsappMessage(
  input: GenerateWhatsappMessageInput,
): GenerateWhatsappMessageResult {
  const cleanPhone = (input.customerPhone || "").replace(/\D+/g, "").slice(-10);
  const cleanOrder = input.orderNo.trim().toUpperCase();
  const customerName = input.customerName?.trim() || "Customer";
  const pin = cleanPhone.length >= 10 ? computeOrderPin(cleanOrder, cleanPhone) : "";
  const trackingUrl = buildOrderTrackingUrl({
    orderNo: cleanOrder,
    phone: cleanPhone,
    origin: input.origin,
  });

  const assessment = senseOrderDeliveryStatus({
    orderDate: input.orderDate,
    deliveryDate: input.deliveryDate,
    status: input.status,
    dispatches: input.dispatches,
  });

  const formattedDate = assessment.deliveryDate ? formatDate(assessment.deliveryDate) : null;
  let messageText = "";

  if (assessment.stage === "delivered") {
    const dispatchRef = input.dispatches?.[0]?.dispatch_no;
    messageText = [
      `Namaste ${customerName}, greetings from Stone Tech! 🪨`,
      "",
      `Your stone order *${cleanOrder}* has been successfully delivered to your site. 🏡`,
      "",
      `• Status: *Delivered & Completed* ✅`,
      dispatchRef ? `• Delivery Challan: *${dispatchRef}*` : null,
      formattedDate ? `• Delivered On: *${formattedDate}*` : null,
      "",
      `View your order completion summary & delivery records:`,
      `🔗 ${trackingUrl}`,
      "",
      `Tracking Reference ID: *${cleanOrder}*`,
      "",
      `Thank you for trusting Stone Tech for your architectural stone!`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  } else if (assessment.stage === "dispatched") {
    const firstDispatch = input.dispatches?.[0];
    const carrierInfo = firstDispatch?.carrier || firstDispatch?.vehicle_no;
    messageText = [
      `Namaste ${customerName}, greetings from Stone Tech! 🪨`,
      "",
      `Great news! Your stone order *${cleanOrder}* has been dispatched and is currently in transit. 🚚`,
      "",
      `• Status: *Dispatched & On the Way*`,
      firstDispatch?.dispatch_no ? `• Delivery Challan: *${firstDispatch.dispatch_no}*` : null,
      carrierInfo ? `• Carrier / Vehicle: *${carrierInfo}*` : null,
      formattedDate ? `• Expected Site Arrival: *${formattedDate}* (On Schedule ✅)` : null,
      "",
      `Track live delivery milestones anytime using your tracking link:`,
      `🔗 ${trackingUrl}`,
      "",
      `Tracking Reference ID: *${cleanOrder}*`,
      "",
      `Our team will coordinate for safe on-site unloading. Reply here if you need any assistance!`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  } else if (assessment.isDelayed) {
    messageText = [
      `Namaste ${customerName}, greetings from Stone Tech! 🪨`,
      "",
      `We wanted to share a quick update regarding your natural stone order *${cleanOrder}*:`,
      "",
      `• Current Stage: *${assessment.stageLabel}*`,
      `• Work Done So Far: ${assessment.whatsBeenDone}`,
      `• Schedule Update: Our craftsmanship & quality inspection team is ensuring precision finish and calibration.`,
      formattedDate
        ? `• Target Delivery Window: *${formattedDate}* (Schedule coordinated)`
        : `• Delivery Window: *Coordination in progress*`,
      "",
      `You can check live fabrication progress anytime with your tracking link:`,
      `🔗 ${trackingUrl}`,
      "",
      `Tracking Reference ID: *${cleanOrder}*`,
      "",
      `We are committed to delivering finest quality natural stone. Please feel free to reply here if you have any questions!`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  } else {
    // On-Time In-Progress Order
    const arrivalLine = formattedDate
      ? `• Expected Arrival: *Expected to arrive on time i.e., ${formattedDate}* ✅`
      : `• Expected Arrival: *Expected on schedule* ✅`;

    messageText = [
      `Namaste ${customerName}, greetings from Stone Tech! 🪨`,
      "",
      `Here is the latest status update on your stone order *${cleanOrder}*:`,
      "",
      `• Current Stage: *${assessment.stageLabel}*`,
      `• Work Done So Far: ${assessment.whatsBeenDone}`,
      arrivalLine,
      "",
      `You can track your live stone order progress anytime using your personal tracking link:`,
      `🔗 ${trackingUrl}`,
      "",
      `Tracking Reference ID: *${cleanOrder}*`,
      "",
      `Thank you for choosing Stone Tech! Feel free to reach out anytime for any queries.`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  return {
    messageText,
    trackingUrl,
    trackingPin: pin,
    assessment,
    normalizedPhone: cleanPhone,
  };
}
