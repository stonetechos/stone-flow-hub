/**
 * Vedora Intelligence Engine (VIE) — Phase 1 shared types.
 *
 * See ADR-0001 (project docs: engineering/ADR-0001-vedora-intelligence-engine-phase1.md)
 * for the full architecture. Summary of the boundary these types encode:
 *
 *   Employee -> VIE (understand) -> Planner (plan) -> Workflow Engine (execute) -> ERP modules
 *
 * VieUnderstanding is the ONLY thing the LLM ever produces — a classification,
 * never a database write. VieExecutionPlan is the ONLY thing the Planner ever
 * produces — resolved parameters and a decision, never a database write.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Intents — Phase 1 shipped two (log_enquiry, note_followup). Phase 2
// Milestone 2 adds a third, create_customer, exactly the way this comment
// always said a new intent should arrive: additively (a new union member +
// a new Action Registry handler), with no change to VIE/Planner/Workflow
// Engine core files. See engineering/VIE-Phase2-Milestone2-Review.md and
// VIE-CreateCustomer-UX-Contract.md (Claude project docs) for the full
// design behind create_customer specifically.
//
// Phase 3 (create_quotation) Milestone 2 adds a fourth intent, additively,
// the same way — but note this member is not yet reachable end to end: VIE's
// own classifier (understand.ts's KNOWN_INTENTS, and prompts.ts) has its own
// separate, hardcoded intent list and was NOT updated here (out of scope for
// this milestone — see planner/index.ts's planCreateQuotation for why).
// Until a later milestone updates those, understand() can never actually
// classify an utterance as "create_quotation" — this union member exists
// solely so the Planner has a branch ready to receive it once VIE does. See
// VIE-CreateQuotation-Architecture-Review.md §12 for the full staged order
// this follows.
// ---------------------------------------------------------------------------

export const VIE_INTENTS = [
  "log_enquiry",
  "note_followup",
  "create_customer",
  "create_quotation",
] as const;
export type VieIntent = (typeof VIE_INTENTS)[number];

/** What VIE classifies an utterance as. "unsupported" covers everything
 *  outside VIE's supported intents (dispatch, payment, quotation, general
 *  chat, ...) — it is never executed, only recorded (see vie.functions.ts). */
export type VieClassifiedIntent = VieIntent | "unsupported";

export type VieLanguage = "en" | "hi" | "gu" | "mixed" | "unknown";

// ---------------------------------------------------------------------------
// Per-intent entity shapes. Validated against the LLM's raw JSON output
// immediately, before the Planner ever sees it.
// ---------------------------------------------------------------------------

export const logEnquiryEntitiesSchema = z.object({
  customerName: z.string().trim().min(1).optional(),
  productText: z.string().trim().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().trim().min(1).optional(),
  rate: z.number().positive().optional(),
  // Voice-capture foundation additions (Goal 5) — an EXPLICITLY stated
  // budget/timeline/requirement, distinct from what planLogEnquiry already
  // derives from quantity*rate. All three optional, extracted permissively,
  // never fabricated — same discipline as every field above. See
  // planner/index.ts's planLogEnquiry for exactly how each is used:
  // budgetInr overrides the derived calculation when stated explicitly,
  // timelineRelativeDays is deterministically converted to a real date
  // (same "LLM extracts a day count, application code does the arithmetic"
  // rule note_followup's relativeDays already established — never trust
  // the model to compute a date itself), requirements is folded into the
  // enquiry's notes ahead of the boilerplate "AI-logged from" line.
  budgetInr: z.number().positive().optional(),
  timelineRelativeDays: z.number().int().min(0).optional(),
  requirements: z.string().trim().min(1).optional(),
});
export type LogEnquiryEntities = z.infer<typeof logEnquiryEntitiesSchema>;

export const noteFollowupEntitiesSchema = z.object({
  targetName: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1),
  relativeDays: z.number().int().min(0).optional(),
  channel: z.enum(["call", "whatsapp", "email", "meeting", "site_visit"]).optional(),
});
export type NoteFollowupEntities = z.infer<typeof noteFollowupEntitiesSchema>;

/**
 * create_customer entities (VIE-CreateCustomer-UX-Contract.md §4/§5). Kept
 * fully optional at this extraction layer, same discipline as the two
 * schemas above — a partial extraction (e.g. no mobile mentioned) must
 * still reach the Planner, whose blocker logic (planner/index.ts's
 * planCreateCustomer) decides what forces "draft," not this schema. The
 * deeper, stricter requirement (a valid mobile number is mandatory to
 * actually create a customer) is enforced downstream by
 * customers/schema.ts's customerCreateSchema, invoked only inside
 * createCustomer() — this schema intentionally does not duplicate that
 * strictness. customerType's enum is a redundant, standalone literal
 * (rather than importing customers/schema.ts's CUSTOMER_TYPES) to keep
 * VIE's entity layer decoupled from ERP module internals — the same choice
 * noteFollowupEntitiesSchema's `channel` enum already makes relative to
 * followups/schema.ts.
 */
export const createCustomerEntitiesSchema = z.object({
  customerName: z.string().trim().min(1).optional(),
  mobile: z.string().trim().min(1).optional(),
  // Voice-capture foundation additions (Goal 5) — both are real columns on
  // `customers` (primary_email, billing_address) via createCustomer()'s
  // existing `email`/`billing_address` params, so unlike some of this
  // sprint's other extraction additions these need no notes-folding
  // workaround; planCreateCustomer passes them straight through. Optional
  // and non-fabricated, same as every field on this schema — no email/
  // address mentioned means the field is simply absent, never guessed.
  email: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  customerType: z
    .enum([
      "individual",
      "company",
      "builder",
      "architect",
      "interior_designer",
      "contractor",
      "government",
      "other",
    ])
    .optional(),
});
export type CreateCustomerEntities = z.infer<typeof createCustomerEntitiesSchema>;

/**
 * A single raw, unresolved line item as VIE extracts it (VIE Phase 3 —
 * Milestone 5: Line-Item Extraction, per
 * engineering/VIE-CreateQuotation-LineItems-Design.md §2/§3). Field names
 * intentionally mirror logEnquiryEntitiesSchema's existing
 * productText/quantity/unit/rate above — prompts.ts (Milestone 3) already
 * emits exactly these names per line item, and reusing them keeps VIE's
 * raw-extraction vocabulary for "a material mention with quantity and rate"
 * identical across log_enquiry and create_quotation rather than inventing a
 * quotation-specific dialect. All fields are optional at this layer for the
 * same reason every other entities schema here is fully optional: a partial
 * extraction must still reach the Planner, whose blocker logic decides what
 * forces "draft," not this schema.
 */
export const createQuotationLineItemEntitySchema = z.object({
  productText: z.string().trim().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().trim().min(1).optional(),
  rate: z.number().positive().optional(),
});
export type CreateQuotationLineItemEntity = z.infer<typeof createQuotationLineItemEntitySchema>;

/**
 * create_quotation entities (VIE Phase 3). Milestone 2 shipped a single
 * optional `customerName`, just enough surface for planCreateQuotation() to
 * drive the resolveCustomer() -> resolveProject() chain. Milestone 5 added
 * `items`, an optional array of createQuotationLineItemEntitySchema —
 * per VIE-CreateQuotation-LineItems-Design.md §2, this is the raw
 * extraction shape only; resolution against real products (resolveProduct()),
 * per-item blocker computation, and the rename to the quote schema's field
 * names (rate -> unit_price, productText -> description / product_id) all
 * happen in the Planner (planCreateQuotation), never here.
 *
 * Milestone 6 (VIE-CreateQuotation-Midpoint-Review.md §2/§7/§8) adds two
 * fields prompts.ts (Milestone 3) already documents and demonstrates in its
 * few-shot examples but which were never declared here — meaning both were
 * being silently stripped by `.parse()` before the Planner ever saw them,
 * the same "prompt promises, schema doesn't deliver" gap the Midpoint
 * Review flagged for exactly these two fields:
 *
 * - `projectText`: an optional explicit reference to which of the
 *   customer's projects the utterance means (e.g. "the Shah project"),
 *   letting resolveProject() narrow among multiple candidates instead of
 *   always blocking on ambiguity — per
 *   VIE-CreateQuotation-UX-Contract.md §4's own anticipation of "an
 *   explicit project reference" as a legitimate resolution path alongside
 *   the existing single-obvious-candidate-or-blocker approach.
 * - `category`: the quotation-level installation/fulfilment category
 *   ("supply_only" | "supply_and_installation" | "installation_only" |
 *   "material_and_labour") — a real, already-existing field on the write
 *   path (quotes/schema.ts's QUOTE_CATEGORIES / quoteCreateSchema.category)
 *   that actions/createQuotation.ts (Milestone 4) already reads from
 *   `params.category` and has always been ready to receive; the Planner
 *   simply never populated it. The enum is redundantly restated here rather
 *   than imported from quotes/schema.ts, the same decoupling choice
 *   createCustomerEntitiesSchema's own `customerType` enum already makes
 *   relative to customers/schema.ts.
 *
 * Both fields are optional, extracted permissively, and never fabricated —
 * same discipline as every other field on this schema.
 */
export const createQuotationEntitiesSchema = z.object({
  customerName: z.string().trim().min(1).optional(),
  projectText: z.string().trim().min(1).optional(),
  items: z.array(createQuotationLineItemEntitySchema).optional(),
  category: z
    .enum(["supply_only", "supply_and_installation", "installation_only", "material_and_labour"])
    .optional(),
  // Voice-capture foundation addition (Goal 5) — free-text requirements
  // beyond what the structured `items` array captures (e.g. "must match
  // the existing flooring", "site has limited parking for delivery").
  // Folded into the quote's notes field by planCreateQuotation, same
  // "requirements ahead of the boilerplate AI-logged line" pattern
  // logEnquiryEntitiesSchema's own `requirements` field uses.
  requirements: z.string().trim().min(1).optional(),
});
export type CreateQuotationEntities = z.infer<typeof createQuotationEntitiesSchema>;

// ---------------------------------------------------------------------------
// VIE output
// ---------------------------------------------------------------------------

/** Produced by understand.ts. Structure only — never a database row, never
 *  a decision about what to do. */
export interface VieUnderstanding {
  intent: VieClassifiedIntent;
  /** Raw, unvalidated entities as the LLM returned them. Validated per-intent
   *  by the Planner via the schemas above before use. */
  entities: Record<string, unknown>;
  confidence: number; // 0..1
  language: VieLanguage;
  originalText: string;
  /** English gloss of the utterance's meaning, for storage/audit — never a
   *  second AI call, computed as part of the same classification response. */
  canonicalText: string;
}

// ---------------------------------------------------------------------------
// Execution policy (ADR-0001 §6)
// ---------------------------------------------------------------------------

export type VieExecutionMode = "auto" | "confirm" | "draft";

export interface VieExecutionPolicy {
  mode: VieExecutionMode;
  /** Only consulted when mode === "auto". Stored as data (app_settings), not
   *  a code constant — "do not hardcode thresholds" (ADR-0001 requirement 4). */
  autoThreshold: number;
}

// ---------------------------------------------------------------------------
// Planner output
// ---------------------------------------------------------------------------

/** Caller-supplied context — e.g. "the record currently open" — mirrors
 *  nl-search's context.entity/entityId pattern. Phase 1 has no UI to supply
 *  this yet; it exists so note_followup resolution has a real path once one
 *  exists, without VIE core changing later. */
export interface VieActionContext {
  entityType?: string;
  entityId?: string;
}

// ---------------------------------------------------------------------------
// Structured Planner blockers (Sprint AI-1.5).
//
// Before this sprint, `VieExecutionPlan.blockers` was `string[]` — a
// human-readable sentence per unresolved prerequisite ("Customer ambiguous",
// "No quantity was extracted..."). That was fine for a completion-report
// bullet point but unusable for a UI: rendering a real control (a radio list
// of candidate customers, a date picker, a number input) from an English
// sentence means parsing prose, which is exactly the "UI performs AI
// reasoning" anti-pattern this sprint exists to remove. `PlannerBlocker`
// replaces the string with the same information a human already had (via
// `message`, kept verbatim for anything that still just displays text) PLUS
// the structure a renderer needs to pick the right control without parsing
// anything: which kind of blocker it is (`type`), which `plan.params` key it
// resolves (`field`), and — for anything selection-shaped — the real
// candidate records the resolver already had in hand when it decided the
// match was ambiguous (`candidates`).
//
// This does NOT change what makes a plan blocked: `resolveEffectiveMode()`
// still only ever asks `blockers.length > 0` (see planner/index.ts) — the
// execution-mode downgrade rule from ADR-0001 §6 is completely unchanged.
// This only changes what each blocker IS, not whether one exists or what it
// does once it does.
// ---------------------------------------------------------------------------

/**
 * The closed set of blocker shapes a renderer needs to know about. Every
 * blocker any existing intent produces today fits one of these; a future
 * intent adding a genuinely new kind of unresolved prerequisite should add
 * a new member here rather than overloading an existing one (see
 * docs/VIE-Structured-Blockers.md "How future intents add blockers").
 *
 * "vendor_selection" has no producer yet (VIE has no vendor-facing intent
 * today) — included because the sprint's own model names it explicitly as
 * a real future case (a purchase/RFQ intent would need it) and the type is
 * free to declare; the UI's generic renderer (see VieActionCard.tsx) treats
 * it identically to every other `*_selection` type, so adding the producer
 * later needs no UI change.
 */
export const PLANNER_BLOCKER_TYPES = [
  "customer_selection",
  "vendor_selection",
  "project_selection",
  "product_selection",
  "stone_selection",
  "colour_selection",
  "finish_selection",
  "thickness_selection",
  "quantity_required",
  "unit_price_required",
  "delivery_date_required",
  "date_required",
  "text_required",
  "number_required",
  "confirmation_required",
] as const;
export type PlannerBlockerType = (typeof PLANNER_BLOCKER_TYPES)[number];

/** One option a `*_selection`/`confirmation_required` blocker offers —
 *  always a REAL record the resolver already fetched (a customer, a
 *  project, ...), never invented for display. `subtitle` is whatever
 *  secondary identifier that record type already shows elsewhere (a
 *  customer/project code) — optional because not every candidate kind has
 *  one. */
export interface PlannerBlockerCandidate {
  id: string;
  label: string;
  subtitle?: string;
}

/**
 * One unresolved prerequisite a Planner `planX()` function found while
 * preparing a plan. See docs/VIE-Structured-Blockers.md for the full
 * rendering contract and lifecycle.
 */
export interface PlannerBlocker {
  /** Stable within one plan — every current producer uses `field` itself
   *  (fields are unique per blocker instance within a single plan, even
   *  across create_quotation's per-line-item blockers, since those fields
   *  are already index-qualified — see `field` below), so this never needs
   *  a separate counter or random id. */
  id: string;
  type: PlannerBlockerType;
  /** Human-readable, same content a pre-Sprint-AI-1.5 string blocker would
   *  have carried — still shown as-is by any renderer (or log line) that
   *  doesn't special-case `type`, so nothing that only ever displayed text
   *  loses information. */
  message: string;
  /** Dot-path into `VieExecutionPlan.params` this blocker resolves once
   *  filled in, e.g. `"customer_id"`, `"scheduled_at"`, or
   *  `"items.0.quantity"` for a per-line-item field. `completeDraftAction`'s
   *  `patch` is still a flat `Record<string, unknown>` keyed by top-level
   *  `params` keys (unchanged — see vie.functions.ts); a dotted `field` on
   *  a nested blocker is informational for the renderer today, not (yet) a
   *  literal patch key the Workflow Engine merges positionally. */
  field: string;
  /** Every blocker any current Planner function produces is a hard
   *  requirement — a non-empty `blockers` array always forces "draft"
   *  (resolveEffectiveMode, unchanged). This field exists so the model
   *  doesn't have to be revisited if a future intent ever wants to record
   *  an advisory, non-blocking note alongside real blockers — none does
   *  today, so every producer in this codebase sets it `true`. */
  required: boolean;
  /** Whatever raw value is already known for this field — the extracted
   *  text that failed to resolve uniquely, for a selection blocker; omitted
   *  (never fabricated as `null`) when nothing was extracted at all. */
  currentValue?: unknown;
  /** Only present on `*_selection` and `confirmation_required` blockers —
   *  the resolver's own real match list, already fetched, never a second
   *  lookup by the UI. Absent (not empty) when the blocker type has no
   *  concept of candidates (e.g. `quantity_required`). */
  candidates?: PlannerBlockerCandidate[];
}

/** Prepared by planAction(). Contains fully-resolved parameters ready to
 *  hand to the Workflow Engine's registered handler. The Planner NEVER
 *  writes to the database — see ADR-0001 §2/§3. */
export interface VieExecutionPlan {
  operation: VieIntent;
  params: Record<string, unknown>;
  /** The configured policy mode for this intent, before any downgrade. */
  mode: VieExecutionMode;
  /** The mode actually applied, after the blocker/confidence downgrade rule
   *  in planner/index.ts's resolveEffectiveMode(). */
  effectiveMode: VieExecutionMode;
  /** Unresolved prerequisites (ambiguous/missing customer, missing date,
   *  ...). Any non-empty blockers list forces effectiveMode to "draft"
   *  regardless of the configured policy — unchanged from before Sprint
   *  AI-1.5; only the shape of each entry changed, from a plain string to
   *  a PlannerBlocker (see above). */
  blockers: PlannerBlocker[];
}

// ---------------------------------------------------------------------------
// Persistence lifecycle
// ---------------------------------------------------------------------------

export type VieActionStatus =
  | "pending"
  | "planned"
  | "awaiting_confirmation"
  | "draft"
  | "confirmed"
  | "executing"
  | "applied"
  | "rejected"
  | "failed";

// ---------------------------------------------------------------------------
// VIE Planner sprint (2026-07-28) — BusinessIntentExecutionPlan.
//
// A second, parallel "Planner output" shape, alongside VieExecutionPlan
// above. VieExecutionPlan is produced from a single, already-classified
// VieUnderstanding (one utterance -> one VieIntent -> one plan) and carries
// an execution-mode decision (`mode`/`effectiveMode`) because that pipeline
// can auto-execute. planFromBusinessIntent() (planner/fromBusinessIntent.ts)
// is different on both counts: a BusinessIntent (businessIntent.ts) is
// multi-section and source-independent, so ONE BusinessIntent can imply
// SEVERAL actions (e.g. a new customer AND an enquiry AND a follow-up, in
// one plan, with real ordering constraints between them) — hence `actions`
// is a list, not a single `operation`, and this shape adds `dependencies`
// to express "action B needs action A's record to exist first," a concept
// VieExecutionPlan has never needed (it only ever produces one action).
// There is no `mode`/`effectiveMode` here at all: per the brief that
// introduced this shape, a BusinessIntentExecutionPlan is ALWAYS "a
// reviewable plan only" — auto-execution policy is explicitly out of scope
// for this Planner; wiring any of these plans to the Workflow Engine is a
// distinct, future decision, not made by producing the plan itself.
//
// Every `PlannedAction.params` key name is chosen to exactly match the
// param shape the SAME `operation`'s existing action handler
// (actions/logEnquiry.ts, actions/createCustomer.ts,
// actions/createQuotation.ts, actions/noteFollowup.ts) and the
// SAME-operation branch of VieExecutionPlan.params already use — so a
// future Workflow Engine wiring of this plan shape needs no param
// translation layer, only a decision about whether/when to call it.
// ---------------------------------------------------------------------------

/** One structural or schema-level problem found while building a plan —
 *  malformed/invalid DATA (e.g. a value that fails a Zod constraint),
 *  distinct from a `PlannerBlocker` (MISSING or AMBIGUOUS information that
 *  a human needs to supply/choose). A plan can have blockers with zero
 *  validation errors (common — most BusinessIntent fields are simply
 *  absent) or, more rarely, a validation error (a value was present but
 *  invalid) — the two lists are never merged, since a UI renders them
 *  differently ("please provide X" vs. "X you gave us doesn't look right"). */
export interface PlanValidationError {
  /** Which planned action this belongs to; absent for a structural problem
   *  against the BusinessIntent itself (e.g. it failed businessIntentSchema
   *  entirely), found before any action could even be considered. */
  actionId?: string;
  /** Dot-path field name, same convention as PlannerBlocker.field. */
  field: string;
  message: string;
  /** The originating Zod issue code (e.g. "invalid_type", "too_small") —
   *  kept as a plain string rather than importing Zod's own issue-code type
   *  into this shared types module. */
  code: string;
}

/** A deterministic, table-driven human-readable question for one
 *  PlannerBlocker — see BLOCKER_QUESTION_TEMPLATES in
 *  planner/fromBusinessIntent.ts. Never LLM-generated; the same closed set
 *  of PLANNER_BLOCKER_TYPES this file already declares maps to a fixed
 *  question template per type. */
export interface PlannerSuggestedQuestion {
  actionId: string;
  blockerId: string;
  question: string;
}

/** A deterministic, arithmetic-only (never LLM-guessed) summary of what
 *  executing one planned action would actually do — the same "application
 *  code computes, the model never does" rule budget_inr/scheduled_at
 *  already follow in planner/index.ts, applied here to describing
 *  consequences instead of computing params. */
export interface PlannerEstimatedImpact {
  actionId: string;
  operation: VieIntent;
  entityType: string;
  recordsCreated: number;
  summary: string;
}

/** One ordering constraint between two actions in the SAME plan — e.g.
 *  "log this enquiry" depends on "create this customer" when the customer
 *  doesn't exist yet and both are proposed together. This is the one
 *  concept VieExecutionPlan never needed (it only ever produces a single
 *  action) and the reason `actions` below is a list rather than one
 *  `operation`/`params` pair. Never itself a blocker — a dependency is
 *  about SEQUENCE, not about missing information; an action can have a
 *  dependency and zero blockers (it's fully specified, it just has to wait
 *  its turn), or blockers and no dependency (it's independently
 *  incomplete). */
export interface PlannedActionDependency {
  actionId: string;
  dependsOnActionId: string;
  reason: string;
}

/** One action this Planner decided a BusinessIntent implies. Never applied,
 *  never mutates anything by existing — see planFromBusinessIntent()'s own
 *  header comment for the full "never mutate, never call an ERP action"
 *  contract this shape's producer follows. */
export interface PlannedAction {
  /** Stable within one plan, assigned in the deterministic build order
   *  planFromBusinessIntent() always uses (create_customer, then whichever
   *  of log_enquiry/create_quotation applies, then note_followup) — same
   *  input always yields the same ids, never a random/counter value that
   *  could differ run to run. */
  id: string;
  operation: VieIntent;
  /** Ready-to-hand-to-a-Workflow-Engine-handler params, using the exact
   *  same key names as this operation's VieExecutionPlan.params branch
   *  (see this section's header comment) — populated best-effort even when
   *  `blockers` is non-empty, same "prepare what's known, block on what
   *  isn't" discipline planner/index.ts's existing planX() functions use. */
  params: Record<string, unknown>;
  blockers: PlannerBlocker[];
  /** Derived, not independently set — always exactly the set of
   *  `dependsOnActionId`s from BusinessIntentExecutionPlan.dependencies
   *  whose `actionId` equals this action's `id`. A convenience projection
   *  for a renderer that only needs "can this action run yet," not the
   *  full graph with reasons. */
  dependsOn: string[];
  /** 0..1, deterministically derived from the source BusinessIntent's own
   *  `confidence` (defaulting to a neutral 0.5 when the source didn't
   *  supply one — see fromBusinessIntent.ts) discounted by this action's
   *  own blocker/validation-error count. Never itself LLM-produced. */
  confidence: number;
}

/**
 * Produced by planFromBusinessIntent() (planner/fromBusinessIntent.ts).
 * "A reviewable plan only" — see this section's header comment for why
 * there is no execution-mode field here.
 */
export interface BusinessIntentExecutionPlan {
  actions: PlannedAction[];
  dependencies: PlannedActionDependency[];
  validationErrors: PlanValidationError[];
  suggestedQuestions: PlannerSuggestedQuestion[];
  /** Plan-level: the minimum of every action's own confidence (a plan is
   *  only as confident as its least-confident action), or — when `actions`
   *  is empty — 1 when nothing was wrong (a legitimate "nothing to
   *  propose" outcome) or 0 when the BusinessIntent itself failed
   *  structural validation. Never itself LLM-produced. */
  confidence: number;
  estimatedImpact: PlannerEstimatedImpact[];
  /** BusinessIntent top-level sections that had content but weren't read by
   *  ANY proposed action's params — computed generically (see
   *  fromBusinessIntent.ts), not a hardcoded per-action list, so it stays
   *  honest as this Planner's action coverage grows. Today this always
   *  includes `measurements`/`tasks`/`documents`/`actions` when populated
   *  (no VIE action handler reads any of them yet), and conditionally
   *  `budget`/`timeline` when create_quotation (not log_enquiry) was the
   *  chosen path, since quoteCreateSchema has no single budget/timeline
   *  field the way logEnquiryEntitiesSchema does. */
  unhandledSections: string[];
}
