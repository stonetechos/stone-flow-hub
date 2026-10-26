/**
 * Customer CRM Engagement & Response Status Types and Configurations.
 *
 * Enables sales teams to track whether a client is active, responsive,
 * awaiting reply, or inactive for follow-up responses, along with call logs.
 */

export type CustomerResponseStatus =
  | "active_responsive"
  | "payment_pending"
  | "order_placed"
  | "order_completed"
  | "order_cancelled_delay"
  | "order_cancelled_change_of_plans"
  | "regular_future_requirement"
  | "followup_pending"
  | "awaiting_reply"
  | "inactive_no_response"
  | "do_not_contact";

export interface CustomerCrmWorkflowState {
  response_status?: CustomerResponseStatus;
  assigned_to?: string | null;
  assigned_salesperson?: string | null;
  assigned_at?: string;
  last_call_at?: string;
  last_call_outcome?: string;
  last_call_notes?: string;
  next_call_at?: string;
  next_call_agenda?: string;
  call_count?: number;
  payment_promised_date?: string | null;
  payment_promised_amount?: number | null;
  payment_reminder_flag_days?: number | null;
  payment_reminder_notes?: string | null;
  payment_reminder_completed_at?: string | null;
  [key: string]: unknown;
}

export const CUSTOMER_RESPONSE_STATUS_CONFIG: Record<
  CustomerResponseStatus,
  {
    value: CustomerResponseStatus;
    label: string;
    shortLabel: string;
    tone: string;
    badgeTone: string;
    dotColor: string;
    description: string;
  }
> = {
  active_responsive: {
    value: "active_responsive",
    label: "Active · Responding",
    shortLabel: "Responding",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badgeTone: "bg-emerald-100/80 text-emerald-900 border-emerald-300",
    dotColor: "bg-emerald-500",
    description: "Client is active, engaged, and responding to calls and messages.",
  },
  payment_pending: {
    value: "payment_pending",
    label: "Payment Due · Promised Date",
    shortLabel: "Payment Due",
    tone: "bg-emerald-50 text-emerald-900 border-emerald-300",
    badgeTone: "bg-emerald-100/90 text-emerald-950 border-emerald-400 font-semibold",
    dotColor: "bg-emerald-600",
    description:
      "Customer requested / promised payment on a specific date; active reminder flagged.",
  },
  order_placed: {
    value: "order_placed",
    label: "Order Placed",
    shortLabel: "Order Placed",
    tone: "bg-purple-50 text-purple-800 border-purple-200",
    badgeTone: "bg-purple-100/80 text-purple-900 border-purple-300",
    dotColor: "bg-purple-500",
    description:
      "Client has placed their order. Sales follow-up complete; moved to order fulfillment.",
  },
  order_completed: {
    value: "order_completed",
    label: "Order Completed",
    shortLabel: "Completed",
    tone: "bg-teal-50 text-teal-800 border-teal-200",
    badgeTone: "bg-teal-100/80 text-teal-900 border-teal-300",
    dotColor: "bg-teal-600",
    description: "Order has been successfully fulfilled, delivered, and completed.",
  },
  order_cancelled_delay: {
    value: "order_cancelled_delay",
    label: "Order Cancelled · Delay",
    shortLabel: "Cancelled · Delay",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
    badgeTone: "bg-rose-100/90 text-rose-900 border-rose-300 font-semibold",
    dotColor: "bg-rose-500",
    description:
      "Order was cancelled due to unexpected delays (production, transport, or scheduling).",
  },
  order_cancelled_change_of_plans: {
    value: "order_cancelled_change_of_plans",
    label: "Order Cancelled · Change of Plans",
    shortLabel: "Cancelled · Plans",
    tone: "bg-amber-50 text-amber-900 border-amber-200",
    badgeTone: "bg-amber-100/90 text-amber-950 border-amber-300 font-semibold",
    dotColor: "bg-amber-600",
    description:
      "Order was cancelled due to client change of plans, revised design, or project scope.",
  },
  regular_future_requirement: {
    value: "regular_future_requirement",
    label: "Regular Requirement · Future Consideration",
    shortLabel: "Regular · Future",
    tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
    badgeTone: "bg-indigo-100/80 text-indigo-900 border-indigo-300",
    dotColor: "bg-indigo-500",
    description:
      "Client visited with regular/ongoing stone requirements and will consider Stone Tech for future orders.",
  },
  followup_pending: {
    value: "followup_pending",
    label: "Follow-up Pending",
    shortLabel: "Follow-up Due",
    tone: "bg-amber-50 text-amber-800 border-amber-200",
    badgeTone: "bg-amber-100/80 text-amber-900 border-amber-300",
    dotColor: "bg-amber-500",
    description: "Follow-up call or action is queued and needs staff attention.",
  },
  awaiting_reply: {
    value: "awaiting_reply",
    label: "Awaiting Client Reply",
    shortLabel: "Awaiting Reply",
    tone: "bg-cyan-50 text-cyan-800 border-cyan-200",
    badgeTone: "bg-cyan-100/80 text-cyan-900 border-cyan-300",
    dotColor: "bg-cyan-500",
    description: "Quotation, proposal, or sample shared; awaiting client feedback.",
  },
  inactive_no_response: {
    value: "inactive_no_response",
    label: "Inactive · No Response",
    shortLabel: "No Response",
    tone: "bg-orange-50 text-orange-800 border-orange-200",
    badgeTone: "bg-orange-100/80 text-orange-900 border-orange-300",
    dotColor: "bg-orange-500",
    description: "Client did not answer recent calls or follow-up attempts.",
  },
  do_not_contact: {
    value: "do_not_contact",
    label: "Closed · Not Interested",
    shortLabel: "Closed / Lost",
    tone: "bg-slate-100 text-slate-700 border-slate-200",
    badgeTone: "bg-slate-200 text-slate-800 border-slate-300",
    dotColor: "bg-slate-500",
    description: "Client requested no further contact or requirement closed.",
  },
};

export const CALL_OUTCOMES = [
  { value: "positive_proceeding", label: "Positive · Ready to proceed" },
  { value: "payment_promised", label: "Payment Promised · Request for Payment" },
  { value: "order_placed", label: "Order Placed / Confirmed · Won" },
  { value: "order_completed", label: "Order Completed · Delivered & Closed" },
  { value: "order_cancelled_delay", label: "Order Cancelled · Unexpected Delay" },
  { value: "order_cancelled_change_of_plans", label: "Order Cancelled · Change of Plans" },
  {
    value: "regular_future_requirement",
    label: "Regular requirement · Will consider for future orders",
  },
  { value: "samples_required_site", label: "Samples required at site" },
  { value: "asked_for_catalog", label: "Asked for product catalog/s" },
  { value: "quote_revision_requested", label: "Quote revision requested" },
  { value: "site_visit_requested", label: "Site visit / Measurement requested" },
  { value: "reviewing_with_architect", label: "Reviewing with architect / family" },
  { value: "busy_call_back", label: "Busy · Asked to call back later" },
  { value: "no_answer", label: "Ringing · Did not answer" },
  { value: "price_negotiation", label: "Negotiating on pricing / budget" },
  { value: "not_interested", label: "Not interested / Budget mismatch" },
] as const;

export type CustomerSalespersonKey = "rishi" | "raman";

export interface CustomerSalespersonConfig {
  key: CustomerSalespersonKey;
  label: string;
  shortName: string;
  email: string;
  badgeTone: string;
  avatarTone: string;
}

export const CUSTOMER_SALESPEOPLE: Record<CustomerSalespersonKey, CustomerSalespersonConfig> = {
  rishi: {
    key: "rishi",
    label: "Rishi Rai",
    shortName: "Rishi",
    email: "rishirai@gmail.com",
    badgeTone: "bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100",
    avatarTone: "bg-indigo-600 text-white",
  },
  raman: {
    key: "raman",
    label: "Raman Pupneja",
    shortName: "Raman",
    email: "raman.pupneja@gmail.com",
    badgeTone: "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100",
    avatarTone: "bg-amber-600 text-white",
  },
};

export function getCustomerSalesperson(
  customer?: {
    workflow_state?: unknown;
    external_ref?: unknown;
  } | null,
): CustomerSalespersonKey | null {
  if (!customer) return null;
  const crm = getCustomerCrmState(customer);
  const ext = (customer.external_ref as Record<string, unknown> | null) ?? {};

  const raw = String(
    crm.assigned_salesperson ||
      crm.assigned_to ||
      crm.salesperson ||
      ext.assigned_salesperson ||
      ext.assigned_to ||
      "",
  ).toLowerCase();

  if (raw.includes("raman")) return "raman";
  if (raw.includes("rishi")) return "rishi";
  return null;
}

/** Extract CRM state safely from customer row */
export function getCustomerCrmState(customer: {
  workflow_state?: unknown;
  external_ref?: unknown;
}): CustomerCrmWorkflowState {
  if (
    customer.workflow_state &&
    typeof customer.workflow_state === "object" &&
    !Array.isArray(customer.workflow_state)
  ) {
    return customer.workflow_state as CustomerCrmWorkflowState;
  }
  if (
    customer.external_ref &&
    typeof customer.external_ref === "object" &&
    !Array.isArray(customer.external_ref)
  ) {
    return customer.external_ref as CustomerCrmWorkflowState;
  }
  return {};
}

/** Determine the active response status of a customer */
export function getCustomerResponseStatus(customer: {
  is_active?: boolean;
  workflow_state?: unknown;
  external_ref?: unknown;
}): CustomerResponseStatus {
  const crm = getCustomerCrmState(customer);
  if (crm.response_status) {
    return crm.response_status;
  }
  // Default based on is_active
  if (customer.is_active === false) {
    return "inactive_no_response";
  }
  return "active_responsive";
}

export interface BuildCustomerFollowupWhatsappOptions {
  customerName?: string | null;
  contactPerson?: string | null;
  companyName?: string | null;
  salesperson?: CustomerSalespersonKey | string | null;
  orderNo?: string | null;
}

/**
 * Builds the standard WhatsApp follow-up message for a customer.
 *
 * Prompts the customer for a status update on their natural stone requirement,
 * and asks if they need any assistance or are unable to finalise.
 */
export function buildCustomerFollowupWhatsappMessage(
  options: BuildCustomerFollowupWhatsappOptions,
): string {
  const greetingName = options.contactPerson?.trim() || options.customerName?.trim() || "";
  const greeting = greetingName ? `Hi ${greetingName},` : "Hello,";

  const contextLine = options.orderNo
    ? `Following up regarding your natural stone requirement (Order/Quote #${options.orderNo}) with Stone Tech.`
    : `Following up regarding your natural stone requirement with Stone Tech.`;

  const salespersonKey =
    options.salesperson === "raman" || options.salesperson === "rishi"
      ? (options.salesperson as CustomerSalespersonKey)
      : null;
  const salespersonConfig = salespersonKey ? CUSTOMER_SALESPEOPLE[salespersonKey] : null;
  const signatureName =
    salespersonConfig?.label ||
    (typeof options.salesperson === "string" && options.salesperson.trim()
      ? options.salesperson.trim()
      : null);

  const signature = signatureName
    ? `Regards,\n${signatureName}\nStone Tech`
    : `Regards,\nStone Tech`;

  return [
    greeting,
    "",
    "Hope you are doing well.",
    "",
    `${contextLine} Kindly update us on the status, or please let us know if you need any assistance or are unable to finalise so we can assist you.`,
    "",
    "Looking forward to hearing from you.",
    "",
    signature,
  ].join("\n");
}

export interface CustomerPaymentReminderInfo {
  hasReminder: boolean;
  promisedDate: string | null;
  promisedAmount: number | null;
  flagDays: number;
  isFlaggedActive: boolean;
  isOverdue: boolean;
  daysRemaining: number;
  urgency: "upcoming" | "flagged_2days" | "due_today" | "overdue";
  badgeLabel: string;
  notes?: string | null;
}

const EMPTY_PAYMENT_REMINDER: CustomerPaymentReminderInfo = {
  hasReminder: false,
  promisedDate: null,
  promisedAmount: null,
  flagDays: 2,
  isFlaggedActive: false,
  isOverdue: false,
  daysRemaining: 0,
  urgency: "upcoming",
  badgeLabel: "",
  notes: null,
};

/**
 * Calculates payment reminder flag state for a customer.
 *
 * Business rule:
 * Customer agreed/promised to pay on a given date.
 * The software flags the staff to ask for payment starting 2 days prior to the payment date,
 * on the payment date itself, and alerts if overdue.
 */
export function getCustomerPaymentReminderInfo(
  customer?: {
    workflow_state?: unknown;
    external_ref?: unknown;
  } | null,
): CustomerPaymentReminderInfo {
  if (!customer) return EMPTY_PAYMENT_REMINDER;
  const crm = getCustomerCrmState(customer);
  if (!crm.payment_promised_date || crm.payment_reminder_completed_at) {
    return EMPTY_PAYMENT_REMINDER;
  }

  const promisedDateStr = crm.payment_promised_date;
  const targetDateOnly = new Date(promisedDateStr);
  if (isNaN(targetDateOnly.getTime())) return EMPTY_PAYMENT_REMINDER;

  targetDateOnly.setHours(0, 0, 0, 0);

  const flagDays =
    typeof crm.payment_reminder_flag_days === "number" && crm.payment_reminder_flag_days >= 0
      ? crm.payment_reminder_flag_days
      : 2;

  const now = new Date();
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = targetDateOnly.getTime() - nowDateOnly.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = diffDays < 0;
  // Flagged active if within flagDays (e.g. 2 days before payment date) or overdue
  const isFlaggedActive = diffDays <= flagDays;

  let urgency: CustomerPaymentReminderInfo["urgency"] = "upcoming";
  let badgeLabel = `Pay in ${diffDays}d`;

  if (isOverdue) {
    urgency = "overdue";
    badgeLabel = `Pay Overdue ${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    urgency = "due_today";
    badgeLabel = "Pay Due Today";
  } else if (isFlaggedActive) {
    urgency = "flagged_2days";
    badgeLabel = `Pay Due in ${diffDays}d`;
  }

  return {
    hasReminder: true,
    promisedDate: promisedDateStr,
    promisedAmount:
      typeof crm.payment_promised_amount === "number" ? crm.payment_promised_amount : null,
    flagDays,
    isFlaggedActive,
    isOverdue,
    daysRemaining: diffDays,
    urgency,
    badgeLabel,
    notes: crm.payment_reminder_notes || null,
  };
}

export interface BuildCustomerPaymentReminderWhatsappOptions {
  customerName?: string | null;
  contactPerson?: string | null;
  companyName?: string | null;
  salesperson?: CustomerSalespersonKey | string | null;
  orderNo?: string | null;
  amount?: number | null;
  promisedAmount?: number | null;
  promisedDate?: string | null;
}

/**
 * Builds a polite, professional payment reminder message for WhatsApp.
 */
export function buildCustomerPaymentReminderWhatsappMessage(
  options: BuildCustomerPaymentReminderWhatsappOptions,
): string {
  const greetingName = options.contactPerson?.trim() || options.customerName?.trim() || "";
  const greeting = greetingName ? `Hi ${greetingName},` : "Hello,";

  const dateFormatted = options.promisedDate
    ? new Date(options.promisedDate).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "today";

  const effAmount = options.promisedAmount ?? options.amount ?? null;
  const amountStr =
    effAmount && effAmount > 0
      ? `gentle reminder regarding the payment of ₹${effAmount.toLocaleString("en-IN")}`
      : `gentle reminder regarding your pending payment`;

  const orderLine = options.orderNo ? ` for Order #${options.orderNo}` : "";

  const salespersonKey =
    options.salesperson === "raman" || options.salesperson === "rishi"
      ? (options.salesperson as CustomerSalespersonKey)
      : null;
  const salespersonConfig = salespersonKey ? CUSTOMER_SALESPEOPLE[salespersonKey] : null;
  const signatureName =
    salespersonConfig?.label ||
    (typeof options.salesperson === "string" && options.salesperson.trim()
      ? options.salesperson.trim()
      : null);

  const signature = signatureName
    ? `Warm regards,\n${signatureName}\nStone Tech`
    : `Warm regards,\nAccounts & Sales Team\nStone Tech`;

  return [
    greeting,
    "",
    "Hope you are doing well!",
    "",
    `This is a ${amountStr}${orderLine} with Stone Tech, as discussed for ${dateFormatted}.`,
    "",
    "Kindly arrange the transfer or let us know once initiated so our accounts team can confirm the receipt.",
    "",
    "If you need our bank account details or UPI QR code again, please let us know.",
    "",
    signature,
  ].join("\n");
}
