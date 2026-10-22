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
  phone: z.string().min(10),
  verificationCode: z.string().optional(),
});

/**
 * Public customer-facing order status lookup (requires phone + order verification).
 */
export const lookupStonemanOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => stonemanOrderLookupInput.parse(d))
  .handler(async ({ data }): Promise<CustomerSafeOrderDetails> => {
    const db = getDb();
    return lookupVerifiedOrder(data, db);
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
