import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const FOLLOWUP_CHANNELS = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site visit" },
] as const;

export const FOLLOWUP_ENTITY_TYPES = [
  { value: "enquiry", label: "Enquiry" },
  { value: "customer", label: "Customer" },
  { value: "project", label: "Project" },
  { value: "vendor", label: "Vendor" },
  { value: "rfq", label: "RFQ" },
  { value: "purchase_order", label: "Purchase order" },
  { value: "sales_order", label: "Sales order" },
  { value: "dispatch", label: "Dispatch" },
  { value: "invoice", label: "Invoice" },
] as const;

export type FollowupEntityType = (typeof FOLLOWUP_ENTITY_TYPES)[number]["value"];

const ENTITY_TYPE_ENUM = z.enum([
  "enquiry",
  "customer",
  "project",
  "vendor",
  "rfq",
  "purchase_order",
  "sales_order",
  "dispatch",
  "invoice",
]);

/**
 * Follow-ups are polymorphic. Every follow-up belongs to exactly ONE primary entity
 * (entity_type + entity_id). Legacy enquiry_id / project_id / customer_id columns are
 * populated by the API layer as derived context so timelines and RLS keep working.
 */
export const followupCreateSchema = z.object({
  entity_type: ENTITY_TYPE_ENUM,
  entity_id: zUuid,
  scheduled_at: z.string().min(1, "Scheduled date/time is required"),
  channel: z.enum(["call", "whatsapp", "email", "meeting", "site_visit"]).default("call"),
  notes: zOptional(),
});
export type FollowupCreateInput = z.infer<typeof followupCreateSchema>;

export const followupCompleteSchema = z.object({
  id: zUuid,
  outcome_notes: zOptional(),
});
export type FollowupCompleteInput = z.infer<typeof followupCompleteSchema>;
