import type { LeadStage } from "@/lib/types";

/** Ordered 16-stage pipeline + display metadata. Single source of truth. */
export const LEAD_STAGES: ReadonlyArray<{
  value: LeadStage;
  label: string;
  group: "active" | "won" | "lost";
}> = [
  { value: "new_lead", label: "New Lead", group: "active" },
  { value: "contacted", label: "Contacted", group: "active" },
  { value: "site_visit_scheduled", label: "Site Visit Scheduled", group: "active" },
  { value: "site_visit_completed", label: "Site Visit Completed", group: "active" },
  { value: "sample_sent", label: "Sample Sent", group: "active" },
  { value: "customer_quotation_sent", label: "Customer Quotation Sent", group: "active" },
  { value: "negotiation", label: "Negotiation", group: "active" },
  { value: "rfq_sent", label: "RFQ Sent", group: "active" },
  { value: "vendor_quote_received", label: "Vendor Quote Received", group: "active" },
  { value: "vendor_approved", label: "Vendor Approved", group: "active" },
  { value: "customer_approved", label: "Customer Approved", group: "active" },
  { value: "production", label: "Production", group: "active" },
  { value: "dispatch", label: "Dispatch", group: "active" },
  { value: "completed", label: "Completed", group: "won" },
  { value: "lost", label: "Lost", group: "lost" },
  { value: "cancelled", label: "Cancelled", group: "lost" },
] as const;

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.value, s.label]),
) as Record<LeadStage, string>;

/** Stages considered "active" for revenue pipeline KPIs. */
export const ACTIVE_STAGES: ReadonlyArray<LeadStage> = LEAD_STAGES.filter(
  (s) => s.group === "active",
).map((s) => s.value);

export const TERMINAL_STAGES: ReadonlyArray<LeadStage> = ["completed", "lost", "cancelled"];

export const FILES_BUCKET = "stonetech-files";
