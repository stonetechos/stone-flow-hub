/**
 * VIE Phase 1 — server function entry points.
 *
 * Follows the exact conventions already established by
 * lib/ai/nl-search.functions.ts and lib/ai/copilot.functions.ts:
 * TanStack Start createServerFn, Zod input validation, requireSupabaseAuth
 * for session auth, requireStaff for the staff-only role gate, and
 * withAuthenticatedClient so every nested read/write (Planner resolvers,
 * Workflow Engine handlers) runs under the caller's real RLS-scoped
 * Supabase session instead of silently running as anon.
 *
 * understandAndStage(): VIE + Planner. Inserts (or, idempotently, returns
 *   an existing) vie_actions row. If the resulting plan is AUTO and
 *   unblocked, executes it immediately in the same request.
 * confirmVieAction(): executes a row staged "awaiting_confirmation".
 * completeDraftAction(): executes a row staged "draft", merging in a
 *   caller-supplied patch (e.g. a manually-picked customer_id) first.
 */
import { createServerFn } from "@tanstack/react-start";
import { z, ZodError } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff } from "@/lib/ai/require-staff";
import { withAuthenticatedClient, getDb } from "@/integrations/supabase/server-context";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbInsert, DbTable } from "@/lib/types";
import type { Json } from "@/integrations/supabase/types";
import { understand } from "./understand";
import { planAction } from "./planner";
import { executeAction } from "./workflowEngine";
import type { VieActionContext, VieActionStatus, VieExecutionPlan, VieUnderstanding } from "./types";

/**
 * entities/plan originate as Record<string, unknown> (VieUnderstanding.entities,
 * and VieExecutionPlan.params nested inside `plan`) — genuinely unknown-shaped
 * until validated per-intent downstream, so TypeScript can't structurally
 * narrow them to the generated `Json` type on its own. Round-tripping through
 * JSON.stringify/parse actually proves the value is JSON at runtime (rather
 * than asserting it away), so this is the one place that trust is justified.
 */
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

const understandAndStageInput = z.object({
  /** Client-generated once per submission attempt. Idempotency key
   *  (ADR-0001 requirement 1) — a retried/duplicated call with the same
   *  (user, requestId) pair returns the existing row instead of reclassifying
   *  the text or creating a second one. */
  requestId: z.string().uuid(),
  text: z.string().trim().min(1).max(1000),
  context: z
    .object({
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
    })
    .optional(),
});

export const understandAndStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => understandAndStageInput.parse(d))
  .handler(async ({ data, context }): Promise<DbTable<"vie_actions">> => {
    await requireStaff(context);

    return withAuthenticatedClient(context.supabase, async () => {
      const db = getDb();

      // --- Idempotency check (common case: a plain retry) ---
      const { data: existing, error: existingError } = await db
        .from("vie_actions")
        .select("*")
        .eq("created_by", context.userId)
        .eq("request_id", data.requestId)
        .maybeSingle();
      if (existingError) throw new AppError(mapDbError(existingError));
      if (existing) return existing;

      // --- VIE: understand ---
      // Wrapped (Milestone 1 — Hardening & Guardrails): a Lovable AI Gateway
      // failure (rate limit, credits exhausted, network error) or a
      // non-JSON response from gateway.server.ts's chatJson() previously
      // propagated as a raw, unclassified exception. Converted here into the
      // same AppError model every other trust boundary in this codebase
      // already uses (see lib/errors.ts) — no new error framework introduced.
      let understanding: VieUnderstanding;
      try {
        understanding = await understand(data.text);
      } catch (err) {
        throw new AppError(
          err instanceof Error ? err.message : "The AI understanding step failed. Please try again.",
          "VIE_UNDERSTAND_FAILED",
          502,
        );
      }

      // --- Planner: plan (null for "unsupported") ---
      const actionContext: VieActionContext | undefined = data.context
        ? { entityType: data.context.entityType, entityId: data.context.entityId }
        : undefined;

      // Wrapped (Milestone 1): planAction() throws a raw ZodError when the
      // LLM's entities don't match the classified intent's schema
      // (logEnquiryEntitiesSchema / noteFollowupEntitiesSchema in ./types) —
      // e.g. a misclassified intent, or malformed/partial extraction. That's
      // a validation failure, not a server bug; it's now classified the same
      // way every other validation failure in this codebase is (see
      // lib/errors.ts's toUserMessage handling of ZodError), instead of
      // reaching the caller as an unhandled exception.
      let plan: VieExecutionPlan | null;
      try {
        plan = understanding.intent === "unsupported" ? null : await planAction(understanding, actionContext);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new AppError(
            `Couldn't understand that clearly enough to act on it: ${err.issues.map((i) => i.message).join(" • ")}`,
            "VIE_ENTITY_VALIDATION_FAILED",
            422,
          );
        }
        throw new AppError(
          err instanceof Error ? err.message : "Planning this action failed. Please try again.",
          "VIE_PLANNING_FAILED",
          502,
        );
      }

      const initialStatus: VieActionStatus = !plan
        ? "rejected"
        : plan.effectiveMode === "auto"
          ? "planned"
          : plan.effectiveMode === "draft"
            ? "draft"
            : "awaiting_confirmation";

      const insertPayload: DbInsert<"vie_actions"> = {
        created_by: context.userId,
        request_id: data.requestId,
        raw_text: understanding.originalText,
        language: understanding.language,
        canonical_text: understanding.canonicalText,
        intent: understanding.intent,
        entities: toJson(understanding.entities),
        confidence: understanding.confidence,
        execution_mode: plan?.effectiveMode ?? null,
        // Same Record<string, unknown> (via VieExecutionPlan.params) issue as
        // entities above.
        plan: plan ? toJson(plan) : null,
        plan_blockers: plan?.blockers ?? null,
        status: initialStatus,
        error_message: plan
          ? null
          : `"${understanding.intent}" is not a Phase 1 VIE intent — no action was taken.`,
      };

      let row: DbTable<"vie_actions">;
      const { data: inserted, error: insertError } = await db
        .from("vie_actions")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertError) {
        // 23505 = unique_violation on (created_by, request_id): a concurrent
        // duplicate call already inserted the row first. Fetch and return
        // it instead of throwing — preserves idempotency under a real race,
        // not just a sequential retry.
        if ((insertError as { code?: string }).code === "23505") {
          const { data: raced, error: racedError } = await db
            .from("vie_actions")
            .select("*")
            .eq("created_by", context.userId)
            .eq("request_id", data.requestId)
            .single();
          if (racedError) throw new AppError(mapDbError(racedError));
          return raced;
        }
        throw new AppError(mapDbError(insertError));
      }
      row = inserted;

      if (row.status === "planned") {
        // AUTO mode, unblocked, confident enough — execute immediately so a
        // single utterance is the entire interaction, no separate confirm step.
        const result = await executeAction(row.id as string, ["planned"]);
        return {
          ...row,
          status: result.status,
          linked_record_type: result.linkedRecordType,
          linked_record_id: result.linkedRecordId,
        };
      }

      return row;
    });
  });

const actionIdInput = z.object({ actionId: z.string().uuid() });

export const confirmVieAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => actionIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    return withAuthenticatedClient(context.supabase, () =>
      executeAction(data.actionId, ["awaiting_confirmation"]),
    );
  });

const completeDraftActionInput = z.object({
  actionId: z.string().uuid(),
  /** Fields the employee filled in manually to complete an incomplete plan
   *  — e.g. a customer_id chosen from the ambiguous-match list stored in
   *  plan_blockers. Merged over the Planner's original params before the
   *  handler runs. */
  patch: z.record(z.unknown()),
});

export const completeDraftAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => completeDraftActionInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    return withAuthenticatedClient(context.supabase, () =>
      executeAction(data.actionId, ["draft"], data.patch),
    );
  });
