/**
 * Planner resolver — which record a follow-up note attaches to.
 *
 * Prefers an explicit caller-supplied context (mirrors nl-search's
 * `context.entity`/`entityId` pattern for "this customer"/"this project"
 * references). Phase 1 has no UI to supply this yet, but a future
 * floating-assistant call can pass "the record currently open" the same
 * way NL Search already does, with no change to this function. Falls back
 * to a customer-name lookup extracted from the utterance itself.
 */
import { listCustomers } from "@/lib/customers/api";
import type { VieActionContext } from "../types";

export interface FollowupTargetResolution {
  entityType: string | null;
  entityId: string | null;
  blocker: string | null;
}

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
      blocker: "No customer/record name was extracted and no current-page context was supplied.",
    };
  }

  const matches = await listCustomers(targetName.trim());

  if (matches.length === 0) {
    return {
      entityType: null,
      entityId: null,
      blocker: `No existing customer matches "${targetName}".`,
    };
  }

  if (matches.length > 1) {
    return {
      entityType: null,
      entityId: null,
      blocker: `"${targetName}" matches ${matches.length} customers — cannot determine which one.`,
    };
  }

  return { entityType: "customer", entityId: matches[0].id, blocker: null };
}
