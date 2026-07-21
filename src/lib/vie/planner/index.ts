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
  createQuotationEntitiesSchema,
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
import { resolveProject } from "./resolveProject";

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

/**
 * create_quotation (VIE Phase 3). Milestone 2 wired Milestone 1's
 * resolveProject() into the Planner via the same planX() shape every
 * existing intent already uses, proving the resolveCustomer() ->
 * resolveProject() resolution chain and its blockers end to end, with line
 * items deliberately out of scope. Milestone 5 (this one) adds line-item
 * extraction, exactly as specified in
 * engineering/VIE-CreateQuotation-LineItems-Design.md — no further
 * redesign of the customer/project chain below.
 *
 * Unlike every existing multi-resolver planX() (planLogEnquiry resolves
 * customer and product independently via Promise.all, since neither depends
 * on the other), project resolution genuinely depends on customer
 * resolution's own output — a project is FK'd to a customer, so there is
 * nothing to look up until a customer_id exists. resolveProject() therefore
 * runs strictly AFTER resolveCustomer(), and only when resolveCustomer()
 * actually produced a customer_id — mirroring the existing short-circuit
 * pattern planCreateCustomer() already uses above for its own
 * duplicate-phone check (skipped entirely when the mobile fails its own
 * length check first). See VIE-CreateQuotation-Architecture-Review.md §4
 * for the full rationale against implementing this as Promise.all, which
 * would call resolveProject() before a customer_id exists.
 *
 * Line-item product resolution has no such dependency in either direction
 * (a product is not FK'd to a customer or project, and line items don't
 * depend on each other) — per the Line-Items Design §7 and Architecture
 * Review §3/§12 step 7, every item's resolveProduct() call is kicked off
 * up front, in parallel with itself (Promise.all across items) AND in
 * parallel with the sequential customer -> project chain below, and only
 * awaited once both are needed to build `params`.
 *
 * resolveProduct() itself is reused completely unmodified (per this
 * milestone's own direction: "reuse the existing resolveProduct() behavior
 * consistently across intents," "do not introduce quotation-specific
 * product resolution semantics that differ from log_enquiry"). Per its own
 * verified implementation and tests (resolveProduct.ts /
 * resolveProduct.test.ts), it has no `blocker` field and cannot distinguish
 * zero matches from multiple matches — both an unknown product and an
 * ambiguous product resolve to `{ productId: null, productLabel: null }`
 * and are NEVER a Planner blocker here, exactly as log_enquiry already
 * treats them (planLogEnquiry above). There is likewise no "unsupported
 * unit" concept — quoteItemInputSchema's `unit` field is free text, so an
 * unrecognized unit is passed straight through, same as `unit`'s existing
 * "sqft" convenience default when quantity is stated with no unit
 * (mirroring planLogEnquiry's own `entities.unit ?? "sqft"` above).
 *
 * Two per-item/plan-level blockers exist (Line-Items Design §3/§4;
 * unit_price extended by Milestone 6 — see below): every other field
 * either resolves best-effort (product/description) or defaults safely
 * (unit). Per the UX Contract/Architecture Review's all-or-nothing rule, a
 * blocker on any one line item blocks the whole plan — no special logic
 * beyond pushing into the same flat `blockers` array resolveEffectiveMode()
 * already treats as forcing "draft".
 *
 * Milestone 6 (VIE-CreateQuotation-Midpoint-Review.md §2/§7/§8) brings this
 * function into alignment with the UX Contract (§3 item 4, §6 item 1) and
 * Architecture Review (§6), both of which specify a missing `unit_price` as
 * a Planner-level blocker — Milestone 5 had deliberately left this solely
 * to actions/createQuotation.ts's execution-time quoteCreateSchema check,
 * which meant a plan with every item quantified but unpriced could reach
 * "confirm" with an EMPTY blockers array, only failing once a human had
 * already been asked to confirm it. That gap is closed below: a missing
 * `unit_price` is now pushed onto the same flat `blockers` array as a
 * missing quantity, so resolveEffectiveMode() (unmodified) forces "draft"
 * before any confirmation is ever shown, and vie.functions.ts/
 * workflowEngine.ts (unmodified, out of scope for this milestone) already
 * guarantee `executeAction()` is only ever invoked automatically for a
 * "planned" status, which requires effectiveMode "auto" with zero
 * blockers — so a plan with this blocker can never reach execution without
 * a human first seeing and resolving it via completeDraftAction's patch.
 * The action handler's own quoteCreateSchema check is left completely
 * unchanged as a second line of defense (the same defense-in-depth pattern
 * already established for resolveProject()/resolveCustomerDuplicate()'s own
 * "second line of defense" callouts in the Architecture Review), never
 * removed.
 *
 * Milestone 6 also threads two previously-silently-dropped entities through
 * to `params`, closing the other two gaps the Midpoint Review found:
 * `category` (a real, already-existing quoteCreateSchema field
 * actions/createQuotation.ts has read via `params.category ?? null` since
 * Milestone 4 — the Planner simply never populated it) and `projectText`
 * (passed to resolveProject() as an optional disambiguation hint, and
 * preserved on `params` so it's never silently lost even when it wasn't
 * needed to resolve an ambiguity). Neither is fabricated: both are passed
 * through exactly as extracted, `undefined` when not stated.
 */
async function planCreateQuotation(understanding: VieUnderstanding): Promise<VieExecutionPlan> {
  const entities = createQuotationEntitiesSchema.parse(understanding.entities);

  const blockers: string[] = [];
  const rawItems = entities.items ?? [];

  // Kicked off before the sequential customer -> project chain below — no
  // data dependency either way (see header comment above).
  const productsPromise = Promise.all(rawItems.map((item) => resolveProduct(item.productText)));

  const customer = await resolveCustomer(entities.customerName);
  if (customer.blocker) blockers.push(customer.blocker);

  let projectId: string | null = null;
  if (customer.customerId) {
    const project = await resolveProject(
      customer.customerId,
      customer.customerLabel,
      entities.projectText,
    );
    if (project.blocker) blockers.push(project.blocker);
    projectId = project.projectId;
  }

  const resolvedProducts = await productsPromise;

  const items = rawItems.map((item, index) => {
    const product = resolvedProducts[index];

    if (item.quantity === undefined) {
      blockers.push(`Line item ${index + 1}: no quantity was extracted from the utterance.`);
    }
    // Milestone 6: mirrors the missing-quantity check immediately above —
    // never fabricated, always a real blocker, never silently deferred to
    // execution time (see the function header comment for the full
    // before/after rationale).
    if (item.rate === undefined) {
      blockers.push(`Line item ${index + 1}: no unit price was extracted from the utterance.`);
    }

    return {
      product_id: product.productId,
      description: product.productLabel ?? item.productText,
      quantity: item.quantity,
      unit: item.unit ?? "sqft",
      unit_price: item.rate,
    };
  });

  const params: Record<string, unknown> = {
    customer_id: customer.customerId,
    project_id: projectId,
    project_text: entities.projectText,
    category: entities.category,
    items,
    notes: `AI-logged from: "${understanding.originalText}"`,
  };

  const policy = await getExecutionPolicy("create_quotation");
  const effectiveMode = resolveEffectiveMode(policy, understanding.confidence, blockers);

  return { operation: "create_quotation", params, mode: policy.mode, effectiveMode, blockers };
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
    case "create_quotation":
      return planCreateQuotation(understanding);
    case "unsupported":
      return null;
  }
}
