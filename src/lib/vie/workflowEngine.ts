/**
 * Workflow Engine (ADR-0001 §3): executes a previously-planned action
 * exactly once, via the Action Registry, and maintains the vie_actions
 * row's lifecycle. This file — plus the module-owned handlers under
 * ./actions — is the ONLY place any business table is ever written to as
 * part of the VIE pipeline.
 *
 * Idempotency (ADR-0001 requirement 1): executeAction() claims the row with
 * a single atomic `UPDATE ... WHERE status IN (...) RETURNING` statement.
 * Two concurrent calls for the same actionId can never both see a returned
 * row — only one "wins" the claim and actually invokes the handler. A call
 * that loses the race, or arrives after the action already reached a
 * terminal state, short-circuits by reading the row's current state instead
 * of re-running anything, so a retried confirm/complete-draft call never
 * creates a second business record.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import { getVieAction } from "./actions/registry";
import type { VieActionStatus, VieExecutionPlan, VieIntent } from "./types";
// Import for registration side effects — ensures both handlers are
// registered before this module's first call to getVieAction().
import "./actions";

export interface VieActionRow {
  id: string;
  status: VieActionStatus;
  intent: string;
  plan: VieExecutionPlan | null;
  linked_record_type: string | null;
  linked_record_id: string | null;
}

export interface ExecuteActionResult {
  status: VieActionStatus;
  linkedRecordType: string | null;
  linkedRecordId: string | null;
  message?: string;
}

export async function executeAction(
  actionId: string,
  claimableFrom: VieActionStatus[],
  patch?: Record<string, unknown>,
): Promise<ExecuteActionResult> {
  const db = getDb();

  const { data: claimed, error: claimError } = await db
    .from("vie_actions")
    .update({ status: "executing", updated_at: new Date().toISOString() })
    .eq("id", actionId)
    .in("status", claimableFrom)
    .select("*")
    .maybeSingle();
  if (claimError) throw new AppError(mapDbError(claimError));

  if (!claimed) {
    // Not claimable: already executed, already executing, never existed, or
    // in a status this call doesn't accept (e.g. confirmVieAction called on
    // a "draft" row). Read current state rather than silently failing.
    const { data: current, error: readError } = await db
      .from("vie_actions")
      .select("*")
      .eq("id", actionId)
      .maybeSingle();
    if (readError) throw new AppError(mapDbError(readError));
    if (!current) throw new AppError("VIE action not found", "VIE_NOT_FOUND", 404);

    return {
      status: current.status as VieActionStatus,
      linkedRecordType: current.linked_record_type,
      linkedRecordId: current.linked_record_id,
      message:
        current.status === "applied"
          ? "Already applied — returning the existing result."
          : `Action is not in an executable state for this call (current status: ${current.status}).`,
    };
  }

  const row = claimed as unknown as VieActionRow;
  const handler = getVieAction(row.intent as VieIntent);

  if (!handler) {
    const message = `No handler registered for intent "${row.intent}"`;
    await db
      .from("vie_actions")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", actionId);
    return { status: "failed", linkedRecordType: null, linkedRecordId: null, message };
  }

  const planParams = (row.plan?.params ?? {}) as Record<string, unknown>;
  const params = { ...planParams, ...patch };

  try {
    const result = await handler(params);
    const { error: applyError } = await db
      .from("vie_actions")
      .update({
        status: "applied",
        linked_record_type: result.linkedRecordType,
        linked_record_id: result.linkedRecordId,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId);
    if (applyError) throw new AppError(mapDbError(applyError));

    return {
      status: "applied",
      linkedRecordType: result.linkedRecordType,
      linkedRecordId: result.linkedRecordId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error executing VIE action";
    await db
      .from("vie_actions")
      .update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("id", actionId);
    return { status: "failed", linkedRecordType: null, linkedRecordId: null, message };
  }
}
