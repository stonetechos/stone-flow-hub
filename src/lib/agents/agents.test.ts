import { describe, expect, it } from "bun:test";
import { AGENT_DEFINITIONS, isToolAllowedForAgent, isOperationRestricted } from "./config";
import { createDraftHash, isDraftTampered, resolveExecutionDispatch } from "./approval";
import type { AgentDraftPayload, AgentTaskItem } from "./types";
import {
  lookupVerifiedOrder,
  STONEMAN_PUBLIC_FAQS,
  computeOrderPin,
  stageStonemanComplaint,
} from "./stoneman/service";
import {
  getSchedulerConfig,
  updateSchedulerConfig,
  getSchedulerStatus,
  runScheduledAgentScan,
  deduplicateAndStageTasks,
  scanLocks,
  inMemoryTasks,
  DEFAULT_SCHEDULER_CONFIG,
} from "./scheduler";

describe("Four-Agent Suite: Agent Tool Isolation & Permissions", () => {
  it("enforces strict tool allowlist for Sales Follow-up Agent", () => {
    expect(isToolAllowedForAgent("sales_followup", "list_stale_quotes")).toBe(true);
    expect(isToolAllowedForAgent("sales_followup", "list_enquiries_needing_response")).toBe(true);

    // Forbidden tools from other domains
    expect(isToolAllowedForAgent("sales_followup", "list_unconfirmed_purchase_orders")).toBe(false);
    expect(isToolAllowedForAgent("sales_followup", "audit_customer_ledgers")).toBe(false);
    expect(isToolAllowedForAgent("sales_followup", "create_or_cancel_purchase_orders")).toBe(false);

    // Restricted operations
    expect(isOperationRestricted("sales_followup", "autonomous_outbound_dispatch")).toBe(true);
    expect(isOperationRestricted("sales_followup", "modify_financial_records")).toBe(true);
  });

  it("enforces strict tool allowlist for Purchase Follow-up Agent", () => {
    expect(isToolAllowedForAgent("purchase_followup", "list_unconfirmed_purchase_orders")).toBe(
      true,
    );
    expect(isToolAllowedForAgent("purchase_followup", "list_approaching_deliveries")).toBe(true);

    // Forbidden tools from other domains
    expect(isToolAllowedForAgent("purchase_followup", "list_stale_quotes")).toBe(false);
    expect(isToolAllowedForAgent("purchase_followup", "audit_customer_ledgers")).toBe(false);

    // Restricted operations
    expect(isOperationRestricted("purchase_followup", "autonomous_outbound_dispatch")).toBe(true);
    expect(isOperationRestricted("purchase_followup", "create_or_cancel_purchase_orders")).toBe(
      true,
    );
    expect(isOperationRestricted("purchase_followup", "disclose_vendor_data_to_customers")).toBe(
      true,
    );
  });

  it("enforces strict read-only boundary for Accounting Agent", () => {
    expect(isToolAllowedForAgent("accounting", "audit_customer_ledgers")).toBe(true);
    expect(isToolAllowedForAgent("accounting", "detect_reconciliation_exceptions")).toBe(true);

    // Forbidden tools & operations
    expect(isToolAllowedForAgent("accounting", "list_stale_quotes")).toBe(false);
    expect(isOperationRestricted("accounting", "autonomous_ledger_posting")).toBe(true);
    expect(isOperationRestricted("accounting", "create_journal_entries")).toBe(true);
    expect(isOperationRestricted("accounting", "execute_money_transfers")).toBe(true);
    expect(isOperationRestricted("accounting", "issue_refunds_or_writeoffs")).toBe(true);
  });

  it("enforces strict privacy boundary for StoneMan Customer Assistant", () => {
    expect(isToolAllowedForAgent("stoneman_customer", "get_public_catalog_info")).toBe(true);
    expect(isToolAllowedForAgent("stoneman_customer", "stage_customer_complaint")).toBe(true);
    expect(isToolAllowedForAgent("stoneman_customer", "lookup_verified_order_status")).toBe(true);

    // Forbidden: internal notes, margins, and vendor identities
    expect(isOperationRestricted("stoneman_customer", "expose_internal_notes")).toBe(true);
    expect(isOperationRestricted("stoneman_customer", "expose_vendor_supplier_identities")).toBe(
      true,
    );
    expect(isOperationRestricted("stoneman_customer", "expose_purchase_costs_or_margins")).toBe(
      true,
    );
    expect(isOperationRestricted("stoneman_customer", "expose_unverified_customer_data")).toBe(
      true,
    );
  });
});

describe("Four-Agent Suite: Zero-Outbound & Human Approval Layer", () => {
  const sampleDraft: AgentDraftPayload = {
    channel: "whatsapp",
    recipientName: "Ramesh Patel",
    recipientContact: "9876543210",
    messageText: "Namaste Ramesh Patel, following up on your quotation QUO-00123.",
    referenceEntity: {
      type: "quote",
      id: "123e4567-e89b-12d3-a456-426614174000",
      code: "QUO-00123",
    },
    reason: "Quote sent 4 days ago awaiting customer response.",
    supportingFacts: {
      quoteNo: "QUO-00123",
      amount: 150000,
    },
  };

  it("generates deterministic draft hash and detects tampering", () => {
    const hash = createDraftHash(sampleDraft);
    expect(hash).toMatch(/^hash_/);
    expect(isDraftTampered(sampleDraft, hash)).toBe(false);

    // Modifying message text invalidates hash
    const tamperedDraft = { ...sampleDraft, messageText: "Modified unauthorized message" };
    expect(isDraftTampered(tamperedDraft, hash)).toBe(true);

    // Modifying recipient phone invalidates hash
    const tamperedPhone = { ...sampleDraft, recipientContact: "9999999999" };
    expect(isDraftTampered(tamperedPhone, hash)).toBe(true);
  });

  it("blocks execution when action is not explicitly approved", () => {
    const task: AgentTaskItem = {
      id: "task_1",
      agentId: "sales_followup",
      actionType: "stale_quotation_followup",
      title: "Follow up on QUO-00123",
      priority: "high",
      status: "awaiting_approval", // NOT approved
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedRecordType: "quote",
      linkedRecordId: "123e4567-e89b-12d3-a456-426614174000",
      draft: sampleDraft,
    };

    expect(() => resolveExecutionDispatch(task, "user_1")).toThrow(
      /Explicit human approval is required/,
    );
  });

  it("blocks execution when draft was modified after approval", () => {
    const originalHash = createDraftHash(sampleDraft);
    const tamperedDraft = {
      ...sampleDraft,
      messageText: "Tampered unapproved discount promise of 50%",
      draftHash: originalHash, // Stale hash from prior approval
    };

    const task: AgentTaskItem = {
      id: "task_2",
      agentId: "sales_followup",
      actionType: "stale_quotation_followup",
      title: "Follow up on QUO-00123",
      priority: "high",
      status: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedRecordType: "quote",
      linkedRecordId: "123e4567-e89b-12d3-a456-426614174000",
      draft: tamperedDraft,
    };

    expect(() => resolveExecutionDispatch(task, "user_1")).toThrow(
      /Draft content was modified after approval/,
    );
  });

  it("strictly enforces review-only execution for Accounting Agent", () => {
    const accountingDraft: AgentDraftPayload = {
      channel: "internal_review",
      recipientName: "Finance Team",
      messageText: "Invoice INV-0045 overdue >30 days.",
      referenceEntity: { type: "invoice", id: "inv_1" },
      reason: "Audit exception",
      supportingFacts: {},
    };
    accountingDraft.draftHash = createDraftHash(accountingDraft);

    const task: AgentTaskItem = {
      id: "task_3",
      agentId: "accounting",
      actionType: "overdue_receivable_review",
      title: "Overdue INV-0045",
      priority: "high",
      status: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedRecordType: "invoice",
      linkedRecordId: "inv_1",
      draft: accountingDraft,
    };

    expect(() => resolveExecutionDispatch(task, "user_1")).toThrow(
      /Accounting Agent actions are strictly review-only/,
    );
  });

  it("returns interactive WhatsApp dispatch URL for approved sales actions", () => {
    const draftWithHash = { ...sampleDraft, draftHash: createDraftHash(sampleDraft) };
    const task: AgentTaskItem = {
      id: "task_4",
      agentId: "sales_followup",
      actionType: "stale_quotation_followup",
      title: "Follow up on QUO-00123",
      priority: "high",
      status: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedRecordType: "quote",
      linkedRecordId: "123e4567-e89b-12d3-a456-426614174000",
      draft: draftWithHash,
    };

    const dispatch = resolveExecutionDispatch(task, "user_1");
    expect(dispatch.actionUrl).toBeDefined();
    expect(dispatch.actionUrl).toMatch(/(whatsapp:\/\/send|web\.whatsapp\.com)/);
    expect(dispatch.actionUrl).toContain("919876543210");
  });
});

describe("Four-Agent Suite: StoneMan Customer Assistant & Privacy", () => {
  it("provides public FAQs without leaking sensitive data", () => {
    expect(STONEMAN_PUBLIC_FAQS.length).toBeGreaterThan(0);
    for (const faq of STONEMAN_PUBLIC_FAQS) {
      expect(faq.question).toBeDefined();
      expect(faq.answer).toBeDefined();
      // Must not leak internal credentials, margins, or vendor identities
      expect(faq.answer).not.toContain("margin");
      expect(faq.answer).not.toContain("purchase_cost");
      expect(faq.answer).not.toContain("secret");
    }
  });

  it("rejects order lookups without a valid registered phone number", async () => {
    const mockDb = {} as unknown as Parameters<typeof lookupVerifiedOrder>[1];
    expect(lookupVerifiedOrder({ orderNo: "SO-001", phone: "123" }, mockDb)).rejects.toThrow(
      /valid 10-digit registered phone number is required/,
    );
  });

  it("computes deterministic 6-digit security PIN based on order and phone", () => {
    const pin1 = computeOrderPin("SO-2026-0042", "9876543210");
    const pin2 = computeOrderPin("SO-2026-0042", "9876543210");
    const pinDiffPhone = computeOrderPin("SO-2026-0042", "9876543211");
    const pinDiffOrder = computeOrderPin("SO-2026-0043", "9876543210");

    expect(pin1).toMatch(/^\d{6}$/);
    expect(pin1).toBe(pin2);
    expect(pin1).not.toBe(pinDiffPhone);
    expect(pin1).not.toBe(pinDiffOrder);
  });

  it("rejects order status lookups when PIN is missing or invalid", async () => {
    const mockDb = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            maybeSingle: async () => ({
              data: {
                id: "so_1",
                so_no: "SO-2026-0042",
                order_date: "2026-04-01",
                status: "confirmed",
                delivery_date: "2026-04-20",
                customer: {
                  id: "cust_1",
                  name: "Vikram Malhotra",
                  primary_phone: "9876543210",
                },
                items: [
                  {
                    product_name: "Italian Statuario Marble",
                    description: "Polished slabs",
                    quantity: 450,
                    unit: "sqft",
                  },
                ],
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof lookupVerifiedOrder>[1];

    // Missing PIN
    expect(
      lookupVerifiedOrder({ orderNo: "SO-2026-0042", phone: "9876543210" }, mockDb),
    ).rejects.toThrow(/PIN is required/);

    // Wrong PIN
    expect(
      lookupVerifiedOrder(
        { orderNo: "SO-2026-0042", phone: "9876543210", verificationCode: "000000" },
        mockDb,
      ),
    ).rejects.toThrow(/Invalid verification PIN/);
  });

  it("returns sanitized customer-safe details when phone and PIN match", async () => {
    const correctPin = computeOrderPin("SO-2026-0042", "9876543210");

    const mockDb = {
      from: () => ({
        select: () => ({
          ilike: () => ({
            maybeSingle: async () => ({
              data: {
                id: "so_1",
                so_no: "SO-2026-0042",
                order_date: "2026-04-01",
                status: "manufacturing",
                delivery_date: "2026-04-20",
                customer: {
                  id: "cust_1",
                  name: "Vikram Malhotra",
                  primary_phone: "9876543210",
                },
                items: [
                  {
                    product_name: "Italian Statuario Marble",
                    description: "Polished slabs",
                    quantity: 450,
                    unit: "sqft",
                  },
                ],
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof lookupVerifiedOrder>[1];

    const result = await lookupVerifiedOrder(
      { orderNo: "SO-2026-0042", phone: "9876543210", verificationCode: correctPin },
      mockDb,
    );

    expect(result.orderNo).toBe("SO-2026-0042");
    expect(result.statusText).toContain("In Production");
    expect(result.itemsSummary).toHaveLength(1);
    expect(result.itemsSummary[0].itemDescription).toBe("Italian Statuario Marble");

    // Strictly ensure no sensitive fields exist in the result object
    const rawResult = result as unknown as Record<string, unknown>;
    expect(rawResult.vendor).toBeUndefined();
    expect(rawResult.vendor_id).toBeUndefined();
    expect(rawResult.supplier).toBeUndefined();
    expect(rawResult.purchase_cost).toBeUndefined();
    expect(rawResult.margin).toBeUndefined();
    expect(rawResult.internal_notes).toBeUndefined();
  });

  it("registers customer complaint and assigns tracking reference", async () => {
    const mockDb = {
      from: (table: string) => ({
        select: () => ({
          ilike: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
          limit: () => ({
            maybeSingle: async () => ({ data: { id: "profile_1" } }),
          }),
        }),
        insert: async () => ({ error: null }),
      }),
    } as unknown as Parameters<typeof stageStonemanComplaint>[1];

    const complaint = await stageStonemanComplaint(
      {
        customerName: "Ananya Sharma",
        phone: "9812345678",
        orderNo: "SO-0099",
        complaintDetails: "Edge polishing on 2 tiles requires inspection.",
      },
      mockDb,
    );

    expect(complaint.ticketId).toMatch(/^ST-CARE-\d{6}$/);
    expect(complaint.acknowledgementMessage).toContain(complaint.ticketId);
  });
});

describe("Four-Agent Suite: Background Automation & Scheduler", () => {
  it("provides sensible default configuration for internal agents", async () => {
    const config = await getSchedulerConfig(null);
    expect(config.globalEnabled).toBe(true);
    expect(config.agents.sales_followup.enabled).toBe(true);
    expect(config.agents.sales_followup.intervalMinutes).toBe(60);
    expect(config.agents.purchase_followup.enabled).toBe(true);
    expect(config.agents.purchase_followup.intervalMinutes).toBe(60);
    expect(config.agents.accounting.enabled).toBe(true);
    expect(config.agents.accounting.intervalMinutes).toBe(120);

    // StoneMan must NOT be present in periodic schedule config
    expect((config.agents as Record<string, unknown>).stoneman_customer).toBeUndefined();
  });

  it("allows updating interval cadence and independent enable/disable controls", async () => {
    const updated = await updateSchedulerConfig(
      {
        globalEnabled: true,
        agents: {
          sales_followup: { enabled: true, intervalMinutes: 30 },
          purchase_followup: { enabled: false, intervalMinutes: 90 },
          accounting: { enabled: true, intervalMinutes: 180 },
        },
      },
      null,
    );

    expect(updated.agents.sales_followup.intervalMinutes).toBe(30);
    expect(updated.agents.purchase_followup.enabled).toBe(false);
    expect(updated.agents.accounting.intervalMinutes).toBe(180);

    // Reset back to defaults for clean isolation
    await updateSchedulerConfig(DEFAULT_SCHEDULER_CONFIG, null);
  });

  it("strictly rejects background scheduled scans for StoneMan Mascot (event-driven)", async () => {
    const mockDb = {} as unknown as Parameters<typeof runScheduledAgentScan>[1];
    expect(
      runScheduledAgentScan("stoneman_customer" as never, mockDb, "manual", true),
    ).rejects.toThrow(/StoneMan is event-driven/);
  });

  it("prevents overlapping scans for the same agent using concurrency locks", async () => {
    const mockDb = {} as unknown as Parameters<typeof runScheduledAgentScan>[1];

    // Simulate active scan lock on sales_followup
    scanLocks.set("sales_followup", Date.now());

    try {
      expect(runScheduledAgentScan("sales_followup", mockDb, "manual", true)).rejects.toThrow(
        /Overlapping scan prevented/,
      );
    } finally {
      // Clean up lock
      scanLocks.delete("sales_followup");
    }
  });

  it("deduplicates unresolved tasks and prevents duplicate recommendations", () => {
    const candidate1: AgentTaskItem = {
      id: "sales_quote_dup_1",
      agentId: "sales_followup",
      actionType: "stale_quotation_followup",
      title: "Follow up on QUO-99",
      priority: "high",
      status: "awaiting_approval",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedRecordType: "quote",
      linkedRecordId: "quo_dup_1",
      draft: {
        channel: "whatsapp",
        recipientName: "Test Client",
        messageText: "Follow up message",
        referenceEntity: { type: "quote", id: "quo_dup_1" },
        reason: "Stale quote",
        supportingFacts: {},
      },
    };

    // First addition succeeds
    const res1 = deduplicateAndStageTasks([candidate1]);
    expect(res1.newCount).toBe(1);

    // Second addition with same ID is skipped (no duplicate created)
    const res2 = deduplicateAndStageTasks([candidate1]);
    expect(res2.newCount).toBe(0);

    // Candidate with different ID but same linked record and unresolved status is also skipped
    const candidateWithDifferentId = {
      ...candidate1,
      id: "sales_quote_dup_alternate_key",
    };
    const res3 = deduplicateAndStageTasks([candidateWithDifferentId]);
    expect(res3.newCount).toBe(0);

    // Cleanup
    inMemoryTasks.delete("sales_quote_dup_1");
  });

  it("prevents repeated execution of an already executed action", () => {
    const alreadyExecutedTask: AgentTaskItem = {
      id: "task_executed_already",
      agentId: "sales_followup",
      actionType: "stale_quotation_followup",
      title: "Follow up on QUO-888",
      priority: "high",
      status: "executed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedRecordType: "quote",
      linkedRecordId: "quo_888",
      draft: {
        channel: "whatsapp",
        recipientName: "Customer A",
        messageText: "Hello Customer",
        referenceEntity: { type: "quote", id: "quo_888" },
        reason: "Stale",
        supportingFacts: {},
      },
    };

    inMemoryTasks.set(alreadyExecutedTask.id, alreadyExecutedTask);

    // Trying to deduplicate/stage an already executed task is ignored
    const res = deduplicateAndStageTasks([alreadyExecutedTask]);
    expect(res.newCount).toBe(0);

    // Trying to resolve dispatch on already executed task throws
    expect(() => resolveExecutionDispatch(alreadyExecutedTask, "user_1")).toThrow(
      /Explicit human approval is required/,
    );

    // Cleanup
    inMemoryTasks.delete(alreadyExecutedTask.id);
  });

  it("records scan failures and updates lastFailedScanAt in scheduler status", async () => {
    const failingDb = {
      from: () => {
        throw new Error("Simulated database timeout on quote scan");
      },
    } as unknown as Parameters<typeof runScheduledAgentScan>[1];

    expect(runScheduledAgentScan("sales_followup", failingDb, "manual", true)).rejects.toThrow(
      /Simulated database timeout/,
    );

    const status = await getSchedulerStatus(null);
    expect(status.agents.sales_followup.lastFailedScanAt).toBeDefined();
    expect(status.agents.sales_followup.lastError).toContain("Simulated database timeout");
    expect(status.recentHistory[0].status).toBe("failed");
    expect(status.recentHistory[0].errorMessage).toContain("Simulated database timeout");
  });
});
