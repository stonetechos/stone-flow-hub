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
// Intents — Phase 1 supports exactly two. Adding a third is meant to be
// additive (a new union member + a new Action Registry handler), never a
// change to VIE/Planner/Workflow Engine core files.
// ---------------------------------------------------------------------------

export const VIE_INTENTS = ["log_enquiry", "note_followup"] as const;
export type VieIntent = (typeof VIE_INTENTS)[number];

/** What VIE classifies an utterance as. "unsupported" covers everything
 *  outside Phase 1's two intents (dispatch, payment, quotation, general
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
