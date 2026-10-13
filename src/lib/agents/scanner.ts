/**
 * Agent Scanner & Recommendation Generator.
 *
 * Scans verified database entities to identify actionable follow-ups,
 * vendor reminders, accounting discrepancies, and service complaints.
 * Every finding is strictly grounded in actual database records.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatInr, formatDate } from "@/lib/format";
import type { AgentDraftPayload, AgentTaskItem } from "./types";
import { createDraftHash } from "./approval";

interface ScannedCustomerContext {
  id: string;
  name: string;
  primary_phone?: string | null;
}

interface ScannedQuoteRow {
  id: string;
  quote_no: string | null;
  total: number | null;
  created_at: string;
  customer: ScannedCustomerContext | null;
}

interface ScannedEnquiryRow {
  id: string;
  enquiry_no: string | null;
  requirement: string | null;
  budget_inr: number | null;
  created_at: string;
  customer: ScannedCustomerContext | null;
}

interface ScannedFollowupRow {
  id: string;
  notes: string | null;
  outcome_notes: string | null;
  scheduled_at: string;
  enquiry: {
    id: string;
    enquiry_no: string | null;
    customer: ScannedCustomerContext | null;
  } | null;
  project: {
    id: string;
    name: string | null;
    customer: ScannedCustomerContext | null;
  } | null;
}

interface ScannedPurchaseOrderRow {
  id: string;
  po_no: string | null;
  order_date: string;
  expected_date: string | null;
  status?: string | null;
  notes?: string | null;
  vendor: {
    id: string;
    company_name: string;
    contact_person?: string | null;
    mobile_number?: string | null;
  } | null;
}

interface ScannedInvoiceRow {
  id: string;
  invoice_no: string;
  total: number;
  balance_due: number;
  issue_date: string;
  customer: {
    id: string;
    name: string;
    customer_code?: string | null;
  } | null;
}

interface ScannedReceiptRow {
  id: string;
  receipt_no: string;
  amount: number;
  unallocated_amount: number;
  received_at: string;
  customer: {
    id: string;
    name: string;
  } | null;
}

export async function scanSalesFollowups(
  db: SupabaseClient,
  _userId?: string,
): Promise<AgentTaskItem[]> {
  const tasks: AgentTaskItem[] = [];
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Stale Quotations awaiting customer feedback (>3 days)
  const { data: staleQuotes } = await db
    .from("quotes")
    .select(
      "id, quote_no, total, created_at, customer:customers!quotes_customer_id_fkey(id, name, primary_phone)",
    )
    .eq("status", "sent")
    .lt("created_at", threeDaysAgo)
    .limit(20);

  const typedQuotes = (staleQuotes ?? []) as unknown as ScannedQuoteRow[];
  for (const q of typedQuotes) {
    const customer = q.customer;
    const customerName = customer?.name || "Valued Client";
    const phone = customer?.primary_phone || "";
    const quoteNo = q.quote_no || "Quotation";
    const amountStr = q.total ? formatInr(q.total) : "";

    const draft: AgentDraftPayload = {
      channel: "whatsapp",
      recipientName: customerName,
      recipientContact: phone,
      messageText: `Namaste ${customerName}, greeting from Stone Tech! Following up on quotation ${quoteNo}${amountStr ? ` for ${amountStr}` : ""} shared a few days ago. Please let us know if you have any questions regarding the stone selection or if you'd like us to reserve the material for your project.`,
      referenceEntity: {
        type: "quote",
        id: q.id,
        code: quoteNo,
        title: `Quote ${quoteNo} (${amountStr})`,
      },
      reason: `Quotation ${quoteNo} was sent on ${formatDate(q.created_at)} and has had no customer response for over 3 days.`,
      supportingFacts: {
        quoteNo,
        totalAmount: q.total,
        sentDate: q.created_at,
        customerName,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `sales_quote_${q.id}`,
      agentId: "sales_followup",
      actionType: "stale_quotation_followup",
      title: `Follow up on Quotation ${quoteNo} — ${customerName}`,
      priority: "high",
      status: "awaiting_approval",
      createdAt: q.created_at,
      updatedAt: now.toISOString(),
      linkedRecordType: "quote",
      linkedRecordId: q.id,
      draft,
    });
  }

  // 2. Open Enquiries needing initial response (>24 hours)
  const { data: openEnquiries } = await db
    .from("enquiries")
    .select(
      "id, enquiry_no, requirement, budget_inr, created_at, customer:customers!enquiries_customer_id_fkey(id, name, primary_phone)",
    )
    .in("stage", ["new_lead", "contacted"])
    .lt("created_at", oneDayAgo)
    .limit(20);

  const typedEnquiries = (openEnquiries ?? []) as unknown as ScannedEnquiryRow[];
  for (const enq of typedEnquiries) {
    const customer = enq.customer;
    const customerName = customer?.name || "Client";
    const phone = customer?.primary_phone || "";
    const enqNo = enq.enquiry_no || "Enquiry";

    const draft: AgentDraftPayload = {
      channel: "whatsapp",
      recipientName: customerName,
      recipientContact: phone,
      messageText: `Namaste ${customerName}, thank you for contacting Stone Tech regarding ${enq.requirement || "your stone requirements"} (Ref: ${enqNo}). Our team is reviewing the available slab lots and would love to share photos/estimates. Would you be available for a brief call today?`,
      referenceEntity: {
        type: "enquiry",
        id: enq.id,
        code: enqNo,
        title: `Enquiry ${enqNo}`,
      },
      reason: `New enquiry ${enqNo} logged on ${formatDate(enq.created_at)} awaiting initial response.`,
      supportingFacts: {
        enquiryNo: enqNo,
        requirement: enq.requirement,
        createdDate: enq.created_at,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `sales_enq_${enq.id}`,
      agentId: "sales_followup",
      actionType: "enquiry_response_draft",
      title: `Send Initial Response for Enquiry ${enqNo} — ${customerName}`,
      priority: "urgent",
      status: "awaiting_approval",
      createdAt: enq.created_at,
      updatedAt: now.toISOString(),
      linkedRecordType: "enquiry",
      linkedRecordId: enq.id,
      draft,
    });
  }

  // 3. Due/Overdue Followups
  const { data: dueFollowups } = await db
    .from("followups")
    .select(
      "id, notes, outcome_notes, scheduled_at, enquiry:enquiries!followups_enquiry_id_fkey(id, enquiry_no, customer:customers!enquiries_customer_id_fkey(id, name, primary_phone)), project:projects!followups_project_id_fkey(id, name, customer:customers!projects_customer_id_fkey(id, name, primary_phone))",
    )
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .limit(20);

  const typedFollowups = (dueFollowups ?? []) as unknown as ScannedFollowupRow[];
  for (const f of typedFollowups) {
    const customer = f.enquiry?.customer || f.project?.customer;
    const customerName = customer?.name || "Client";
    const phone = customer?.primary_phone || "";
    const subject = f.enquiry?.enquiry_no
      ? `Enquiry ${f.enquiry.enquiry_no}`
      : f.project?.name || "Scheduled Follow-up";

    const draft: AgentDraftPayload = {
      channel: "whatsapp",
      recipientName: customerName,
      recipientContact: phone,
      messageText: `Namaste ${customerName}, following up from Stone Tech as planned regarding: ${f.notes || subject}. Please let us know a convenient time to connect.`,
      referenceEntity: {
        type: "followup",
        id: f.id,
        title: subject,
      },
      reason: `Scheduled follow-up due on ${formatDate(f.scheduled_at)}.`,
      supportingFacts: {
        scheduledAt: f.scheduled_at,
        notes: f.notes,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `sales_flw_${f.id}`,
      agentId: "sales_followup",
      actionType: "scheduled_followup_reminder",
      title: `Due Follow-up: ${subject} — ${customerName}`,
      priority: "high",
      status: "awaiting_approval",
      createdAt: f.scheduled_at,
      updatedAt: now.toISOString(),
      linkedRecordType: "followup",
      linkedRecordId: f.id,
      draft,
    });
  }

  return tasks;
}

export async function scanPurchaseFollowups(
  db: SupabaseClient,
  _userId?: string,
): Promise<AgentTaskItem[]> {
  const tasks: AgentTaskItem[] = [];
  const now = new Date();
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Purchase Orders sent >24h without acknowledgement
  const { data: unconfirmedPOs } = await db
    .from("purchase_orders")
    .select(
      "id, po_no, order_date, expected_date, notes, vendor:vendors!purchase_orders_vendor_id_fkey(id, company_name, contact_person, mobile_number)",
    )
    .eq("status", "sent")
    .lt("created_at", oneDayAgo)
    .limit(20);

  const typedUnconfirmed = (unconfirmedPOs ?? []) as unknown as ScannedPurchaseOrderRow[];
  for (const po of typedUnconfirmed) {
    const vendor = po.vendor;
    const vendorName = vendor?.company_name || "Vendor Partner";
    const phone = vendor?.mobile_number || "";
    const poNo = po.po_no || "Purchase Order";

    const draft: AgentDraftPayload = {
      channel: "whatsapp",
      recipientName: vendorName,
      recipientContact: phone,
      messageText: `Greetings ${vendorName}, this is regarding Stone Tech Purchase Order ${poNo} issued on ${formatDate(po.order_date)}. Kindly confirm receipt and acceptance of this order along with the committed dispatch schedule.`,
      referenceEntity: {
        type: "purchase_order",
        id: po.id,
        code: poNo,
        title: `PO ${poNo}`,
      },
      reason: `PO ${poNo} was sent on ${formatDate(po.order_date)} and is awaiting vendor confirmation.`,
      supportingFacts: {
        poNo,
        orderDate: po.order_date,
        vendorName,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `purchase_po_unconfirmed_${po.id}`,
      agentId: "purchase_followup",
      actionType: "po_acknowledgement_followup",
      title: `Request PO Confirmation — ${poNo} (${vendorName})`,
      priority: "high",
      status: "awaiting_approval",
      createdAt: po.order_date,
      updatedAt: now.toISOString(),
      linkedRecordType: "purchase_order",
      linkedRecordId: po.id,
      draft,
    });
  }

  // 2. Expected deliveries approaching due date (<48 hours) or overdue
  const { data: deliveryPOs } = await db
    .from("purchase_orders")
    .select(
      "id, po_no, order_date, expected_date, status, vendor:vendors!purchase_orders_vendor_id_fkey(id, company_name, mobile_number)",
    )
    .in("status", ["sent", "acknowledged"])
    .not("expected_date", "is", null)
    .lte("expected_date", next48Hours)
    .limit(20);

  const typedDelivery = (deliveryPOs ?? []) as unknown as ScannedPurchaseOrderRow[];
  for (const po of typedDelivery) {
    const vendor = po.vendor;
    const vendorName = vendor?.company_name || "Supplier";
    const phone = vendor?.mobile_number || "";
    const poNo = po.po_no || "PO";
    const isOverdue = po.expected_date ? new Date(po.expected_date) < now : false;

    const draft: AgentDraftPayload = {
      channel: "whatsapp",
      recipientName: vendorName,
      recipientContact: phone,
      messageText: `Greetings ${vendorName}, following up on delivery for Stone Tech PO ${poNo}. Expected delivery was scheduled for ${formatDate(po.expected_date)}. Kindly share the transit details / LR number or let us know the current dispatch status.`,
      referenceEntity: {
        type: "purchase_order",
        id: po.id,
        code: poNo,
        title: `PO ${poNo}`,
      },
      reason: isOverdue
        ? `Delivery for PO ${poNo} was due on ${formatDate(po.expected_date)} and is now overdue.`
        : `Delivery for PO ${poNo} is due within 48 hours (${formatDate(po.expected_date)}).`,
      supportingFacts: {
        poNo,
        expectedDate: po.expected_date,
        isOverdue,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `purchase_delivery_${po.id}`,
      agentId: "purchase_followup",
      actionType: "delivery_check_reminder",
      title: `${isOverdue ? "Overdue Delivery Alert" : "Delivery Due Check"}: PO ${poNo} (${vendorName})`,
      priority: isOverdue ? "urgent" : "medium",
      status: "awaiting_approval",
      createdAt: po.expected_date || now.toISOString(),
      updatedAt: now.toISOString(),
      linkedRecordType: "purchase_order",
      linkedRecordId: po.id,
      draft,
    });
  }

  return tasks;
}

export async function scanAccountingExceptions(
  db: SupabaseClient,
  _userId?: string,
): Promise<AgentTaskItem[]> {
  const tasks: AgentTaskItem[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Overdue Receivables (>30 days since invoice with outstanding balance)
  const { data: overdueInvoices } = await db
    .from("invoices")
    .select(
      "id, invoice_no, total, balance_due, issue_date, customer:customers!invoices_customer_id_fkey(id, name, customer_code)",
    )
    .gt("balance_due", 0)
    .lt("issue_date", thirtyDaysAgo)
    .limit(20);

  const typedInvoices = (overdueInvoices ?? []) as unknown as ScannedInvoiceRow[];
  for (const inv of typedInvoices) {
    const customer = inv.customer;
    const customerName = customer?.name || "Customer";
    const balanceStr = formatInr(inv.balance_due || 0);

    const draft: AgentDraftPayload = {
      channel: "internal_review",
      recipientName: "Finance & Accounts Team",
      messageText: `[ACCOUNTING AUDIT NOTE]\nInvoice ${inv.invoice_no} (${customerName}) has an outstanding balance of ${balanceStr}. Issued on ${formatDate(inv.issue_date)} (>30 days overdue).\nRecommended action: Verify with bank statement whether remittance was received under an alternate reference or assign commercial follow-up to sales.`,
      referenceEntity: {
        type: "invoice",
        id: inv.id,
        code: inv.invoice_no,
        title: `Invoice ${inv.invoice_no} (${balanceStr})`,
      },
      reason: `Invoice ${inv.invoice_no} exceeds 30-day payment term with balance ${balanceStr}.`,
      supportingFacts: {
        invoiceNo: inv.invoice_no,
        issueDate: inv.issue_date,
        totalAmount: inv.total,
        balanceAmount: inv.balance_due,
        customerName,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `acc_overdue_inv_${inv.id}`,
      agentId: "accounting",
      actionType: "overdue_receivable_review",
      title: `Overdue Receivable: Invoice ${inv.invoice_no} (${balanceStr}) — ${customerName}`,
      priority: "high",
      status: "awaiting_approval",
      createdAt: inv.issue_date,
      updatedAt: now.toISOString(),
      linkedRecordType: "invoice",
      linkedRecordId: inv.id,
      draft,
    });
  }

  // 2. Unallocated Receipts requiring allocation
  const { data: unallocatedReceipts } = await db
    .from("receipts")
    .select(
      "id, receipt_no, amount, unallocated_amount, received_at, customer:customers!receipts_customer_id_fkey(id, name)",
    )
    .gt("unallocated_amount", 0)
    .limit(15);

  const typedReceipts = (unallocatedReceipts ?? []) as unknown as ScannedReceiptRow[];
  for (const r of typedReceipts) {
    const customer = r.customer;
    const customerName = customer?.name || "Client";
    const unallocatedStr = formatInr(r.unallocated_amount || 0);

    const draft: AgentDraftPayload = {
      channel: "internal_review",
      recipientName: "Finance Controller",
      messageText: `[UNALLOCATED PAYMENT NOTICE]\nReceipt ${r.receipt_no} from ${customerName} dated ${formatDate(r.received_at)} holds an unallocated advance of ${unallocatedStr}.\nRecommended action: Review open sales invoices or orders for this customer to allocate advance.`,
      referenceEntity: {
        type: "receipt",
        id: r.id,
        code: r.receipt_no,
        title: `Receipt ${r.receipt_no}`,
      },
      reason: `Unallocated advance payment of ${unallocatedStr} pending invoice mapping.`,
      supportingFacts: {
        receiptNo: r.receipt_no,
        unallocatedAmount: r.unallocated_amount,
        receivedAt: r.received_at,
        customerName,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `acc_unallocated_rcpt_${r.id}`,
      agentId: "accounting",
      actionType: "unallocated_payment_review",
      title: `Unallocated Advance: Receipt ${r.receipt_no} (${unallocatedStr}) — ${customerName}`,
      priority: "medium",
      status: "awaiting_approval",
      createdAt: r.received_at,
      updatedAt: now.toISOString(),
      linkedRecordType: "receipt",
      linkedRecordId: r.id,
      draft,
    });
  }

  return tasks;
}
