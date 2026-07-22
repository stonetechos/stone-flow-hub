/**
 * Planner resolver — which record a follow-up note attaches to.
 *
 * Prefers an explicit caller-supplied context (mirrors nl-search's
 * `context.entity`/`entityId` pattern for "this customer"/"this project"
 * references). Phase 1 has no UI to supply this yet, but a future
 * floating-assistant call can pass "the record currently open" the same
 * way NL Search already does, with no change to this function. Falls back
 * to a customer-name lookup extracted from the utterance itself.
 *
 * Sprint AI-1.5: `blocker` is now a structured `PlannerBlocker` (types.ts),
 * same discipline as resolveCustomer.ts — built here, where the real
 * candidate list already exists, rather than reconstructed later from
 * formatted text.
 */
import { listCustomers } from "@/lib/customers/api";
import type { PlannerBlocker, VieActionContext } from "../types";

export interface FollowupTargetResolution {
  entityType: string | null;
  entityId: string | null;
  blocker: PlannerBlocker | null;
}

/** Same generous, non-prose-truncated cap as resolveCustomer.ts — see that
 *  file's own comment for why a UI candidate list doesn't need the
 *  first-5-then-ellipsis limit a formatted sentence did. */
const MAX_CANDIDATES = 20;

export async function resolveFollowupTarget(
  targetName: string | undefined,
  context: VieActionContext | undefined,
): Promise<FollowupTargetResolution> {
  if (context?.entityType && context?.entityId) {
    return { entityType: context.entityType, entityId: context.entityId, blocker: null };
  }

  if (!targetName || !targetName.trim()) {
    return {
      entityType: null,
      entityId: null,
      blocker: {
        id: "entity_id",
        type: "text_required",
        message: "No customer/record name was extracted and no current-page context was supplied.",
        field: "target_name",
        required: true,
      },
    };
  }

  const matches = await listCustomers(targetName.trim());

  if (matches.length === 0) {
    return {
      entityType: null,
      entityId: null,
      blocker: {
        id: "entity_id",
        type: "customer_selection",
        message: `No existing customer matches "${targetName}".`,
        field: "entity_id",
        required: true,
        currentValue: targetName,
        candidates: [],
      },
    };
  }

  if (matches.length > 1) {
    return {
      entityType: null,
      entityId: null,
      blocker: {
        id: "entity_id",
        type: "customer_selection",
        message: `"${targetName}" matches ${matches.length} customers — choose one.`,
        field: "entity_id",
        required: true,
        currentValue: targetName,
        candidates: matches.slice(0, MAX_CANDIDATES).map((m) => ({ id: m.id, label: m.name })),
      },
    };
  }

  return { entityType: "customer", entityId: matches[0].id, blocker: null };
}
