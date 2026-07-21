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
   *  regardless of the configured policy. */
  blockers: string[];
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
