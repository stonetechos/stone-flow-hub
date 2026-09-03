/**
 * VIE Planner sprint (2026-07-28) — planFromBusinessIntent().
 *
 * Turns a BusinessIntent (../businessIntent.ts) into a
 * BusinessIntentExecutionPlan (../types.ts) — the same "Understand ->
 * Planner -> Workflow Engine" boundary ADR-0001 establishes for the
 * LLM-classified pipeline (planner/index.ts's planAction()), applied to the
 * newer, source-independent BusinessIntent model instead of a single
 * classified VieUnderstanding. Per this sprint's brief:
 *
 *   - Accepts a BusinessIntent.
 *   - Validates completeness (businessIntentSchema at the door, then each
 *     candidate action's own per-intent entity schema).
 *   - Detects missing information (PlannerBlocker — the same closed type
 *     this file's sibling resolvers already produce, reused verbatim).
 *   - Produces a deterministic Execution Plan (Actions, Dependencies,
 *     Validation errors, Suggested questions, Confidence, Estimated
 *     impact — see BusinessIntentExecutionPlan in ../types.ts).
 *   - NEVER mutates the database and NEVER calls an ERP action. Every
 *     lookup this file performs goes through the SAME read-only resolvers
 *     planner/index.ts already uses (resolveCustomer, resolveProduct,
 *     resolveCustomerDuplicate, resolveProject, resolveFollowupTarget) —
 *     no new resolver logic, no write call anywhere in this file. Nothing
 *     here imports actions/registry.ts, workflowEngine.ts, or any api.ts
 *     `create*`/`update*`/`delete*` function.
 *   - Returns a reviewable plan only — Workflow Engine execution is a
 *     separate, later decision this sprint does not make (see
 *     BusinessIntentExecutionPlan's own header comment in ../types.ts for
 *     why there is no mode/effectiveMode field here, unlike
 *     VieExecutionPlan).
 *
 * ## Deciding WHICH actions a BusinessIntent implies
 *
 * This is the one genuinely new kind of decision this Planner makes that
 * planner/index.ts never had to: planAction() already knows which single
 * intent to plan (VieUnderstanding.intent was classified upstream, by the
 * LLM). A BusinessIntent carries no such classification — it's a bag of
 * populated sections — so THIS file decides which of VIE's known actions
 * (create_customer, log_enquiry, create_quotation, note_followup) apply,
 * deterministically, from which sections are populated:
 *
 *   - `customer` has any field set, no EXISTING customer already resolves
 *     uniquely by name, and the name isn't ambiguously matching several
 *     existing customers -> propose create_customer (see
 *     `resolveCustomerForPlan()` below for exactly how "no match" is told
 *     apart from "ambiguous match").
 *   - `products` non-empty -> propose create_quotation (never BOTH
 *     create_quotation and log_enquiry for the same intent — a quotation's
 *     own `requirements` mapping already folds free-text requirements into
 *     its notes, so a second, separate enquiry would just be a duplicate
 *     of the same conversation).
 *   - `products` empty but `requirements.summary` present -> propose
 *     log_enquiry.
 *   - `followups` non-empty -> propose note_followup, from the first entry
 *     only — the same limitation toNoteFollowupEntities() itself already
 *     documents; multiple follow-ups don't yet fan out into multiple
 *     actions. A stated gap, not a silent one — surfaced today only
 *     implicitly (there is no per-array-index blocker for it, matching
 *     toNoteFollowupEntities()'s own scope), worth flagging in the sprint
 *     report as a known limitation for a future Planner iteration.
 *
 * `intent.actions` (businessIntent.ts's own soft, free-text "what does the
 * source think happened" field) is deliberately NOT used to drive this
 * decision — per that field's own doc comment, deciding what to do from a
 * BusinessIntent is explicitly this Planner's job, not something a
 * capture-source's own guess should short-circuit. A populated
 * `intent.actions` is surfaced via `unhandledSections` (nothing here reads
 * it), never silently trusted.
 *
 * ## `measurements` / `tasks` / `documents` / `intent.actions`
 *
 * None of the four action builders below read these sections — there is no
 * VIE action handler for a bare task, a document reference, or a raw
 * measurement today. Rather than silently dropping them, `unhandledSections`
 * (computed generically, not a hardcoded list — see `ALL_SECTIONS` below)
 * names any populated section no proposed action actually consumed, so a
 * reviewer sees what this plan could NOT act on, not just what it did.
 */
import { z } from "zod";
import {
  createCustomerEntitiesSchema,
  createQuotationEntitiesSchema,
  logEnquiryEntitiesSchema,
  noteFollowupEntitiesSchema,
  type BusinessIntentExecutionPlan,
  type PlannedAction,
  type PlannedActionDependency,
  type PlannerBlocker,
  type PlannerBlockerType,
  type PlannerEstimatedImpact,
  type PlannerSuggestedQuestion,
  type PlanValidationError,
  type VieActionContext,
} from "../types";
import {
  businessIntentSchema,
  toCreateCustomerEntities,
  toCreateQuotationEntities,
  toLogEnquiryEntities,
  toNoteFollowupEntities,
  type BusinessIntent,
} from "../businessIntent";
import { resolveCustomer } from "./resolveCustomer";
import { resolveCustomerDuplicate } from "./resolveCustomerDuplicate";
import { resolveProduct } from "./resolveProduct";
import { resolveProject } from "./resolveProject";
import { resolveFollowupTarget } from "./resolveFollowupTarget";

// ---------------------------------------------------------------------------
// Deterministic id assignment — same input always yields the same action
// ids (a counter closed over one planFromBusinessIntent() call, never a
// random value or a wall-clock timestamp).
// ---------------------------------------------------------------------------

function makeActionIdFactory(): () => string {
  let n = 0;
  return () => `action-${++n}`;
}

// ---------------------------------------------------------------------------
// Confidence — deterministic arithmetic, never LLM-produced. A missing
// source confidence is treated as neutral (0.5): not fabricated certainty,
// not an automatic penalty either.
// ---------------------------------------------------------------------------

const DEFAULT_BASE_CONFIDENCE = 0.5;
const BLOCKER_CONFIDENCE_PENALTY = 0.2;
const VALIDATION_ERROR_CONFIDENCE_PENALTY = 0.25;

function computeActionConfidence(
  baseConfidence: number,
  blockerCount: number,
  validationErrorCount: number,
): number {
  const raw =
    baseConfidence -
    blockerCount * BLOCKER_CONFIDENCE_PENALTY -
    validationErrorCount * VALIDATION_ERROR_CONFIDENCE_PENALTY;
  return Math.max(0, Math.min(1, Math.round(raw * 100) / 100));
}

// ---------------------------------------------------------------------------
// Validation errors — a mapped Partial<X> failing its OWN per-intent Zod
// schema (createCustomerEntitiesSchema etc., ../types.ts) is defense in
// depth, not the common case: the toXEntities() mapping functions
// (../businessIntent.ts) read from BusinessIntent section schemas whose own
// field constraints (enums, positive-number checks) already mirror the
// target schema's, by design. This mainly catches the two schemas drifting
// apart in the future, or a genuinely malformed capture (e.g. a negative
// quantity) reaching this far.
// ---------------------------------------------------------------------------

function zodIssuesToValidationErrors(
  error: z.ZodError,
  actionId: string | undefined,
): PlanValidationError[] {
  return error.issues.map((issue) => ({
    actionId,
    field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
    code: issue.code,
  }));
}

// ---------------------------------------------------------------------------
// Suggested questions — deterministic, table-driven. Every
// PlannerBlockerType (../types.ts's own closed set) maps to exactly one
// template here; never LLM-generated.
// ---------------------------------------------------------------------------

function humanizeField(field: string): string {
  return field.replace(/_/g, " ").replace(/\./g, " ");
}

const BLOCKER_QUESTION_TEMPLATES: Record<PlannerBlockerType, (blocker: PlannerBlocker) => string> =
  {
    customer_selection: (b) =>
      b.candidates && b.candidates.length > 0
        ? `Which customer did you mean — ${b.candidates.map((c) => c.label).join(", ")}?`
        : "Who is the customer for this?",
    vendor_selection: (b) =>
      b.candidates && b.candidates.length > 0
        ? `Which vendor did you mean — ${b.candidates.map((c) => c.label).join(", ")}?`
        : "Which vendor is this for?",
    project_selection: (b) =>
      b.candidates && b.candidates.length > 0
        ? `Which project — ${b.candidates.map((c) => c.label).join(", ")}?`
        : "Which project should this be linked to?",
    product_selection: () => "Which product did you mean?",
    stone_selection: () => "Which stone did you mean?",
    colour_selection: () => "Which colour did you mean?",
    finish_selection: () => "Which finish did you mean?",
    thickness_selection: () => "What thickness is required?",
    quantity_required: () => "What quantity is needed?",
    unit_price_required: () => "What is the unit price?",
    delivery_date_required: () => "When is delivery required?",
    date_required: () => "What date should this be scheduled for?",
    text_required: (b) => `What is the ${humanizeField(b.field)}?`,
    number_required: (b) => `What is the ${humanizeField(b.field)}?`,
    // The blocker's own `message` already states the fact to confirm (e.g.
    // "A customer with this phone number already exists: ...") — reused
    // verbatim rather than reworded, so nothing is lost or paraphrased.
    confirmation_required: (b) => b.message,
  };

function suggestedQuestionsFor(
  actionId: string,
  blockers: PlannerBlocker[],
): PlannerSuggestedQuestion[] {
  return blockers.map((blocker) => ({
    actionId,
    blockerId: blocker.id,
    question: BLOCKER_QUESTION_TEMPLATES[blocker.type](blocker),
  }));
}

// ---------------------------------------------------------------------------
// Estimated impact — deterministic, arithmetic-only summaries. Never an
// LLM guess at consequences; every number here is computed from the
// action's own already-resolved `params`.
// ---------------------------------------------------------------------------

function estimateImpact(action: PlannedAction): PlannerEstimatedImpact {
  const p = action.params;
  switch (action.operation) {
    case "create_customer": {
      const name = typeof p.name === "string" ? p.name : undefined;
      return {
        actionId: action.id,
        operation: action.operation,
        entityType: "customer",
        recordsCreated: 1,
        summary: name
          ? `Creates 1 new customer record for "${name}".`
          : "Creates 1 new customer record.",
      };
    }
    case "log_enquiry": {
      const requirement = typeof p.requirement === "string" ? p.requirement : undefined;
      return {
        actionId: action.id,
        operation: action.operation,
        entityType: "enquiry",
        recordsCreated: 1,
        summary: requirement ? `Logs 1 new enquiry: "${requirement}".` : "Logs 1 new enquiry.",
      };
    }
    case "create_quotation": {
      const items = Array.isArray(p.items) ? (p.items as Array<Record<string, unknown>>) : [];
      const total = items.reduce((sum, item) => {
        const qty = typeof item.quantity === "number" ? item.quantity : undefined;
        const price = typeof item.unit_price === "number" ? item.unit_price : undefined;
        return qty !== undefined && price !== undefined ? sum + qty * price : sum;
      }, 0);
      const totalPart =
        total > 0 ? ` totaling an estimated Rs. ${total.toLocaleString("en-IN")}` : "";
      return {
        actionId: action.id,
        operation: action.operation,
        entityType: "quotation",
        recordsCreated: 1,
        summary: `Creates 1 quotation with ${items.length} line item${items.length === 1 ? "" : "s"}${totalPart}.`,
      };
    }
    case "note_followup": {
      const channel = typeof p.channel === "string" ? p.channel : "call";
      return {
        actionId: action.id,
        operation: action.operation,
        entityType: "followup",
        recordsCreated: 1,
        summary: `Schedules 1 follow-up (${channel}).`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Customer resolution — shared across every action in the plan that needs a
// customer_id, resolved exactly ONCE, never re-queried per action.
// ---------------------------------------------------------------------------

interface PlanCustomerResolution {
  customerId: string | null;
  customerLabel: string | null;
  /** Set only for a genuinely AMBIGUOUS name match (more than one existing
   *  customer) — never for "no match" or "no name given," neither of which
   *  is ambiguity. */
  ambiguousBlocker: PlannerBlocker | null;
}

async function resolveCustomerForPlan(intent: BusinessIntent): Promise<PlanCustomerResolution> {
  const name = intent.customer?.name;
  if (!name) {
    return { customerId: null, customerLabel: null, ambiguousBlocker: null };
  }

  const resolved = await resolveCustomer(name);
  if (resolved.customerId) {
    return {
      customerId: resolved.customerId,
      customerLabel: resolved.customerLabel,
      ambiguousBlocker: null,
    };
  }

  // resolveCustomer()'s own selectionBlocker() (entityResolution.ts) sets
  // `candidates: []` for a genuine zero-match, and a real (non-empty)
  // candidate array only for an ambiguous multi-match. That distinction,
  // already encoded in the blocker's own shape by the framework, is what
  // this Planner reuses to decide whether creating a new customer is a
  // reasonable next step, rather than re-running its own search.
  const isAmbiguous = Boolean(
    resolved.blocker?.candidates && resolved.blocker.candidates.length > 0,
  );
  return {
    customerId: null,
    customerLabel: null,
    ambiguousBlocker: isAmbiguous ? resolved.blocker : null,
  };
}

// ---------------------------------------------------------------------------
// Per-action builders. Each mirrors the SAME blocker logic its
// planner/index.ts sibling (planCreateCustomer/planLogEnquiry/
// planCreateQuotation/planNoteFollowup) already uses — this is a distinct
// entry path (a BusinessIntent's mapped Partial<X>, not a VieUnderstanding's
// raw entities), not a redesign of what makes each operation's params
// complete.
// ---------------------------------------------------------------------------

interface BuiltAction {
  action: PlannedAction;
  validationErrors: PlanValidationError[];
  /** Which BusinessIntent top-level section keys this action actually
   *  read — used to compute `unhandledSections` generically. */
  consumedSections: string[];
}

async function buildCreateCustomerAction(
  intent: BusinessIntent,
  actionId: string,
  baseConfidence: number,
): Promise<BuiltAction> {
  const mapped = toCreateCustomerEntities(intent);
  const parsed = createCustomerEntitiesSchema.safeParse(mapped);
  const validationErrors = parsed.success
    ? []
    : zodIssuesToValidationErrors(parsed.error, actionId);
  const entities = parsed.success ? parsed.data : mapped;

  const blockers: PlannerBlocker[] = [];
  if (!entities.customerName) {
    blockers.push({
      id: "name",
      type: "text_required",
      message: "No customer name was captured.",
      field: "name",
      required: true,
    });
  }

  // Same "10 digits after stripping non-digits" bar planCreateCustomer()
  // uses (planner/index.ts) — mobile is a hard requirement of
  // createCustomer() itself.
  const normalizedMobile = (entities.mobile ?? "").replace(/\D/g, "");
  if (normalizedMobile.length < 10) {
    blockers.push({
      id: "mobile",
      type: "text_required",
      message: "No valid mobile number was captured.",
      field: "mobile",
      required: true,
      currentValue: entities.mobile,
    });
  } else {
    const duplicate = await resolveCustomerDuplicate(entities.mobile);
    if (duplicate.blocker) blockers.push(duplicate.blocker);
  }

  const params: Record<string, unknown> = {
    name: entities.customerName,
    mobile: entities.mobile,
    email: entities.email,
    billing_address: entities.address,
    city: entities.city,
    customer_type: entities.customerType ?? "individual",
    notes: `Planned from a ${intent.source} BusinessIntent capture: "${intent.rawText}"`,
  };

  const action: PlannedAction = {
    id: actionId,
    operation: "create_customer",
    params,
    blockers,
    dependsOn: [],
    confidence: computeActionConfidence(baseConfidence, blockers.length, validationErrors.length),
  };

  return { action, validationErrors, consumedSections: ["customer"] };
}

async function buildLogEnquiryAction(
  intent: BusinessIntent,
  actionId: string,
  baseConfidence: number,
  customer: PlanCustomerResolution,
): Promise<BuiltAction> {
  const mapped = toLogEnquiryEntities(intent);
  const parsed = logEnquiryEntitiesSchema.safeParse(mapped);
  const validationErrors = parsed.success
    ? []
    : zodIssuesToValidationErrors(parsed.error, actionId);
  const entities = parsed.success ? parsed.data : mapped;

  const product = await resolveProduct(entities.productText);

  const blockers: PlannerBlocker[] = [];
  if (customer.ambiguousBlocker) {
    blockers.push(customer.ambiguousBlocker);
  } else if (!customer.customerId) {
    blockers.push({
      id: "customer_id",
      type: "customer_selection",
      message: "No customer could be resolved for this enquiry.",
      field: "customer_id",
      required: true,
      candidates: [],
    });
  }

  const unit = entities.unit ?? "sqft";
  // Deliberately NOT falling back to a placeholder "material" string here
  // (planLogEnquiry in planner/index.ts does, which — since that fallback
  // is always truthy — silently makes ITS OWN `requirementParts.length > 0`
  // check always true, so its own `understanding.canonicalText` fallback
  // can never actually fire; a pre-existing, harmless-in-practice quirk
  // there since a VieUnderstanding always has SOME productText or
  // canonicalText to fall back through anyway). Left undefined instead, so
  // a BusinessIntent with no product mention at all correctly falls
  // through to `entities.requirements`/`intent.rawText` below rather than
  // ever describing the requirement as literally "material".
  const material = product.productLabel ?? entities.productText;
  const requirementParts = [
    entities.quantity !== undefined ? `${entities.quantity} ${unit}` : undefined,
    material,
    entities.rate !== undefined ? `at Rs. ${entities.rate}/${unit}` : undefined,
  ].filter((part): part is string => Boolean(part));
  const requirement =
    requirementParts.length > 0
      ? requirementParts.join(" ")
      : (entities.requirements ?? intent.rawText);

  // An explicitly stated budget always wins over the derived quantity*rate
  // estimate — same rule planLogEnquiry() (planner/index.ts) follows.
  const budget_inr =
    entities.budgetInr ??
    (entities.quantity !== undefined && entities.rate !== undefined
      ? entities.quantity * entities.rate
      : undefined);

  // Deterministic date arithmetic from the extracted day count — the LLM
  // (or, here, whichever normalizer populated BusinessIntent.timeline)
  // never computes a date itself, only a relative day count.
  const required_delivery_date =
    entities.timelineRelativeDays !== undefined
      ? new Date(Date.now() + entities.timelineRelativeDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      : undefined;

  const notes = entities.requirements
    ? `${entities.requirements}\n\nPlanned from a ${intent.source} BusinessIntent capture: "${intent.rawText}"`
    : `Planned from a ${intent.source} BusinessIntent capture: "${intent.rawText}"`;

  const params: Record<string, unknown> = {
    customer_id: customer.customerId,
    product_id: product.productId,
    requirement,
    budget_inr,
    required_delivery_date,
    notes,
  };

  const action: PlannedAction = {
    id: actionId,
    operation: "log_enquiry",
    params,
    blockers,
    dependsOn: [],
    confidence: computeActionConfidence(baseConfidence, blockers.length, validationErrors.length),
  };

  return {
    action,
    validationErrors,
    consumedSections: ["customer", "requirements", "products", "budget", "timeline"],
  };
}

async function buildCreateQuotationAction(
  intent: BusinessIntent,
  actionId: string,
  baseConfidence: number,
  customer: PlanCustomerResolution,
): Promise<BuiltAction> {
  const mapped = toCreateQuotationEntities(intent);
  const parsed = createQuotationEntitiesSchema.safeParse(mapped);
  const validationErrors = parsed.success
    ? []
    : zodIssuesToValidationErrors(parsed.error, actionId);
  const entities = parsed.success ? parsed.data : mapped;
  const rawItems = entities.items ?? [];

  const blockers: PlannerBlocker[] = [];
  if (customer.ambiguousBlocker) {
    blockers.push(customer.ambiguousBlocker);
  } else if (!customer.customerId) {
    blockers.push({
      id: "customer_id",
      type: "customer_selection",
      message: "No customer could be resolved for this quotation.",
      field: "customer_id",
      required: true,
      candidates: [],
    });
  }

  // Project resolution genuinely depends on customer resolution's own
  // output (a project is FK'd to a customer) — same "sequential, not
  // parallel" composition planCreateQuotation() (planner/index.ts) uses,
  // for the same reason.
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

  const resolvedProducts = await Promise.all(
    rawItems.map((item) => resolveProduct(item.productText)),
  );

  const items = rawItems.map((item, index) => {
    const product = resolvedProducts[index];
    if (item.quantity === undefined) {
      blockers.push({
        id: `items.${index}.quantity`,
        type: "quantity_required",
        message: `Line item ${index + 1}: no quantity was captured.`,
        field: `items.${index}.quantity`,
        required: true,
      });
    }
    if (item.rate === undefined) {
      blockers.push({
        id: `items.${index}.unit_price`,
        type: "unit_price_required",
        message: `Line item ${index + 1}: no unit price was captured.`,
        field: `items.${index}.unit_price`,
        required: true,
      });
    }
    return {
      product_id: product.productId,
      description: product.productLabel ?? item.productText,
      quantity: item.quantity,
      unit: item.unit ?? "sqft",
      unit_price: item.rate,
    };
  });

  const notes = entities.requirements
    ? `${entities.requirements}\n\nPlanned from a ${intent.source} BusinessIntent capture: "${intent.rawText}"`
    : `Planned from a ${intent.source} BusinessIntent capture: "${intent.rawText}"`;

  const params: Record<string, unknown> = {
    customer_id: customer.customerId,
    project_id: projectId,
    project_text: entities.projectText,
    category: entities.category,
    items,
    notes,
  };

  const action: PlannedAction = {
    id: actionId,
    operation: "create_quotation",
    params,
    blockers,
    dependsOn: [],
    confidence: computeActionConfidence(baseConfidence, blockers.length, validationErrors.length),
  };

  return {
    action,
    validationErrors,
    consumedSections: ["customer", "project", "products", "requirements"],
  };
}

async function buildNoteFollowupAction(
  intent: BusinessIntent,
  actionId: string,
  baseConfidence: number,
  context: VieActionContext | undefined,
): Promise<BuiltAction> {
  const mapped = toNoteFollowupEntities(intent);
  const parsed = noteFollowupEntitiesSchema.safeParse(mapped);
  const validationErrors = parsed.success
    ? []
    : zodIssuesToValidationErrors(parsed.error, actionId);
  const entities = parsed.success ? parsed.data : mapped;

  // Deliberately its OWN resolution, not the shared `customer` resolution
  // above: resolveFollowupTarget() checks caller-supplied page context
  // first (a different, broader concept than "which customer" — see that
  // file's own header comment), so it isn't simply a re-read of the same
  // customer lookup. The one cost is a possible redundant listCustomers()
  // call when both this action and a demand action (log_enquiry/
  // create_quotation) resolve the same name in the same plan — a minor
  // inefficiency, not a correctness concern, and preserves each resolver's
  // real, distinct contract rather than forcing them to share state they
  // don't actually share semantically.
  const target = await resolveFollowupTarget(entities.targetName, context);

  const blockers: PlannerBlocker[] = [];
  if (target.blocker) blockers.push(target.blocker);
  if (entities.relativeDays === undefined) {
    blockers.push({
      id: "scheduled_at",
      type: "date_required",
      message: "No follow-up date could be determined.",
      field: "scheduled_at",
      required: true,
    });
  }

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

  const action: PlannedAction = {
    id: actionId,
    operation: "note_followup",
    params,
    blockers,
    dependsOn: [],
    confidence: computeActionConfidence(baseConfidence, blockers.length, validationErrors.length),
  };

  return { action, validationErrors, consumedSections: ["customer", "followups"] };
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

const ALL_SECTIONS = [
  "customer",
  "project",
  "requirements",
  "products",
  "measurements",
  "budget",
  "timeline",
  "tasks",
  "followups",
  "documents",
  "actions",
] as const;

function isSectionPopulated(
  intent: BusinessIntent,
  section: (typeof ALL_SECTIONS)[number],
): boolean {
  const value = intent[section];
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).length > 0;
}

/** Returned when the BusinessIntent itself fails businessIntentSchema,
 *  before any action could even be considered — an empty, structurally
 *  invalid-input plan, never a thrown exception (this Planner never throws
 *  on bad input; a reviewer sees a plan with the problem named in
 *  `validationErrors`, same "surface, don't crash" discipline
 *  notify.server.ts and the Universal Entity Resolver already follow for
 *  their own failure modes). */
function invalidIntentPlan(error: z.ZodError): BusinessIntentExecutionPlan {
  return {
    actions: [],
    dependencies: [],
    validationErrors: zodIssuesToValidationErrors(error, undefined),
    suggestedQuestions: [],
    confidence: 0,
    estimatedImpact: [],
    unhandledSections: [],
  };
}

/**
 * Turns a BusinessIntent into a BusinessIntentExecutionPlan. See this
 * file's header comment for the full contract and the action-selection
 * rules. Read-only end to end — every `await` in this function resolves to
 * either a `list*()`/`find*ByPhone()` lookup (via the resolvers imported
 * above) or plain, synchronous, deterministic computation. Never throws on
 * a malformed `rawIntent` — see `invalidIntentPlan()`.
 */
export async function planFromBusinessIntent(
  rawIntent: BusinessIntent,
  context?: VieActionContext,
): Promise<BusinessIntentExecutionPlan> {
  const parsed = businessIntentSchema.safeParse(rawIntent);
  if (!parsed.success) return invalidIntentPlan(parsed.error);
  const intent = parsed.data;

  const baseConfidence = intent.confidence ?? DEFAULT_BASE_CONFIDENCE;
  const nextActionId = makeActionIdFactory();

  const actions: PlannedAction[] = [];
  const dependencies: PlannedActionDependency[] = [];
  const validationErrors: PlanValidationError[] = [];
  const consumedSections = new Set<string>();

  // Customer resolution runs once, shared by every action below that needs
  // a customer_id — never re-queried per action (note_followup is the one
  // exception, by design; see buildNoteFollowupAction's own comment).
  const customer = await resolveCustomerForPlan(intent);
  let customerActionId: string | null = null;

  const hasAnyCustomerInfo = Boolean(intent.customer && Object.keys(intent.customer).length > 0);
  if (!customer.customerId && !customer.ambiguousBlocker && hasAnyCustomerInfo) {
    const id = nextActionId();
    const built = await buildCreateCustomerAction(intent, id, baseConfidence);
    actions.push(built.action);
    validationErrors.push(...built.validationErrors);
    built.consumedSections.forEach((s) => consumedSections.add(s));
    customerActionId = id;
  }

  // products present -> create_quotation; else requirements-only ->
  // log_enquiry. Never both — see this file's header comment.
  const hasProducts = (intent.products?.length ?? 0) > 0;
  const hasRequirementsOnly = !hasProducts && Boolean(intent.requirements?.summary);

  let demandActionId: string | null = null;
  if (hasProducts) {
    const id = nextActionId();
    const built = await buildCreateQuotationAction(intent, id, baseConfidence, customer);
    actions.push(built.action);
    validationErrors.push(...built.validationErrors);
    built.consumedSections.forEach((s) => consumedSections.add(s));
    demandActionId = id;
  } else if (hasRequirementsOnly) {
    const id = nextActionId();
    const built = await buildLogEnquiryAction(intent, id, baseConfidence, customer);
    actions.push(built.action);
    validationErrors.push(...built.validationErrors);
    built.consumedSections.forEach((s) => consumedSections.add(s));
    demandActionId = id;
  }

  let followupActionId: string | null = null;
  if ((intent.followups?.length ?? 0) > 0) {
    const id = nextActionId();
    const built = await buildNoteFollowupAction(intent, id, baseConfidence, context);
    actions.push(built.action);
    validationErrors.push(...built.validationErrors);
    built.consumedSections.forEach((s) => consumedSections.add(s));
    followupActionId = id;
  }

  // Dependencies: an action that needs a customer_id but the customer
  // doesn't exist YET (a create_customer action is also proposed, in this
  // same plan, for the same intent.customer) depends on that action
  // running first. The demand action (log_enquiry/create_quotation) always
  // qualifies whenever customerActionId is set — it shares the exact same
  // `customer` resolution, so its own params.customer_id is guaranteed
  // null in that case. note_followup resolves independently (see
  // buildNoteFollowupAction), so it only gets the dependency when its own
  // resolution also came back empty — inspected directly off the built
  // action's params rather than threaded through as a separate flag.
  if (customerActionId) {
    if (demandActionId) {
      dependencies.push({
        actionId: demandActionId,
        dependsOnActionId: customerActionId,
        reason: "needs the customer record created by this action before it has a customer_id",
      });
    }
    if (followupActionId) {
      const followupAction = actions.find((a) => a.id === followupActionId);
      if (followupAction && followupAction.params.entity_id == null) {
        dependencies.push({
          actionId: followupActionId,
          dependsOnActionId: customerActionId,
          reason:
            "needs the customer record created by this action before a follow-up target exists",
        });
      }
    }
  }

  // Project the dependency graph onto each action's own `dependsOn` — a
  // single source of truth (`dependencies` above), never independently set.
  for (const action of actions) {
    action.dependsOn = dependencies
      .filter((d) => d.actionId === action.id)
      .map((d) => d.dependsOnActionId);
  }

  const estimatedImpact = actions.map(estimateImpact);
  const suggestedQuestions = actions.flatMap((action) =>
    suggestedQuestionsFor(action.id, action.blockers),
  );

  const unhandledSections = ALL_SECTIONS.filter(
    (section) => isSectionPopulated(intent, section) && !consumedSections.has(section),
  );

  const confidence =
    actions.length > 0
      ? Math.min(...actions.map((a) => a.confidence))
      : validationErrors.length > 0
        ? 0
        : 1;

  return {
    actions,
    dependencies,
    validationErrors,
    suggestedQuestions,
    confidence,
    estimatedImpact,
    unhandledSections,
  };
}
