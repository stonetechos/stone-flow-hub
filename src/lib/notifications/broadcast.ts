/**
 * STOS Centralized Event Broadcaster for Organization & Admin Notifications.
 *
 * Dispatches to:
 * 1. Supabase Realtime channel `notifications_feed` (instant delivery to all open browser/mobile tabs).
 * 2. TanStack Start server function (persists to `public.notifications` DB for durable history).
 * 3. Local notification channels (toasts & native Android heads-up via @capacitor/local-notifications).
 */
import { supabase } from "@/integrations/supabase/client";
import { dispatchToChannels } from "./channels/dispatch";
import { formatInr } from "@/lib/format";
import type { NotificationTier } from "./tiers";

export interface BroadcastPayload {
  tier?: NotificationTier;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  linkPath?: string;
  targetRole?: "all" | "admin";
  actionType?: "notify_customer_whatsapp" | "navigate";
  actionData?: Record<string, unknown>;
}

// In-memory event bus for instant client-side subscriber notification
type NotificationListener = (payload: BroadcastPayload & { id: string; createdAt: string }) => void;
const listeners = new Set<NotificationListener>();

export function onNotificationBanner(fn: NotificationListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitLocalBanner(payload: BroadcastPayload): void {
  const fullPayload = {
    ...payload,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `notif-${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
  };
  listeners.forEach((l) => {
    try {
      l(fullPayload);
    } catch (e) {
      console.error("[banner] listener error", e);
    }
  });
}

/**
 * Low-level dispatch: pushes to Realtime, DB, local banner, and notification channels.
 */
export async function dispatchStosEvent(payload: BroadcastPayload): Promise<void> {
  // 1. Immediate local in-app banner & channels
  emitLocalBanner(payload);
  void dispatchToChannels({
    tier: payload.tier || "info",
    title: payload.title,
    body: payload.body,
    linkPath: payload.linkPath,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });

  // 2. Realtime broadcast over Supabase channel
  try {
    const channel = supabase.channel("notifications_feed");
    channel.send({
      type: "broadcast",
      event: "stos_banner",
      payload: {
        ...payload,
        id: `rt-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("[notifications] Realtime broadcast send skipped", err);
  }

  // 3. Persist to server / database (non-blocking)
  try {
    const { postNotificationFn } = await import("./notify.functions");
    void postNotificationFn({
      data: {
        tier: payload.tier || "info",
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType,
        entityId: payload.entityId,
        linkPath: payload.linkPath,
        targetRole: payload.targetRole || "all",
      },
    }).catch((e) => console.warn("[notifications] server save failed", e));
  } catch (e) {
    // If running in an environment where server functions can't be imported, ignore
  }
}

/* --------------------------------------------------------------------- */
/* Domain Event Dispatchers                                              */
/* --------------------------------------------------------------------- */

/**
 * 1. New Customer Entry Made (Organization-wide)
 */
export function broadcastCustomerCreated(customer: {
  id: string;
  name: string;
  customer_code?: string | null;
  primary_phone?: string | null;
}): void {
  const code = customer.customer_code || customer.primary_phone || "New";
  void dispatchStosEvent({
    tier: "info",
    title: "New Customer Added",
    body: `A new customer entry has been made: ${customer.name} (${code}).`,
    entityType: "customer",
    entityId: customer.id,
    linkPath: `/customers/${customer.id}`,
    targetRole: "all",
  });
}

/**
 * 2. Quotation Approved (Organization-wide)
 */
export function broadcastQuoteApproved(quote: {
  id: string;
  quote_no: string;
  customer_name?: string | null;
  total_amount?: number | null;
}): void {
  const customerPart = quote.customer_name ? ` for ${quote.customer_name}` : "";
  const totalPart = quote.total_amount != null ? ` (${formatInr(quote.total_amount)})` : "";
  void dispatchStosEvent({
    tier: "important",
    title: "Quotation Approved",
    body: `A quotation has been approved: ${quote.quote_no}${customerPart}${totalPart}.`,
    entityType: "quote",
    entityId: quote.id,
    linkPath: `/quotes/${quote.id}`,
    targetRole: "all",
  });
}

/**
 * 3. Received Quote from Vendor (Organization-wide)
 */
export function broadcastVendorQuoteReceived(rfq: {
  rfqNo: string;
  vendorName: string;
  totalInr?: number | null;
  rfqId?: string | null;
}): void {
  const totalPart = rfq.totalInr != null ? ` (Total: ${formatInr(rfq.totalInr)})` : "";
  void dispatchStosEvent({
    tier: "info",
    title: "Vendor Quote Received",
    body: `Received quote from vendor ${rfq.vendorName} for RFQ ${rfq.rfqNo}${totalPart}.`,
    entityType: "rfq",
    entityId: rfq.rfqId ?? undefined,
    linkPath: rfq.rfqId ? `/rfqs/${rfq.rfqId}` : `/rfqs`,
    targetRole: "all",
  });
}

/**
 * 4. Material Dispatched (Organization-wide)
 */
export function broadcastMaterialDispatched(dispatch: {
  id: string;
  dispatch_no?: string | null;
  carrier?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
}): void {
  const carrierPart = dispatch.carrier ? ` via ${dispatch.carrier}` : "";
  const targetPart = dispatch.customer_name
    ? ` for ${dispatch.customer_name}`
    : dispatch.project_name
      ? ` for ${dispatch.project_name}`
      : "";
  void dispatchStosEvent({
    tier: "important",
    title: "Material Dispatched",
    body: `The material has been dispatched: ${dispatch.dispatch_no || "Delivery Challan"}${carrierPart}${targetPart}.`,
    entityType: "dispatch",
    entityId: dispatch.id,
    linkPath: `/dispatch/${dispatch.id}`,
    targetRole: "all",
  });
}

/**
 * 5. Admin Payment Notification
 * Formats: "Received this much amount in Stone Tech UPI, Cash, Or Current Account BOB, or Personal UPI- Raman, Personal UPI- Rishi, etc."
 */
const PAYMENT_METHOD_NAMES: Record<string, string> = {
  upi_stone_tech: "Stone Tech UPI",
  cash: "Cash",
  current_bob: "Current Account BOB",
  upi_bob_current: "Stone Tech BOB Current A/c",
  upi_raman: "Personal UPI - Raman",
  upi_rishi: "Personal UPI - Rishi",
  upi_manual: "UPI",
  upi_personal: "Personal UPI",
  bank_transfer: "Bank Transfer",
  neft: "NEFT",
  rtgs: "RTGS",
  imps: "IMPS",
  cheque: "Cheque",
  card: "Card",
  razorpay: "Razorpay",
};

export function notifyAdminPaymentReceived(payment: {
  amount: number;
  method: string;
  account_used?: string | null;
  customer_name?: string | null;
  invoice_no?: string | null;
  reference_no?: string | null;
}): void {
  const methodLabel =
    PAYMENT_METHOD_NAMES[payment.method] ||
    payment.account_used ||
    payment.method.replace(/_/g, " ").toUpperCase();
  const customerPart = payment.customer_name ? ` from ${payment.customer_name}` : "";
  const invoicePart = payment.invoice_no ? ` against ${payment.invoice_no}` : "";

  void dispatchStosEvent({
    tier: "critical",
    title: "Payment Received (Admin Alert)",
    body: `Received ${formatInr(payment.amount)} in ${methodLabel}${customerPart}${invoicePart}.`,
    entityType: "receipt",
    linkPath: "/payments",
    targetRole: "admin",
  });
}

/**
 * 6. Admin Project Completed Alert + WhatsApp Action
 * "Project has been completed, check the updated sales ledger and notify customer."
 */
export function notifyAdminProjectCompleted(project: {
  id: string;
  name: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_whatsapp?: string | null;
  totalInvoiced?: number;
  totalReceived?: number;
  balanceDue?: number;
}): void {
  const customerPart = project.customer_name ? ` for ${project.customer_name}` : "";
  void dispatchStosEvent({
    tier: "important",
    title: "Project Completed",
    body: `Project "${project.name}"${customerPart} has been completed. Check the updated sales ledger and notify customer.`,
    entityType: "project",
    entityId: project.id,
    linkPath: project.customer_id ? `/ledger/${project.customer_id}` : `/projects/${project.id}`,
    targetRole: "admin",
    actionType: "notify_customer_whatsapp",
    actionData: {
      projectId: project.id,
      projectName: project.name,
      customerId: project.customer_id,
      customerName: project.customer_name,
      customerPhone: project.customer_phone,
      customerWhatsapp: project.customer_whatsapp,
      totalInvoiced: project.totalInvoiced,
      totalReceived: project.totalReceived,
      balanceDue: project.balanceDue,
    },
  });
}
