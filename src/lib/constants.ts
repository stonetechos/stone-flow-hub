import type { LeadStage } from "@/lib/types";

/**
 * BUSINESS-FRIENDLY LEAD PIPELINE ("umbrellas")
 *
 * These 13 umbrellas are what users see everywhere (CRM column, filters,
 * dashboard widget, reports). Each umbrella groups one or more underlying
 * `lead_stage` enum values. The underlying values continue to power all
 * existing automations (RFQ engine, quote/production/dispatch/etc.) — nothing
 * about the backend workflow changes.
 *
 * Rule: the primary display for `enq.stage` is the umbrella; the raw stage is
 * shown as an operational milestone inside the umbrella on the lead detail.
 */

export type LeadUmbrellaId =
  | "new_enquiry"
  | "exploration"
  | "requirement_gathering"
  | "quotation_sent"
  | "negotiation"
  | "qualified"
  | "order_confirmed"
  | "procurement"
  | "execution"
  | "completed"
  | "after_sales"
  | "lost"
  | "cancelled";

export type LeadUmbrella = {
  id: LeadUmbrellaId;
  label: string;
  /** Underlying enum values grouped under this umbrella. First = primary. */
  stages: ReadonlyArray<LeadStage>;
  /** Ordered milestones shown as checkpoints inside the umbrella. */
  milestones: ReadonlyArray<{ stage: LeadStage; label: string }>;
  /** Pipeline group used for grouping/coloring. */
  group: "active" | "won" | "post_sale" | "lost";
};

export const LEAD_UMBRELLAS: ReadonlyArray<LeadUmbrella> = [
  {
    id: "new_enquiry",
    label: "New Enquiry",
    stages: ["new_lead"],
    milestones: [{ stage: "new_lead", label: "Enquiry logged" }],
    group: "active",
  },
  {
    id: "exploration",
    label: "Exploration",
    stages: ["contacted"],
    milestones: [{ stage: "contacted", label: "Customer contacted" }],
    group: "active",
  },
  {
    id: "requirement_gathering",
    label: "Requirement Gathering",
    stages: ["site_visit_scheduled", "site_visit_completed", "sample_sent"],
    milestones: [
      { stage: "site_visit_scheduled", label: "Site visit scheduled" },
      { stage: "site_visit_completed", label: "Site visit completed" },
      { stage: "sample_sent", label: "Sample sent" },
    ],
    group: "active",
  },
  {
    id: "quotation_sent",
    label: "Quotation Sent",
    stages: ["customer_quotation_sent"],
    milestones: [{ stage: "customer_quotation_sent", label: "Quotation sent to customer" }],
    group: "active",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    stages: ["negotiation"],
    milestones: [{ stage: "negotiation", label: "In negotiation" }],
    group: "active",
  },
  {
    id: "qualified",
    label: "Qualified",
    stages: ["qualified"],
    milestones: [{ stage: "qualified", label: "Lead qualified" }],
    group: "active",
  },
  {
    id: "order_confirmed",
    label: "Order Confirmed",
    stages: ["customer_approved"],
    milestones: [{ stage: "customer_approved", label: "Customer approved / advance" }],
    group: "active",
  },
  {
    id: "procurement",
    label: "Procurement",
    stages: ["rfq_sent", "vendor_quote_received", "vendor_approved"],
    milestones: [
      { stage: "rfq_sent", label: "RFQ sent to vendors" },
      { stage: "vendor_quote_received", label: "Vendor quote received" },
      { stage: "vendor_approved", label: "Vendor approved" },
    ],
    group: "active",
  },
  {
    id: "execution",
    label: "Execution",
    stages: ["production", "dispatch"],
    milestones: [
      { stage: "production", label: "Production started" },
      { stage: "dispatch", label: "Dispatch scheduled" },
    ],
    group: "active",
  },
  {
    id: "completed",
    label: "Completed",
    stages: ["completed"],
    milestones: [{ stage: "completed", label: "Project completed" }],
    group: "won",
  },
  {
    id: "after_sales",
    label: "After Sales",
    stages: ["after_sales"],
    milestones: [{ stage: "after_sales", label: "After-sales engagement" }],
    group: "post_sale",
  },
  {
    id: "lost",
    label: "Lost",
    stages: ["lost"],
    milestones: [{ stage: "lost", label: "Marked lost" }],
    group: "lost",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    stages: ["cancelled"],
    milestones: [{ stage: "cancelled", label: "Cancelled" }],
    group: "lost",
  },
] as const;

/** Map every underlying enum value to its umbrella. */
export const STAGE_TO_UMBRELLA: Record<LeadStage, LeadUmbrellaId> = LEAD_UMBRELLAS.reduce(
  (acc, u) => {
    for (const s of u.stages) acc[s] = u.id;
    return acc;
  },
  {} as Record<LeadStage, LeadUmbrellaId>,
);

export const UMBRELLA_BY_ID: Record<LeadUmbrellaId, LeadUmbrella> = LEAD_UMBRELLAS.reduce(
  (acc, u) => {
    acc[u.id] = u;
    return acc;
  },
  {} as Record<LeadUmbrellaId, LeadUmbrella>,
);

export function stageToUmbrella(stage: LeadStage): LeadUmbrella {
  return UMBRELLA_BY_ID[STAGE_TO_UMBRELLA[stage]];
}

/**
 * Suggest the next stage a user might want to advance to based on the current
 * stage alone. Never triggers automatically — surfaces as a suggestion chip.
 * Signal-based suggestions (quote sent, payment received, etc.) live in
 * `src/lib/enquiries/recommendations.ts`.
 */
export function suggestNextStage(stage: LeadStage): LeadStage | null {
  const idx = ORDERED_STAGES.indexOf(stage);
  if (idx < 0 || idx >= ORDERED_STAGES.length - 1) return null;
  const next = ORDERED_STAGES[idx + 1];
  // Never suggest a terminal transition automatically.
  if (next === "lost" || next === "cancelled") return null;
  return next;
}

/**
 * ---- BACKWARDS-COMPATIBLE EXPORTS ----
 * Every existing consumer keeps working. `LEAD_STAGES`, `LEAD_STAGE_LABEL`,
 * `ACTIVE_STAGES`, `TERMINAL_STAGES` are extended (not replaced) with the two
 * new enum values.
 */
export const LEAD_STAGES: ReadonlyArray<{
  value: LeadStage;
  label: string;
  group: "active" | "won" | "lost";
}> = [
  { value: "new_lead", label: "New Enquiry", group: "active" },
  { value: "contacted", label: "Exploration", group: "active" },
  {
    value: "site_visit_scheduled",
    label: "Requirement Gathering · Site visit scheduled",
    group: "active",
  },
  {
    value: "site_visit_completed",
    label: "Requirement Gathering · Site visit completed",
    group: "active",
  },
  { value: "sample_sent", label: "Requirement Gathering · Sample sent", group: "active" },
  { value: "customer_quotation_sent", label: "Quotation Sent", group: "active" },
  { value: "negotiation", label: "Negotiation", group: "active" },
  { value: "qualified", label: "Qualified", group: "active" },
  { value: "customer_approved", label: "Order Confirmed", group: "active" },
  { value: "rfq_sent", label: "Procurement · RFQ sent", group: "active" },
  { value: "vendor_quote_received", label: "Procurement · Vendor quote received", group: "active" },
  { value: "vendor_approved", label: "Procurement · Vendor approved", group: "active" },
  { value: "production", label: "Execution · Production", group: "active" },
  { value: "dispatch", label: "Execution · Dispatch", group: "active" },
  { value: "completed", label: "Completed", group: "won" },
  { value: "after_sales", label: "After Sales", group: "won" },
  { value: "lost", label: "Lost", group: "lost" },
  { value: "cancelled", label: "Cancelled", group: "lost" },
] as const;

/** Canonical enum order used for suggestion + milestone-visited derivation. */
const ORDERED_STAGES: ReadonlyArray<LeadStage> = LEAD_STAGES.map((s) => s.value);

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.value, s.label]),
) as Record<LeadStage, string>;

export const ACTIVE_STAGES: ReadonlyArray<LeadStage> = LEAD_STAGES.filter(
  (s) => s.group === "active",
).map((s) => s.value);

export const TERMINAL_STAGES: ReadonlyArray<LeadStage> = ["completed", "lost", "cancelled"];

/** Stages that count as "lost-like" — used to trigger the lost-reason prompt. */
export const LOST_LIKE_STAGES: ReadonlyArray<LeadStage> = ["lost", "cancelled"];

export const LOST_REASONS: ReadonlyArray<string> = [
  "Price too high",
  "Timeline mismatch",
  "Chose competitor",
  "No response",
  "Budget on hold",
  "Requirement dropped",
  "Other",
];

export const FILES_BUCKET = "stonetech-files";
