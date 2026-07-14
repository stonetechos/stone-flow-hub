/**
 * Configurable thresholds for the Sales Intelligence Pack (Phase G.2).
 *
 * Centralised so every provider tunes from the same place instead of
 * hard-coding its own magic numbers, and so a future settings surface has
 * one obvious module to wire a UI onto.
 */
import type { LeadStage } from "@/lib/types";

export const QUOTE_AGEING_THRESHOLDS = {
  /** <= this many days since issue: healthy — no insight raised. */
  healthyMaxDays: 7,
  /** <= this many days: "ageing" (warning); beyond it: "stale" (risk). */
  ageingMaxDays: 21,
};

/** Days of inactivity, per lead stage, before an open enquiry counts as
 *  "cold". Stages not listed fall back to DEFAULT_COLD_THRESHOLD_DAYS. */
export const STAGE_COLD_THRESHOLD_DAYS: Partial<Record<LeadStage, number>> = {
  new_lead: 2,
  contacted: 3,
  site_visit_scheduled: 5,
  site_visit_completed: 5,
  sample_sent: 7,
  customer_quotation_sent: 10,
  negotiation: 7,
  qualified: 5,
  rfq_sent: 7,
  vendor_quote_received: 5,
  vendor_approved: 5,
  customer_approved: 5,
  production: 10,
  dispatch: 10,
};
export const DEFAULT_COLD_THRESHOLD_DAYS = 7;

/** Stages that represent a resolved (won or lost) enquiry — excluded from
 *  both ColdEnquiry and LostOpportunity detection. */
export const CLOSED_LEAD_STAGES = new Set<LeadStage>([
  "lost",
  "cancelled",
  "completed",
  "after_sales",
]);

export const LOST_OPPORTUNITY_THRESHOLDS = {
  /** Enquiry budget must be at least this much to qualify as "high value". */
  minValueInr: 200_000,
  /** Must have been inactive at least this many days. */
  minIdleDays: 21,
};

export const FOLLOWUP_RECOMMENDATION_WINDOW = {
  /** "becoming overdue tomorrow" horizon, in days from today. */
  dueTomorrowOffsetDays: 1,
};
