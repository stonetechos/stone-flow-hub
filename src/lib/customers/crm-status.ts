/**
 * Customer CRM Engagement & Response Status Types and Configurations.
 *
 * Enables sales teams to track whether a client is active, responsive,
 * awaiting reply, or inactive for follow-up responses, along with call logs.
 */

export type CustomerResponseStatus =
  | "active_responsive"
  | "order_placed"
  | "followup_pending"
  | "awaiting_reply"
  | "inactive_no_response"
  | "do_not_contact";

export interface CustomerCrmWorkflowState {
  response_status?: CustomerResponseStatus;
  last_call_at?: string;
  last_call_outcome?: string;
  last_call_notes?: string;
  next_call_at?: string;
  next_call_agenda?: string;
  call_count?: number;
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
  { value: "order_placed", label: "Order Placed / Confirmed · Won" },
  { value: "quote_revision_requested", label: "Quote revision requested" },
  { value: "site_visit_requested", label: "Site visit / Measurement requested" },
  { value: "reviewing_with_architect", label: "Reviewing with architect / family" },
  { value: "busy_call_back", label: "Busy · Asked to call back later" },
  { value: "no_answer", label: "Ringing · Did not answer" },
  { value: "price_negotiation", label: "Negotiating on pricing / budget" },
  { value: "not_interested", label: "Not interested / Budget mismatch" },
] as const;

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
