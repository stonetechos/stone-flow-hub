/**
 * Planner (ADR-0001 §3): turns a VieUnderstanding into a VieExecutionPlan.
 *
 * Resolves real record IDs via existing api.ts list functions (read-only),
 * validates prerequisites, decides the required operation, looks up the
 * intent's execution policy, and prepares an execution plan. The Planner
 * NEVER writes to the database — only the Workflow Engine does, and only by
 * calling the pre-existing module api.ts functions.
 */
import {
  createCustomerEntitiesSchema,
  logEnquiryEntitiesSchema,
  noteFollowupEntitiesSchema,
  type VieActionContext,
  type VieExecutionMode,
  type VieExecutionPlan,
  type VieExecutionPolicy,
  type VieUnderstanding,
} from "../types";
import { getExecutionPolicy } from "../policy";
import { resolveCustomer } from "./resolveCustomer";
import { resolveProduct } from "./resolveProduct";
import { resolveFollowupTarget } from "./resolveFollowupTarget";
import { resolveCustomerDuplicate } from "./resolveCustomerDuplicate";

/**
 * The one safety rule from ADR-0001 §6: an unresolved prerequisite always
 * forces a downgrade to "draft", regardless of the configured policy —
 * "auto" means "skip the human step when the plan is unambiguous and
 * confident," never "execute a plan with unresolved blockers." Absent any
 * blockers, a configured "auto" policy still requires confidence to clear
 * the threshold, downgrading one step to "confirm" otherwise. Configured
 * "confirm" and "draft" policies are a ceiling, never upgraded by
 * confidence — that's the point of setting them per-intent.
 */
export function resolveEffectiveMode(
  policy: VieExecutionPolicy,
  confidence: number,
  blockers: string[],
): VieExecutionMode {
  if (blockers.length > 0) return "draft";
  if (policy.mode === "auto") {
    return confidence >= policy.autoThreshold ? "auto" : "confirm";
  }
  return policy.mode;
}

async function planLogEnquiry(understanding: VieUnderstanding): Promise<VieExecutionPlan> {
  const entities = logEnquiryEntitiesSchema.parse(understanding.entities);

  const [customer, product] = await Promise.all([
    resolveCustomer(entities.customerName),
    resolveProduct(entities.productText),
  ]);

  const blockers: string[] = [];
  if (customer.blocker) blockers.push(customer.blocker);

  const unit = entities.unit ?? "sqft";
  const material = product.productLabel ?? entities.productText ?? "material";
  const requirementParts = [
    entities.quantity !== undefined ? `${entities.quantity} ${unit}` : undefined,
    material,
    entities.rate !== undefined ? `at Rs. ${entities.rate}/${unit}` : undefined,
  ].filter((p): p is string => Boolean(p));
  const requirement =
    requirementParts.length > 0 ? requirementParts.join(" ") : understanding.canonicalText;

  const budget_inr =
    entities.quantity !== undefined && entities.rate !== undefined
      ? entities.quantity * entities.rate
      : undefined;

  const params: Record<string, unknown> = {
    customer_id: customer.customerId,
    product_id: product.productId,
    requirement,
    budget_inr,
    notes: `AI-logged from: "${understanding.originalText}"`,
  };

  const policy = await getExecutionPolicy("log_enquiry");
  const effectiveMode = resolveEffectiveMode(policy, understanding.confidence, blockers);

  return { operation: "log_enquiry", params, mode: policy.mode, effectiveMode, blockers };
}

async function planNoteFollowup(
  understanding: VieUnderstanding,
  context: VieActionContext | undefined,
): Promise<VieExecutionPlan> {
  const entities = noteFollowupEntitiesSchema.parse(understanding.entities);

  const target = await resolveFollowupTarget(entities.targetName, context);

  const blockers: string[] = [];
  if (target.blocker) blockers.push(target.blocker);
  if (entities.relativeDays === undefined) {
    blockers.push("No follow-up date could be determined from the utterance.");
  }

  // Date arithmetic is deterministic application code, not something the LLM
  // is trusted to compute — VIE only extracts the relative day count.
  const scheduled_at =
    entities.relativeDays !== undefined
      ? new Date(Date.now() + entities.relativeDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  const params: Record<string, unknown> = {
    entity_type: target.entityType,
    entity_id: target.entityId,
    scheduled_at,
    channel: entities.channel ?? "call",
    notes: entities.note,
  };

  const policy = await getExecutionPolicy("note_followup");
  const effectiveMode = resolveEffectiveMode(policy, understanding.confidence, blockers);

  return { operation: "note_followup", params, mode: policy.mode, effectiveMode, blockers };
}

/**
 * create_customer (VIE Phase 2 — Milestone 2). See
 * VIE-CreateCustomer-UX-Contract.md for the full behavioral contract this
 * implements. Unlike log_enquiry/note_followup, this Planner branch does
 * not look up an EXISTING record — it prepares a NEW one — so its only
 * resolver check is the duplicate-phone guard (§9 of the contract), never a
 * name-based lookup like resolveCustomer.ts.
 */
async function planCreateCustomer(understanding: VieUnderstanding): Promise<VieExecutionPlan> {
  const entities = createCustomerEntitiesSchema.parse(understanding.entities);

  const blockers: string[] = [];

  if (!entities.customerName) {
    blockers.push("No customer name was extracted from the utterance.");
  }

  // Same "10 digits after stripping non-digits" bar enquiryCreateSchema's
  // own inline-create fallback already uses — mobile is a hard requirement
  // of createCustomer() itself (customerCreateSchema.mobile, via zMobile),
  // so an unresolvable number always forces "draft" here too (§4/§6 of the
  // UX contract).
  const normalizedMobile = (entities.mobile ?? "").replace(/\D/g, "");
  if (normalizedMobile.length < 10) {
    blockers.push("No valid mobile number was extracted from the utterance.");
  } else {
    const duplicate = await resolveCustomerDuplicate(entities.mobile);
    if (duplicate.blocker) blockers.push(duplicate.blocker);
  }

  const params: Record<string, unknown> = {
    name: entities.customerName,
    mobile: entities.mobile,
    city: entities.city,
    customer_type: entities.customerType ?? "individual",
    notes: `AI-logged from: "${understanding.originalText}"`,
  };

  const policy = await getExecutionPolicy("create_customer");
  const effectiveMode = resolveEffectiveMode(policy, understanding.confidence, blockers);

  return { operation: "create_customer", params, mode: policy.mode, effectiveMode, blockers };
}

/** Returns null for "unsupported" classifications — there is nothing to
 *  plan, and the caller (vie.functions.ts) records the row as rejected. */
export async function planAction(
  understanding: VieUnderstanding,
  context?: VieActionContext,
): Promise<VieExecutionPlan | null> {
  switch (understanding.intent) {
    case "log_enquiry":
      return planLogEnquiry(understanding);
    case "note_followup":
      return planNoteFollowup(understanding, context);
    case "create_customer":
      return planCreateCustomer(understanding);
    case "unsupported":
      return null;
  }
}
