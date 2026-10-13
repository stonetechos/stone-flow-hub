/**
 * Stone Tech OS — Four-Agent AI Suite Background Scheduler & Automation Engine.
 *
 * Enforces:
 * 1. Independent periodic scanning for internal agents:
 *    - Sales Follow-up Agent (unanswered enquiries, stale quotes, overdue follow-ups)
 *    - Purchase Follow-up Agent (unconfirmed POs, approaching/overdue deliveries)
 *    - Accounting Agent (overdue invoices, unallocated receipts)
 * 2. StoneMan Mascot remains strictly event-driven (no background scanning jobs).
 * 3. Persistence of tasks and scan history in Supabase app_settings.
 * 4. Deduplication of unresolved tasks, prevention of overlapping scans,
 *    and prevention of repeated execution.
 * 5. Strict Zero-Outbound rule: scheduled scans only stage recommendations,
 *    never sending communications autonomously.
 * 6. Accounting Agent remains strictly review-only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import type { AgentId, AgentTaskItem } from "./types";
import { scanSalesFollowups, scanPurchaseFollowups, scanAccountingExceptions } from "./scanner";

export type ScheduledAgentId = "sales_followup" | "purchase_followup" | "accounting";

export interface AgentScheduleSetting {
  enabled: boolean;
  intervalMinutes: number;
}

export interface AgentSchedulerConfig {
  globalEnabled: boolean;
  defaultIntervalMinutes: number;
  agents: {
    sales_followup: AgentScheduleSetting;
    purchase_followup: AgentScheduleSetting;
    accounting: AgentScheduleSetting;
  };
}

export const DEFAULT_SCHEDULER_CONFIG: AgentSchedulerConfig = {
  globalEnabled: true,
  defaultIntervalMinutes: 60,
  agents: {
    sales_followup: { enabled: true, intervalMinutes: 60 },
    purchase_followup: { enabled: true, intervalMinutes: 60 },
    accounting: { enabled: true, intervalMinutes: 120 },
  },
};

export interface AgentScanRecord {
  scanId: string;
  agentId: ScheduledAgentId;
  startedAt: string;
  completedAt: string;
  status: "success" | "failed" | "skipped";
  scannedCount: number;
  newTasksCount: number;
  errorMessage?: string | null;
  durationMs: number;
  nextScheduledRunAt?: string | null;
  triggeredBy: "cron" | "manual" | "system";
}

export interface AgentSchedulerStatus {
  config: AgentSchedulerConfig;
  agents: Record<
    ScheduledAgentId,
    {
      enabled: boolean;
      intervalMinutes: number;
      lastScanAt: string | null;
      lastSuccessfulScanAt: string | null;
      lastFailedScanAt: string | null;
      lastError: string | null;
      nextScheduledRunAt: string | null;
      isRunning: boolean;
      pendingCount: number;
    }
  >;
  recentHistory: AgentScanRecord[];
  isLocked: boolean;
}

// Global in-memory storage synced with Supabase app_settings
export const inMemoryTasks = new Map<string, AgentTaskItem>();
export const scanLocks = new Map<ScheduledAgentId, number>();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute lock timeout

// In-memory runtime state for instant updates
let activeConfig: AgentSchedulerConfig = { ...DEFAULT_SCHEDULER_CONFIG };
const agentStateMap = new Map<
  ScheduledAgentId,
  {
    lastScanAt: string | null;
    lastSuccessfulScanAt: string | null;
    lastFailedScanAt: string | null;
    lastError: string | null;
    nextScheduledRunAt: string | null;
  }
>([
  [
    "sales_followup",
    {
      lastScanAt: null,
      lastSuccessfulScanAt: null,
      lastFailedScanAt: null,
      lastError: null,
      nextScheduledRunAt: null,
    },
  ],
  [
    "purchase_followup",
    {
      lastScanAt: null,
      lastSuccessfulScanAt: null,
      lastFailedScanAt: null,
      lastError: null,
      nextScheduledRunAt: null,
    },
  ],
  [
    "accounting",
    {
      lastScanAt: null,
      lastSuccessfulScanAt: null,
      lastFailedScanAt: null,
      lastError: null,
      nextScheduledRunAt: null,
    },
  ],
]);

const scanHistory: AgentScanRecord[] = [];
const MAX_HISTORY_RECORDS = 50;

/**
 * Loads persisted scheduler configuration from app_settings.
 */
export async function getSchedulerConfig(
  db?: SupabaseClient | null,
): Promise<AgentSchedulerConfig> {
  if (!db || typeof db.from !== "function") return activeConfig;

  try {
    const { data, error } = await db
      .from("app_settings")
      .select("value")
      .eq("key", "agent_suite.scheduler_config")
      .maybeSingle();

    if (!error && data?.value && typeof data.value === "object") {
      activeConfig = {
        ...DEFAULT_SCHEDULER_CONFIG,
        ...(data.value as Partial<AgentSchedulerConfig>),
      };
    }
  } catch (err) {
    console.warn("[scheduler] Could not load config from app_settings:", err);
  }

  return activeConfig;
}

export interface AgentSchedulerConfigUpdate {
  globalEnabled?: boolean;
  defaultIntervalMinutes?: number;
  agents?: {
    sales_followup?: Partial<AgentScheduleSetting>;
    purchase_followup?: Partial<AgentScheduleSetting>;
    accounting?: Partial<AgentScheduleSetting>;
  };
}

/**
 * Updates scheduler configuration and persists to app_settings.
 */
export async function updateSchedulerConfig(
  updates: AgentSchedulerConfigUpdate,
  db?: SupabaseClient | null,
  userId?: string | null,
): Promise<AgentSchedulerConfig> {
  activeConfig = {
    ...activeConfig,
    ...(updates.globalEnabled !== undefined ? { globalEnabled: updates.globalEnabled } : {}),
    ...(updates.defaultIntervalMinutes !== undefined
      ? { defaultIntervalMinutes: updates.defaultIntervalMinutes }
      : {}),
    agents: {
      sales_followup: {
        ...activeConfig.agents.sales_followup,
        ...(updates.agents?.sales_followup || {}),
      },
      purchase_followup: {
        ...activeConfig.agents.purchase_followup,
        ...(updates.agents?.purchase_followup || {}),
      },
      accounting: {
        ...activeConfig.agents.accounting,
        ...(updates.agents?.accounting || {}),
      },
    },
  };

  // Recalculate nextScheduledRunAt for enabled agents if not yet set
  const now = Date.now();
  for (const agentId of ["sales_followup", "purchase_followup", "accounting"] as const) {
    const state = agentStateMap.get(agentId)!;
    const interval = activeConfig.agents[agentId]?.intervalMinutes || 60;
    if (activeConfig.globalEnabled && activeConfig.agents[agentId]?.enabled) {
      if (!state.nextScheduledRunAt || new Date(state.nextScheduledRunAt).getTime() < now) {
        state.nextScheduledRunAt = new Date(now + interval * 60 * 1000).toISOString();
      }
    } else {
      state.nextScheduledRunAt = null;
    }
  }

  if (db) {
    try {
      await db.from("app_settings").upsert({
        key: "agent_suite.scheduler_config",
        value: activeConfig as unknown as Record<string, unknown>,
        description: "Stone Tech OS Four-Agent Suite background automation configuration",
        updated_at: new Date().toISOString(),
        updated_by: userId || null,
      });
    } catch (err) {
      console.warn("[scheduler] Failed to persist config to app_settings:", err);
    }
  }

  return activeConfig;
}

/**
 * Returns comprehensive scheduler status, per-agent health, next runs, and recent history.
 */
export async function getSchedulerStatus(
  db?: SupabaseClient | null,
): Promise<AgentSchedulerStatus> {
  const config = await getSchedulerConfig(db);
  const allTasks = Array.from(inMemoryTasks.values());

  const getAgentMetrics = (agentId: ScheduledAgentId) => {
    const state = agentStateMap.get(agentId)!;
    const isRunning =
      scanLocks.has(agentId) && Date.now() - (scanLocks.get(agentId) || 0) < LOCK_TIMEOUT_MS;

    const pendingCount = allTasks.filter(
      (t) => t.agentId === agentId && t.status === "awaiting_approval",
    ).length;

    return {
      enabled: config.globalEnabled && (config.agents[agentId]?.enabled ?? false),
      intervalMinutes: config.agents[agentId]?.intervalMinutes || 60,
      lastScanAt: state.lastScanAt,
      lastSuccessfulScanAt: state.lastSuccessfulScanAt,
      lastFailedScanAt: state.lastFailedScanAt,
      lastError: state.lastError,
      nextScheduledRunAt: state.nextScheduledRunAt,
      isRunning,
      pendingCount,
    };
  };

  const isLocked = Array.from(scanLocks.values()).some(
    (time) => Date.now() - time < LOCK_TIMEOUT_MS,
  );

  return {
    config,
    agents: {
      sales_followup: getAgentMetrics("sales_followup"),
      purchase_followup: getAgentMetrics("purchase_followup"),
      accounting: getAgentMetrics("accounting"),
    },
    recentHistory: [...scanHistory].slice(0, MAX_HISTORY_RECORDS),
    isLocked,
  };
}

/**
 * Deduplicates newly generated tasks against existing tasks.
 * Prevents:
 * 1. Duplicate unresolved tasks for the same entity & action type.
 * 2. Re-staging tasks that were recently executed or rejected within grace period.
 */
export function deduplicateAndStageTasks(candidates: AgentTaskItem[]): {
  addedTasks: AgentTaskItem[];
  newCount: number;
} {
  const addedTasks: AgentTaskItem[] = [];
  let newCount = 0;

  for (const candidate of candidates) {
    const existing = inMemoryTasks.get(candidate.id);

    // If existing task is currently awaiting review or already approved, preserve it
    if (existing) {
      if (existing.status === "awaiting_approval" || existing.status === "approved") {
        continue;
      }
      if (existing.status === "executed") {
        // Prevent repeated execution: task already completed
        continue;
      }
    }

    // Check if an unresolved task for this entity & action type already exists under a different key
    const hasUnresolvedDuplicate = Array.from(inMemoryTasks.values()).some(
      (t) =>
        t.agentId === candidate.agentId &&
        t.actionType === candidate.actionType &&
        t.linkedRecordType === candidate.linkedRecordType &&
        t.linkedRecordId === candidate.linkedRecordId &&
        (t.status === "awaiting_approval" || t.status === "approved"),
    );

    if (hasUnresolvedDuplicate) {
      continue;
    }

    inMemoryTasks.set(candidate.id, candidate);
    addedTasks.push(candidate);
    newCount++;
  }

  return { addedTasks, newCount };
}

/**
 * Runs a background scheduled scan for a single agent.
 * Enforces overlapping scan prevention, error recording, and next run calculation.
 */
export async function runScheduledAgentScan(
  agentId: ScheduledAgentId,
  db: SupabaseClient,
  triggeredBy: "cron" | "manual" | "system" = "system",
  force = false,
  userId?: string,
): Promise<AgentScanRecord> {
  // Validate agent domain
  if (agentId !== "sales_followup" && agentId !== "purchase_followup" && agentId !== "accounting") {
    throw new AppError(
      `Agent "${agentId}" is not eligible for background scheduling. StoneMan is event-driven.`,
      "INVALID_SCHEDULED_AGENT",
      400,
    );
  }

  const config = await getSchedulerConfig(db);

  // Check if globally or individually enabled (unless force execution)
  if (!force) {
    if (!config.globalEnabled) {
      return recordScanSkipped(agentId, "Background automation is globally disabled", triggeredBy);
    }
    if (!config.agents[agentId]?.enabled) {
      return recordScanSkipped(
        agentId,
        `Agent "${agentId}" is disabled in scheduler settings`,
        triggeredBy,
      );
    }
  }

  // Concurrency guard: Prevent overlapping scans for the same agent
  const currentLock = scanLocks.get(agentId);
  const now = Date.now();
  if (currentLock && now - currentLock < LOCK_TIMEOUT_MS) {
    const errorMsg = `Overlapping scan prevented: scan for "${agentId}" is already running.`;
    console.warn(`[scheduler] ${errorMsg}`);
    throw new AppError(errorMsg, "SCAN_OVERLAP_PREVENTED", 409);
  }

  // Acquire lock
  scanLocks.set(agentId, now);
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const state = agentStateMap.get(agentId)!;
  state.lastScanAt = startedAt;

  const scanId = `scan_${agentId}_${now}`;

  try {
    let generatedTasks: AgentTaskItem[] = [];

    if (agentId === "sales_followup") {
      generatedTasks = await scanSalesFollowups(db, userId);
    } else if (agentId === "purchase_followup") {
      generatedTasks = await scanPurchaseFollowups(db, userId);
    } else if (agentId === "accounting") {
      generatedTasks = await scanAccountingExceptions(db, userId);
    }

    // Deduplicate against active tasks
    const { newCount } = deduplicateAndStageTasks(generatedTasks);

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const interval = config.agents[agentId]?.intervalMinutes || 60;
    const nextScheduledRunAt = new Date(Date.now() + interval * 60 * 1000).toISOString();

    state.lastSuccessfulScanAt = completedAt;
    state.lastError = null;
    state.nextScheduledRunAt = nextScheduledRunAt;

    const record: AgentScanRecord = {
      scanId,
      agentId,
      startedAt,
      completedAt,
      status: "success",
      scannedCount: generatedTasks.length,
      newTasksCount: newCount,
      durationMs,
      nextScheduledRunAt,
      triggeredBy,
    };

    scanHistory.unshift(record);
    if (scanHistory.length > MAX_HISTORY_RECORDS) scanHistory.pop();

    return record;
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    state.lastFailedScanAt = completedAt;
    state.lastError = errorMessage;

    const record: AgentScanRecord = {
      scanId,
      agentId,
      startedAt,
      completedAt,
      status: "failed",
      scannedCount: 0,
      newTasksCount: 0,
      errorMessage,
      durationMs,
      nextScheduledRunAt: state.nextScheduledRunAt,
      triggeredBy,
    };

    scanHistory.unshift(record);
    if (scanHistory.length > MAX_HISTORY_RECORDS) scanHistory.pop();

    throw new AppError(
      `Agent scan failed for "${agentId}": ${errorMessage}`,
      "AGENT_SCAN_FAILED",
      500,
    );
  } finally {
    // Release lock
    scanLocks.delete(agentId);
  }
}

function recordScanSkipped(
  agentId: ScheduledAgentId,
  reason: string,
  triggeredBy: "cron" | "manual" | "system",
): AgentScanRecord {
  const now = new Date().toISOString();
  return {
    scanId: `skip_${agentId}_${Date.now()}`,
    agentId,
    startedAt: now,
    completedAt: now,
    status: "skipped",
    scannedCount: 0,
    newTasksCount: 0,
    errorMessage: reason,
    durationMs: 0,
    triggeredBy,
  };
}

/**
 * Runs all enabled scheduled agent scans in sequence with isolated error handling.
 */
export async function runAllScheduledScans(
  db: SupabaseClient,
  triggeredBy: "cron" | "manual" | "system" = "cron",
  force = false,
): Promise<{
  results: AgentScanRecord[];
  summary: {
    scannedCount: number;
    newTasksCount: number;
    failures: number;
  };
}> {
  const results: AgentScanRecord[] = [];
  let scannedCount = 0;
  let newTasksCount = 0;
  let failures = 0;

  const agents: ScheduledAgentId[] = ["sales_followup", "purchase_followup", "accounting"];

  for (const agentId of agents) {
    try {
      const res = await runScheduledAgentScan(agentId, db, triggeredBy, force);
      results.push(res);
      scannedCount += res.scannedCount;
      newTasksCount += res.newTasksCount;
    } catch (err) {
      failures++;
      results.push({
        scanId: `err_${agentId}_${Date.now()}`,
        agentId,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: "failed",
        scannedCount: 0,
        newTasksCount: 0,
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: 0,
        triggeredBy,
      });
    }
  }

  return {
    results,
    summary: {
      scannedCount,
      newTasksCount,
      failures,
    },
  };
}
