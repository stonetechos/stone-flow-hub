/**
 * Four-Agent AI Suite — TanStack Start Server Functions.
 *
 * Implements authenticated backend endpoints for agent task scanning,
 * draft generation, human approval, and zero-outbound execution.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff } from "@/lib/ai/require-staff";
import { withAuthenticatedClient, getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { AGENT_DEFINITIONS } from "./config";
import type { AgentId, AgentTaskItem, AgentSuiteOverview } from "./types";
import {
  scanSalesFollowups,
  scanPurchaseFollowups,
  scanAccountingExceptions,
  scanStoneManDesk,
} from "./scanner";
import { createDraftHash, isDraftTampered, resolveExecutionDispatch } from "./approval";
import {
  lookupVerifiedOrder,
  requestOrderVerificationPin,
  stageStonemanComplaint,
  type CustomerSafeOrderDetails,
} from "./stoneman/service";

import {
  inMemoryTasks,
  getSchedulerConfig,
  updateSchedulerConfig,
  getSchedulerStatus,
  runScheduledAgentScan,
  runAllScheduledScans,
  deduplicateAndStageTasks,
  type ScheduledAgentId,
  type AgentSchedulerStatus,
} from "./scheduler";

const agentScanTimestamps = new Map<AgentId, string>();

/**
 * Overview of all four agents, their statuses, and pending approvals.
 */
export const getAgentSuiteOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentSuiteOverview> => {
    await requireStaff(context);

    return withAuthenticatedClient(context.supabase, async () => {
      const allTasks = Array.from(inMemoryTasks.values());

      const schedStatus = await getSchedulerStatus(getDb());

      const agentStats: AgentSuiteOverview["agents"] = {
        sales_followup: {
          enabled: schedStatus.agents.sales_followup.enabled,
          pendingCount: allTasks.filter(
            (t) => t.agentId === "sales_followup" && t.status === "awaiting_approval",
          ).length,
          approvedCount: allTasks.filter(
            (t) => t.agentId === "sales_followup" && t.status === "approved",
          ).length,
          lastScannedAt:
            schedStatus.agents.sales_followup.lastSuccessfulScanAt ||
            agentScanTimestamps.get("sales_followup") ||
            null,
        },
        purchase_followup: {
          enabled: schedStatus.agents.purchase_followup.enabled,
          pendingCount: allTasks.filter(
            (t) => t.agentId === "purchase_followup" && t.status === "awaiting_approval",
          ).length,
          approvedCount: allTasks.filter(
            (t) => t.agentId === "purchase_followup" && t.status === "approved",
          ).length,
          lastScannedAt:
            schedStatus.agents.purchase_followup.lastSuccessfulScanAt ||
            agentScanTimestamps.get("purchase_followup") ||
            null,
        },
        accounting: {
          enabled: schedStatus.agents.accounting.enabled,
          pendingCount: allTasks.filter(
            (t) => t.agentId === "accounting" && t.status === "awaiting_approval",
          ).length,
          approvedCount: allTasks.filter(
            (t) => t.agentId === "accounting" && t.status === "approved",
          ).length,
          lastScannedAt:
            schedStatus.agents.accounting.lastSuccessfulScanAt ||
            agentScanTimestamps.get("accounting") ||
            null,
        },
        stoneman_customer: {
          enabled: true,
          pendingCount: allTasks.filter(
            (t) => t.agentId === "stoneman_customer" && t.status === "awaiting_approval",
          ).length,
          approvedCount: allTasks.filter(
            (t) => t.agentId === "stoneman_customer" && t.status === "approved",
          ).length,
          lastScannedAt: agentScanTimestamps.get("stoneman_customer") || null,
        },
      };

      const totalPendingApproval = allTasks.filter((t) => t.status === "awaiting_approval").length;
      const totalAlerts = allTasks.length;

      return {
        agents: agentStats,
        totalPendingApproval,
        totalAlerts,
      };
    });
  });

const listTasksInput = z.object({
  agentId: z
    .enum(["sales_followup", "purchase_followup", "accounting", "stoneman_customer"])
    .optional(),
  status: z.string().optional(),
});

/**
 * Returns tasks for an agent with optional status filters.
 */
export const listAgentTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listTasksInput.parse(d))
  .handler(async ({ data, context }): Promise<AgentTaskItem[]> => {
    await requireStaff(context);

    return withAuthenticatedClient(context.supabase, async () => {
      let list = Array.from(inMemoryTasks.values());

      if (data.agentId) {
        list = list.filter((t) => t.agentId === data.agentId);
      }
      if (data.status && data.status !== "all") {
        list = list.filter((t) => t.status === data.status);
      }

      // Sort by urgent priority first, then newest
      const priorityWeights: Record<string, number> = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      return list.sort((a, b) => {
        const pDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
  });

const runScanInput = z.object({
  agentId: z.enum(["sales_followup", "purchase_followup", "accounting", "stoneman_customer"]),
});

/**
 * Triggers a live database scan for an agent.
 */
export const runAgentScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => runScanInput.parse(d))
  .handler(async ({ data, context }): Promise<{ scanned: number; newTasksCount: number }> => {
    await requireStaff(context);

    if (data.agentId === "stoneman_customer") {
      return withAuthenticatedClient(context.supabase, async () => {
        const db = getDb();
        const generatedTasks = await scanStoneManDesk(db, context.userId);
        const { newCount } = deduplicateAndStageTasks(generatedTasks);
        const nowIso = new Date().toISOString();
        agentScanTimestamps.set("stoneman_customer", nowIso);
        return { scanned: generatedTasks.length, newTasksCount: newCount };
      });
    }

    return withAuthenticatedClient(context.supabase, async () => {
      const db = getDb();
      const record = await runScheduledAgentScan(
        data.agentId as ScheduledAgentId,
        db,
        "manual",
        true,
        context.userId,
      );

      agentScanTimestamps.set(data.agentId, record.completedAt);
      return { scanned: record.scannedCount, newTasksCount: record.newTasksCount };
    });
  });

const approveActionInput = z.object({
  taskId: z.string(),
});

/**
 * Human Approval: explicitly approves a staged task.
 */
export const approveAgentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => approveActionInput.parse(d))
  .handler(async ({ data, context }): Promise<AgentTaskItem> => {
    await requireStaff(context);

    const task = inMemoryTasks.get(data.taskId);
    if (!task) {
      throw new AppError("Task not found", "TASK_NOT_FOUND", 404);
    }

    task.status = "approved";
    task.approvedBy = context.userId;
    task.approvedAt = new Date().toISOString();
    // Ensure draft hash matches current content
    task.draft.draftHash = createDraftHash(task.draft);
    task.updatedAt = new Date().toISOString();

    inMemoryTasks.set(task.id, task);
    return task;
  });

const rejectActionInput = z.object({
  taskId: z.string(),
  reason: z.string().optional(),
});

/**
 * Rejects a staged task recommendation.
 */
export const rejectAgentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rejectActionInput.parse(d))
  .handler(async ({ data, context }): Promise<AgentTaskItem> => {
    await requireStaff(context);

    const task = inMemoryTasks.get(data.taskId);
    if (!task) {
      throw new AppError("Task not found", "TASK_NOT_FOUND", 404);
    }

    task.status = "rejected";
    task.updatedAt = new Date().toISOString();
    task.errorMessage = data.reason || "Rejected by authorized reviewer.";

    inMemoryTasks.set(task.id, task);
    return task;
  });

const updateDraftInput = z.object({
  taskId: z.string(),
  messageText: z.string().min(1),
});

/**
 * Editing a draft updates text and invalidates any previous approval.
 */
export const updateAgentDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateDraftInput.parse(d))
  .handler(async ({ data, context }): Promise<AgentTaskItem> => {
    await requireStaff(context);

    const task = inMemoryTasks.get(data.taskId);
    if (!task) {
      throw new AppError("Task not found", "TASK_NOT_FOUND", 404);
    }

    task.draft.messageText = data.messageText;
    // CRITICAL SECURITY: Editing draft invalidates approval and forces re-approval
    task.status = "awaiting_approval";
    task.approvedBy = null;
    task.approvedAt = null;
    task.draft.draftHash = createDraftHash(task.draft);
    task.updatedAt = new Date().toISOString();

    inMemoryTasks.set(task.id, task);
    return task;
  });

const executeActionInput = z.object({
  taskId: z.string(),
});

/**
 * Resolves dispatch URL for human trigger. NEVER transmits in the background.
 * Enforces prevention of repeated execution.
 */
export const executeApprovedAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => executeActionInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);

    const task = inMemoryTasks.get(data.taskId);
    if (!task) {
      throw new AppError("Task not found", "TASK_NOT_FOUND", 404);
    }

    // Guard: Prevent repeated execution of the same action
    if (task.status === "executed") {
      throw new AppError("This action has already been executed.", "ACTION_ALREADY_EXECUTED", 400);
    }
    if (task.status === "rejected") {
      throw new AppError("Cannot execute a rejected action.", "ACTION_REJECTED", 400);
    }

    const dispatch = resolveExecutionDispatch(task, context.userId);

    task.status = "executed";
    task.updatedAt = new Date().toISOString();
    task.executionResult = {
      success: true,
      executedAt: new Date().toISOString(),
      actionUrl: dispatch.actionUrl,
      notes: dispatch.message,
    };

    inMemoryTasks.set(task.id, task);

    return {
      task,
      dispatch,
    };
  });

const requestPinInput = z.object({
  orderNo: z.string().min(1),
  phone: z.string().min(10),
});

/**
 * Public endpoint to request a 6-digit verification PIN for an order and registered phone.
 */
export const requestStonemanOrderPin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestPinInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb();
    return requestOrderVerificationPin(data.orderNo, data.phone, db);
  });

const stonemanOrderLookupInput = z.object({
  orderNo: z.string().min(1),
  phone: z.string().optional(),
  verificationCode: z.string().optional(),
  token: z.string().optional(),
});

/**
 * Public customer-facing order status lookup (requires phone + order verification).
 * When an order is tracked, automatically alerts superadmins on their Android phones
 * via high-priority curtain push notifications & WhatsApp alerts.
 */
export const lookupStonemanOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => stonemanOrderLookupInput.parse(d))
  .handler(async ({ data }): Promise<CustomerSafeOrderDetails> => {
    const db = getDb();
    const result = await lookupVerifiedOrder(data, db);

    // Notify superadmins on their Android phones through mobile curtain notifications
    void (async () => {
      try {
        const { notifyAdmins } = await import("@/lib/notifications/notify.server");
        const cleanPhone = (data.phone || "").replace(/\D+/g, "");
        const maskedPhone =
          cleanPhone.length >= 10
            ? `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-3)}`
            : "Verified Customer";

        await notifyAdmins({
          tier: "important",
          title: `📦 Order #${result.orderNo} Tracked Live`,
          body: `${result.customerName} (${maskedPhone}) just tracked status for Order #${result.orderNo} on the website. Status: ${result.statusText}`,
          entityType: "sales_orders",
          entityId: result.orderNo,
          linkPath: `/sales-orders`,
          deliverPush: true,
        });

        // Also push automated WhatsApp notification to admin phone
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const waMsg = `📦 *Customer Tracked Order #${result.orderNo}*\n\n*Customer:* ${result.customerName}\n*Phone:* ${data.phone || "Verified"}\n*Status:* ${result.statusText}\n*Time:* ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: mqErr } = await (supabaseAdmin as any).from("message_queue").insert({
          channel: "whatsapp",
          to_address: "917742090866",
          body: waMsg,
          related_type: "sales_order",
          related_id: result.orderNo,
        });

        if (!mqErr) {
          const { dispatchQueueBatch } = await import("@/lib/notifications/dispatch.server");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await dispatchQueueBatch(supabaseAdmin as any, 5);
        }
      } catch (notifyErr) {
        console.warn("[StoneMan] Superadmin tracking notification error:", notifyErr);
      }
    })();

    return result;
  });

const stonemanProcurementInput = z.object({
  customerName: z.string().trim().min(2, "Please enter your name"),
  phone: z.string().trim().min(10, "Please enter a valid 10-digit phone number"),
  city: z.string().trim().min(2, "Please enter your site location/city"),
  quantitySqft: z.string().trim().min(1, "Please specify estimated quantity (e.g. 250 sqft)"),
  productName: z.string().trim().min(2, "Please specify the product name or code"),
  specificRequirements: z.string().trim().optional().default(""),
});

/**
 * Public customer-facing Special Procurement Request intake by StoneMan for
 * discontinued or custom stone products. Automatically creates a CRM customer
 * and enquiry lead, and sends high-priority Android curtain notifications to superadmins.
 */
export const submitStonemanProcurementRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => stonemanProcurementInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Normalize phone
    const cleanDigits = data.phone.replace(/\D/g, "");
    const searchPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
    const normalizedPhone = `+91 ${cleanDigits}`;

    // 2. Find or create customer
    let customerId: string | null = null;
    let customerCode = "";

    try {
      const { data: existing } = await supabaseAdmin
        .from("customers")
        .select("id, name, customer_code")
        .or(`primary_phone.ilike.%${searchPhone}%,whatsapp.ilike.%${searchPhone}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        customerId = existing[0].id;
        customerCode = existing[0].customer_code;
      }
    } catch (err) {
      console.warn("[StoneMan] Find customer error:", err);
    }

    if (!customerId) {
      const fallbackCode = `CUST-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newCust } = await (supabaseAdmin as any)
        .from("customers")
        .insert({
          name: data.customerName,
          customer_code: fallbackCode,
          primary_phone: normalizedPhone,
          whatsapp: normalizedPhone,
          city: data.city,
          customer_type: "individual",
          source: "StoneMan AI — Special Procurement Request",
          notes: `Special procurement intake created by StoneMan on website for discontinued/custom stone: ${data.productName} (${data.quantitySqft}).`,
        })
        .select("id, customer_code")
        .single();

      if (newCust) {
        customerId = newCust.id;
        customerCode = newCust.customer_code;
      }
    }

    // 3. Generate sequential enquiry number
    const enquiryNo = `ENQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const requirementText = [
      `🚨 SPECIAL PROCUREMENT REQUEST (DISCONTINUED/CUSTOM PRODUCT)`,
      `Requested Product: ${data.productName}`,
      `Estimated Quantity: ${data.quantitySqft}`,
      `Site City: ${data.city}`,
      data.specificRequirements ? `Customer Notes: ${data.specificRequirements}` : "",
      `Created By: StoneMan AI Copilot on Website`,
    ]
      .filter(Boolean)
      .join("\n");

    // 4. Create CRM Enquiry entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiry, error: enqErr } = await (supabaseAdmin as any)
      .from("enquiries")
      .insert({
        enquiry_no: enquiryNo,
        customer_id: customerId,
        stage: "new_lead",
        priority: "high",
        source: "StoneMan AI — Special Procurement",
        requirement: requirementText,
        notes: `Customer WhatsApp: ${normalizedPhone} | City: ${data.city} | Special procurement request for ${data.productName} (${data.quantitySqft})`,
        external_ref: {
          product_name: data.productName,
          quantity_sqft: data.quantitySqft,
          client_city: data.city,
          submitted_at: new Date().toISOString(),
          channel: "stoneman_discontinued_product_intake",
        },
      })
      .select("id, enquiry_no")
      .single();

    if (enqErr || !enquiry) {
      console.error("[StoneMan] Enquiry insertion failed:", enqErr);
      throw new Error(enqErr?.message || "Failed to create special procurement request.");
    }

    // 5. Notify Superadmins on Android mobile curtain notifications & WhatsApp
    try {
      const { notifyAdmins } = await import("@/lib/notifications/notify.server");
      await notifyAdmins({
        tier: "critical",
        title: `🚨 Discontinued Stone Request: ${enquiryNo}`,
        body: `${data.customerName} (${data.phone}) requested discontinued product: ${data.productName} (${data.quantitySqft}) in ${data.city}. CRM Lead created.`,
        entityType: "enquiries",
        entityId: enquiry.id,
        linkPath: `/website-leads`,
        deliverPush: true,
      });

      // Send automated WhatsApp alert to admin phone
      const waMsg = `🚨 *Special Procurement Request: ${enquiryNo}*\n\n*Product:* ${data.productName}\n*Qty:* ${data.quantitySqft}\n*Customer:* ${data.customerName}\n*Phone:* ${data.phone}\n*City:* ${data.city}${data.specificRequirements ? `\n*Notes:* ${data.specificRequirements}` : ""}\n\n_Lead logged into STOS CRM by StoneMan._`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: mqErr } = await (supabaseAdmin as any).from("message_queue").insert({
        channel: "whatsapp",
        to_address: "917742090866",
        body: waMsg,
        customer_id: customerId,
        related_type: "enquiry",
        related_id: enquiry.id,
      });

      if (!mqErr) {
        const { dispatchQueueBatch } = await import("@/lib/notifications/dispatch.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await dispatchQueueBatch(supabaseAdmin as any, 5);
      }
    } catch (notifErr) {
      console.warn("[StoneMan] Notification to admins failed:", notifErr);
    }

    return {
      success: true,
      enquiryNo,
      enquiryId: enquiry.id,
      customerId,
      customerCode,
      message: `Your special request #${enquiryNo} for ${data.productName} has been logged in our CRM and sent directly to our admin team's mobile phones. We will review quarry availability and get back to you on WhatsApp at ${normalizedPhone}.`,
    };
  });

const stonemanComplaintInput = z.object({
  customerName: z.string().min(1),
  phone: z.string().min(10),
  orderNo: z.string().optional(),
  complaintDetails: z.string().min(5),
});

/**
 * Public customer-facing complaint intake into review queue.
 */
export const submitStonemanComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => stonemanComplaintInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDb();
    return stageStonemanComplaint(data, db);
  });

/**
 * Returns live scheduler status, config, history, and next scheduled runs.
 */
export const getAgentSchedulerOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AgentSchedulerStatus> => {
    await requireStaff(context);
    return withAuthenticatedClient(context.supabase, async () => {
      const db = getDb();
      return getSchedulerStatus(db);
    });
  });

const updateSchedulerConfigInput = z.object({
  globalEnabled: z.boolean().optional(),
  defaultIntervalMinutes: z.number().min(5).max(1440).optional(),
  agents: z
    .object({
      sales_followup: z
        .object({
          enabled: z.boolean(),
          intervalMinutes: z.number().min(5).max(1440),
        })
        .optional(),
      purchase_followup: z
        .object({
          enabled: z.boolean(),
          intervalMinutes: z.number().min(5).max(1440),
        })
        .optional(),
      accounting: z
        .object({
          enabled: z.boolean(),
          intervalMinutes: z.number().min(5).max(1440),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Allows authorized staff to configure intervals and toggle agents.
 */
export const updateAgentSchedulerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchedulerConfigInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    return withAuthenticatedClient(context.supabase, async () => {
      const db = getDb();
      return updateSchedulerConfig(data, db, context.userId);
    });
  });

const triggerScanInput = z.object({
  agentId: z.enum(["sales_followup", "purchase_followup", "accounting"]),
});

/**
 * Triggers an on-demand scheduled scan for a single agent.
 */
export const triggerScheduledScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => triggerScanInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    return withAuthenticatedClient(context.supabase, async () => {
      const db = getDb();
      return runScheduledAgentScan(data.agentId, db, "manual", true, context.userId);
    });
  });

/**
 * Triggers on-demand scheduled scans for all enabled internal agents.
 */
export const triggerAllScheduledScans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context);
    return withAuthenticatedClient(context.supabase, async () => {
      const db = getDb();
      return runAllScheduledScans(db, "manual", true);
    });
  });
