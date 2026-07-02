import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const FOLLOWUP_CHANNELS = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site visit" },
] as const;

export const followupCreateSchema = z.object({
  enquiry_id: zUuid,
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
