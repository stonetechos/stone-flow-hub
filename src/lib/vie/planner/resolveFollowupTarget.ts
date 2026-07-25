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
 * `blocker` is now a structured `PlannerBlocker` (types.ts),
 * same discipline as resolveCustomer.ts — built here, where the real
 * candidate list already exists, rather than reconstructed later from
 * formatted text.
 *
 * The name-lookup branch (search + zero/one/many
 * classification + blocker assembly) now delegates to
 * entityResolution.ts's resolveEntityByQuery() — the same generic framework
 * resolveCustomer.ts uses, since this branch is the exact same "customer
 * name -> customer record" shape. The caller-supplied-context short-circuit
 * above it (nothing to search for) and the no-targetName precondition
 * blocker are specific to this resolver and stay here. Behavior (including
 * the exact byte-for-byte PlannerBlocker shape) is unchanged —
 * resolveFollowupTarget.test.ts is unmodified by this sprint and still
 * passes against this file.
 */
import { listCustomers } from "@/lib/customers/api";
import type { PlannerBlocker, VieActionContext } from "../types";
import { requiredInputBlocker, resolveEntityByQuery } from "./entityResolution";

export interface FollowupTargetResolution {
  entityType: string | null;
  entityId: string | null;
  blocker: PlannerBlocker | null;
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
      blocker: requiredInputBlocker({
        id: "entity_id",
        field: "target_name",
        message: "No customer/record name was extracted and no current-page context was supplied.",
      }),
    };
  }

  // `query` is deliberately the RAW (untrimmed) `targetName` — see
  // resolveCustomer.ts's own comment on this same split; only the actual
  // listCustomers() call trims, the blocker message/currentValue don't.
  const { record, blocker } = await resolveEntityByQuery(targetName, {
    id: "entity_id",
    type: "customer_selection",
    search: (query) => listCustomers(query.trim()),
    toCandidate: (m) => ({ id: m.id, label: m.name }),
    noMatchMessage: (q) => `No existing customer matches "${q}".`,
    multipleMatchesMessage: (q, count) => `"${q}" matches ${count} customers — choose one.`,
  });

  if (!record) return { entityType: null, entityId: null, blocker };
  return { entityType: "customer", entityId: record.id, blocker: null };
}
