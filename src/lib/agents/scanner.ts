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
  vendor_delivery_date?: string | null;
  delivery_risk?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  vendor: {
    id: string;
    company_name: string;
    contact_person?: string | null;
    mobile_number?: string | null;
    whatsapp_number?: string | null;
  } | null;
}

interface ScannedInvoiceRow {
  id: string;
  invoice_no: string;
  total: number;
  balance_due: number;
  issue_date: string;
  due_date?: string | null;
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
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Purchase Orders needing action (draft POs or sent POs awaiting confirmation)
  const { data: pendingPOs, error: poError } = await db
    .from("purchase_orders")
    .select(
      "id, po_no, order_date, expected_date, vendor_delivery_date, delivery_risk, status, notes, created_at, vendor:vendors!purchase_orders_vendor_id_fkey(id, company_name, contact_person, mobile_number, whatsapp_number)",
    )
    .in("status", ["draft", "sent"])
    .order("created_at", { ascending: false })
    .limit(25);

  if (poError) {
    console.error("[scanner] Error fetching pending purchase orders:", poError);
  }

  const typedPending = (pendingPOs ?? []) as unknown as ScannedPurchaseOrderRow[];
  for (const po of typedPending) {
    const vendor = po.vendor;
    const vendorName = vendor?.company_name || "Supplier Partner";
    const phone = vendor?.mobile_number || vendor?.whatsapp_number || "";
    const poNo = po.po_no || "Purchase Order";
    const isDraft = po.status === "draft";

    const draft: AgentDraftPayload = {
      channel: isDraft ? "internal_review" : "whatsapp",
      recipientName: isDraft ? "Procurement Manager" : vendorName,
      recipientContact: phone,
      messageText: isDraft
        ? `[PO DRAFT REVIEW]\nPurchase Order ${poNo} created on ${formatDate(po.order_date)} for ${vendorName} is still in draft state.\nRecommended action: Verify line items, tax rate, and release official PO to supplier.`
        : `Greetings ${vendorName}, this is regarding Stone Tech Purchase Order ${poNo} issued on ${formatDate(po.order_date)}. Kindly confirm receipt and acceptance along with your committed dispatch schedule.`,
      referenceEntity: {
        type: "purchase_order",
        id: po.id,
        code: poNo,
        title: `PO ${poNo}`,
      },
      reason: isDraft
        ? `PO ${poNo} for ${vendorName} is in draft status pending approval and dispatch.`
        : `PO ${poNo} was sent on ${formatDate(po.order_date)} and is awaiting vendor confirmation.`,
      supportingFacts: {
        poNo,
        orderDate: po.order_date,
        vendorName,
        status: po.status ?? null,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `purchase_po_pending_${po.id}`,
      agentId: "purchase_followup",
      actionType: isDraft ? "po_draft_review" : "po_acknowledgement_followup",
      title: isDraft
        ? `Review & Release PO Draft — ${poNo} (${vendorName})`
        : `Request PO Confirmation — ${poNo} (${vendorName})`,
      priority: isDraft ? "medium" : "high",
      status: "awaiting_approval",
      createdAt: po.order_date || now.toISOString(),
      updatedAt: now.toISOString(),
      linkedRecordType: "purchase_order",
      linkedRecordId: po.id,
      draft,
    });
  }

  // 2. Expected deliveries approaching due date (<48 hours), overdue, or delayed
  const { data: deliveryPOs, error: delError } = await db
    .from("purchase_orders")
    .select(
      "id, po_no, order_date, expected_date, vendor_delivery_date, delivery_risk, status, vendor:vendors!purchase_orders_vendor_id_fkey(id, company_name, contact_person, mobile_number, whatsapp_number)",
    )
    .in("status", ["sent", "acknowledged", "partially_received"])
    .order("created_at", { ascending: false })
    .limit(25);

  if (delError) {
    console.error("[scanner] Error fetching delivery purchase orders:", delError);
  }

  const typedDelivery = (deliveryPOs ?? []) as unknown as ScannedPurchaseOrderRow[];
  for (const po of typedDelivery) {
    const vendor = po.vendor;
    const vendorName = vendor?.company_name || "Supplier Partner";
    const phone = vendor?.mobile_number || vendor?.whatsapp_number || "";
    const poNo = po.po_no || "PO";

    const targetDate = po.vendor_delivery_date || po.expected_date;
    const isDelayed = po.delivery_risk === "delayed";
    const isPartiallyReceived = po.status === "partially_received";
    const isOverdue = targetDate ? new Date(targetDate) < now : false;
    const isDueSoon = targetDate ? new Date(targetDate) <= next48Hours : false;
    const isOlderOpenOrder =
      !targetDate && new Date(po.order_date).getTime() < sevenDaysAgo.getTime();

    if (!isDelayed && !isOverdue && !isDueSoon && !isPartiallyReceived && !isOlderOpenOrder) {
      continue;
    }

    const reason = isDelayed
      ? `PO ${poNo} flagged with delivery risk 'delayed'.`
      : isOverdue
        ? `Delivery for PO ${poNo} was due on ${formatDate(targetDate!)} and is now overdue.`
        : isDueSoon
          ? `Delivery for PO ${poNo} is due within 48 hours (${formatDate(targetDate!)}).`
          : isPartiallyReceived
            ? `PO ${poNo} is partially received; remaining lot shipment pending.`
            : `PO ${poNo} has been open for >7 days without confirmed dispatch date.`;

    const draft: AgentDraftPayload = {
      channel: "whatsapp",
      recipientName: vendorName,
      recipientContact: phone,
      messageText: `Greetings ${vendorName}, following up on delivery status for Stone Tech PO ${poNo}${targetDate ? ` (scheduled: ${formatDate(targetDate)})` : ""}. Kindly share transit details / LR number or let us know the current dispatch status.`,
      referenceEntity: {
        type: "purchase_order",
        id: po.id,
        code: poNo,
        title: `PO ${poNo}`,
      },
      reason,
      supportingFacts: {
        poNo,
        expectedDate: targetDate,
        isOverdue,
        deliveryRisk: po.delivery_risk ?? null,
        status: po.status ?? null,
      },
    };
    draft.draftHash = createDraftHash(draft);

    tasks.push({
      id: `purchase_delivery_${po.id}`,
      agentId: "purchase_followup",
      actionType: "delivery_check_reminder",
      title: `${isOverdue || isDelayed ? "Overdue Delivery Alert" : "Delivery Due Check"}: PO ${poNo} (${vendorName})`,
      priority: isOverdue || isDelayed ? "urgent" : "high",
      status: "awaiting_approval",
      createdAt: targetDate || po.order_date || now.toISOString(),
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
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Overdue Receivables (invoices with outstanding balance past due_date or >15 days)
  const { data: overdueInvoices, error: invError } = await db
    .from("invoices")
    .select(
      "id, invoice_no, total, balance_due, issue_date, due_date, customer:customers!invoices_customer_id_fkey(id, name, customer_code)",
    )
    .gt("balance_due", 0)
    .order("issue_date", { ascending: false })
    .limit(25);

  if (invError) {
    console.error("[scanner] Error fetching overdue invoices:", invError);
  }

  const typedInvoices = (overdueInvoices ?? []) as unknown as ScannedInvoiceRow[];
  for (const inv of typedInvoices) {
    const isPastDue = inv.due_date ? new Date(inv.due_date) < now : inv.issue_date < fifteenDaysAgo;
    if (!isPastDue) continue;

    const customer = inv.customer;
    const customerName = customer?.name || "Customer";
    const balanceStr = formatInr(inv.balance_due || 0);

    const draft: AgentDraftPayload = {
      channel: "internal_review",
      recipientName: "Finance & Accounts Team",
      messageText: `[ACCOUNTING AUDIT NOTE]\nInvoice ${inv.invoice_no} (${customerName}) has an outstanding balance of ${balanceStr}. Issued on ${formatDate(inv.issue_date)}${inv.due_date ? ` (due: ${formatDate(inv.due_date)})` : ""}.\nRecommended action: Verify with bank statement whether remittance was received under an alternate reference or assign commercial follow-up to sales.`,
      referenceEntity: {
        type: "invoice",
        id: inv.id,
        code: inv.invoice_no,
        title: `Invoice ${inv.invoice_no} (${balanceStr})`,
      },
      reason: `Invoice ${inv.invoice_no} is overdue with outstanding balance ${balanceStr}.`,
      supportingFacts: {
        invoiceNo: inv.invoice_no,
        issueDate: inv.issue_date,
        dueDate: inv.due_date ?? null,
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
  const { data: unallocatedReceipts, error: rcptError } = await db
    .from("receipts")
    .select(
      "id, receipt_no, amount, unallocated_amount, received_at, customer:customers!receipts_customer_id_fkey(id, name)",
    )
    .gt("unallocated_amount", 0)
    .order("received_at", { ascending: false })
    .limit(20);

  if (rcptError) {
    console.error("[scanner] Error fetching unallocated receipts:", rcptError);
  }

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

/**
 * Scans for pending customer complaints, service requests, and website inquiries
 * submitted via StoneMan live customer desk.
 */
export async function scanStoneManDesk(
  db: SupabaseClient,
  _userId?: string,
): Promise<AgentTaskItem[]> {
  const tasks: AgentTaskItem[] = [];
  const now = new Date();

  // 1. Pending Customer Complaints & Service Requests in vie_actions
  try {
    const { data: complaints, error: compError } = await db
      .from("vie_actions")
      .select(
        "id, request_id, raw_text, entities, plan, status, created_at, linked_record_type, linked_record_id",
      )
      .eq("intent", "stoneman_complaint")
      .in("status", ["pending", "awaiting_confirmation"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (compError) {
      console.warn("[scanner] Error fetching vie_actions for StoneMan:", compError);
    } else if (complaints) {
      for (const c of complaints) {
        const entities = (c.entities || {}) as Record<string, unknown>;
        const ticketId = (entities.ticketId as string) || `TCK-${c.id.slice(0, 8).toUpperCase()}`;
        const customerName = (entities.name as string) || "Customer";
        const phone = (entities.phone as string) || "";
        const details = c.raw_text || "Website customer complaint / escalation";

        const draft: AgentDraftPayload = {
          channel: "internal_review",
          recipientName: "Stone Tech Support Desk",
          messageText: `[CUSTOMER CARE TICKET ${ticketId}]\nCustomer: ${customerName} (${phone})\nConcern:\n${details.trim()}\n\nEscalation: Review customer order details and assign callback.`,
          referenceEntity: {
            type: "customer_complaint",
            id: c.id,
            code: ticketId,
            title: `Service Request ${ticketId} (${customerName})`,
          },
          reason: `Service complaint submitted via StoneMan assistant on ${formatDate(c.created_at)}.`,
          supportingFacts: {
            ticketId,
            customerName,
            phone,
            details,
            createdAt: c.created_at,
          },
        };
        draft.draftHash = createDraftHash(draft);

        tasks.push({
          id: `stoneman_complaint_${c.id}`,
          agentId: "stoneman_customer",
          actionType: "customer_complaint_resolution",
          title: `Resolve Customer Ticket #${ticketId} — ${customerName}`,
          priority: "urgent",
          status: "awaiting_approval",
          createdAt: c.created_at,
          updatedAt: now.toISOString(),
          linkedRecordType: "customer_complaint",
          linkedRecordId: c.id,
          draft,
        });
      }
    }
  } catch (err) {
    console.warn("[scanner] Error during StoneMan complaint scan:", err);
  }

  // 2. Open Website / Direct Enquiries awaiting initial callback
  try {
    const { data: webEnquiries, error: enqError } = await db
      .from("enquiries")
      .select(
        "id, enquiry_no, requirement, budget_inr, created_at, customer:customers!enquiries_customer_id_fkey(id, name, primary_phone)",
      )
      .in("stage", ["new_lead"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (enqError) {
      console.warn("[scanner] Error fetching website enquiries for StoneMan:", enqError);
    } else if (webEnquiries) {
      for (const enq of webEnquiries) {
        const customer = enq.customer as unknown as ScannedCustomerContext | null;
        const customerName = customer?.name || "Website Visitor";
        const phone = customer?.primary_phone || "";
        const enqNo = enq.enquiry_no || "Enquiry";

        const draft: AgentDraftPayload = {
          channel: "whatsapp",
          recipientName: customerName,
          recipientContact: phone,
          messageText: `Namaste ${customerName}! Stone Tech Customer Desk following up on your inquiry (${enqNo}) regarding ${enq.requirement || "natural stone specifications"}. How may we assist your project today?`,
          referenceEntity: {
            type: "enquiry",
            id: enq.id,
            code: enqNo,
            title: `Enquiry ${enqNo}`,
          },
          reason: `Customer enquiry ${enqNo} logged on ${formatDate(enq.created_at)} pending StoneMan desk follow-up.`,
          supportingFacts: {
            enquiryNo: enqNo,
            requirement: enq.requirement,
            customerName,
          },
        };
        draft.draftHash = createDraftHash(draft);

        tasks.push({
          id: `stoneman_enq_${enq.id}`,
          agentId: "stoneman_customer",
          actionType: "visitor_assistance_followup",
          title: `Assist Website Visitor: ${enqNo} — ${customerName}`,
          priority: "high",
          status: "awaiting_approval",
          createdAt: enq.created_at,
          updatedAt: now.toISOString(),
          linkedRecordType: "enquiry",
          linkedRecordId: enq.id,
          draft,
        });
      }
    }
  } catch (err) {
    console.warn("[scanner] Error during StoneMan enquiry scan:", err);
  }

  return tasks;
}
