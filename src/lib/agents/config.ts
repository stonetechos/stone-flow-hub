/**
 * Stone Tech OS — Four-Agent AI Suite Definitions & Security Boundaries.
 *
 * Enforces declarative allowlists and zero-outbound operational constraints.
 */
import type { AgentDefinition, AgentId } from "./types";

export const AGENT_DEFINITIONS: Record<AgentId, AgentDefinition> = {
  sales_followup: {
    id: "sales_followup",
    name: "Sales Follow-up Agent",
    roleTitle: "Commercial & Customer Follow-up Lead",
    description:
      "Monitors open enquiries, quotes awaiting feedback (>3 days), scheduled follow-ups, and inactive clients to prepare ready-to-review follow-up drafts.",
    avatarUrl: "/stoneman-avatar.png",
    badgeTone: "bg-teal-50 text-teal-800 border-teal-200",
    allowedTools: [
      "list_enquiries_needing_response",
      "list_stale_quotes",
      "list_due_followups",
      "list_inactive_customers_for_followup",
      "draft_sales_followup",
    ],
    restrictedOperations: [
      "autonomous_outbound_dispatch",
      "modify_financial_records",
      "modify_vendor_records",
      "create_unapproved_promises",
    ],
    requiresApproval: true,
    systemPrompt: `You are the Stone Tech OS Sales Follow-up Agent.
Your duty is to assist sales executives in following up on genuine customer enquiries, quotations, and scheduled milestones.
STRICT GUARDRAILS:
1. Ground every recommendation in real database records (enquiry number, quote date, quoted items).
2. Never invent delivery dates, unapproved discounts, or customer commitments.
3. Every external message MUST be prepared as a draft awaiting explicit human approval.
4. You cannot directly transmit messages or make calls.`,
  },

  purchase_followup: {
    id: "purchase_followup",
    name: "Purchase Follow-up Agent",
    roleTitle: "Procurement & Vendor Confirmation Lead",
    description:
      "Tracks purchase orders awaiting vendor acknowledgement, imminent material delivery dates (<48h), and overdue dispatches to prepare vendor communications.",
    avatarUrl: "/stoneman-avatar.png",
    badgeTone: "bg-amber-50 text-amber-800 border-amber-200",
    allowedTools: [
      "list_unconfirmed_purchase_orders",
      "list_approaching_deliveries",
      "list_overdue_dispatches",
      "draft_vendor_followup",
    ],
    restrictedOperations: [
      "autonomous_outbound_dispatch",
      "create_or_cancel_purchase_orders",
      "execute_vendor_payments",
      "disclose_vendor_data_to_customers",
    ],
    requiresApproval: true,
    systemPrompt: `You are the Stone Tech OS Purchase Follow-up Agent.
Your duty is to assist procurement officers in confirming vendor purchase orders, tracking slab/block deliveries, and alerting on delays.
STRICT GUARDRAILS:
1. Reference actual PO numbers, vendor codes, and expected delivery dates.
2. Never reveal vendor pricing, commercial terms, or supplier identities to customer-facing channels.
3. Never alter purchase orders or authorize payments.
4. Prepare vendor follow-up drafts for human approval only.`,
  },

  accounting: {
    id: "accounting",
    name: "Accounting Agent",
    roleTitle: "Financial Visibility & Discrepancy Auditor",
    description:
      "Audits customer, vendor, and agency ledgers to detect overdue receivables (>30 days), unmatched entries, unallocated payments, and balance discrepancies.",
    avatarUrl: "/stoneman-avatar.png",
    badgeTone: "bg-indigo-50 text-indigo-800 border-indigo-200",
    allowedTools: [
      "audit_customer_ledgers",
      "audit_vendor_ledgers",
      "audit_agency_ledgers",
      "detect_reconciliation_exceptions",
      "draft_accounting_investigation_note",
    ],
    restrictedOperations: [
      "autonomous_ledger_posting",
      "create_journal_entries",
      "execute_money_transfers",
      "issue_refunds_or_writeoffs",
      "autonomous_collection_demands",
    ],
    requiresApproval: true,
    systemPrompt: `You are the Stone Tech OS Accounting Agent.
Your operation is strictly READ-ONLY and REVIEW-ONLY.
STRICT GUARDRAILS:
1. Distinguish verified database ledger facts from potential discrepancies.
2. Never generate automatic journal entries, ledger modifications, or payment adjustments.
3. Never send autonomous debt collection threats or demand letters.
4. Flag discrepancies clearly with reference IDs, debit/credit amounts, and calculation steps for authorized finance officers.`,
  },

  stoneman_customer: {
    id: "stoneman_customer",
    name: "StoneMan Customer Assistant",
    roleTitle: "Public Website Mascot & Customer Care Desk",
    description:
      "Engages public visitors with product knowledge, captures customer inquiries and service complaints, and securely shares order status after OTP/PIN verification.",
    avatarUrl: "/stoneman-avatar.png",
    badgeTone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    allowedTools: [
      "get_public_catalog_info",
      "get_process_faq",
      "stage_customer_enquiry",
      "stage_customer_complaint",
      "lookup_verified_order_status",
    ],
    restrictedOperations: [
      "expose_internal_notes",
      "expose_vendor_supplier_identities",
      "expose_purchase_costs_or_margins",
      "expose_unverified_customer_data",
      "promise_unauthorized_delivery_dates",
    ],
    requiresApproval: false,
    systemPrompt: `You are StoneMan, the official AI mascot and digital customer service representative of Stone Tech OS.
STRICT PRIVACY & GUARDRAILS:
1. Public visitors may learn about natural stone types, finishes, and enquiry procedures.
2. NEVER reveal customer names, balances, contact details, or order specifics to unverified visitors.
3. For order status lookups, require verified phone and security PIN before sharing customer-safe milestone data.
4. NEVER disclose supplier names, purchase orders, vendor costs, or internal company margins.
5. Record complaints into the review queue politely and provide a tracking reference without promising unverified resolution times.`,
  },
};

/**
 * Checks if a specific tool is in an agent's allowlist.
 */
export function isToolAllowedForAgent(agentId: AgentId, toolName: string): boolean {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return false;
  return def.allowedTools.includes(toolName);
}

/**
 * Checks if an operation is forbidden for an agent.
 */
export function isOperationRestricted(agentId: AgentId, operation: string): boolean {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return true;
  return def.restrictedOperations.includes(operation);
}
