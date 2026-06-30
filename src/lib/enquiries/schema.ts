import { z } from "zod";
import { zRequired, zOptional, zUuid } from "@/lib/zod";

export const enquiryCreateSchema = z.object({
  // Quick Fill
  project_id: zUuid,
  title: zRequired("Enquiry title"),

  // More Details
  source: z.enum(["walk_in", "phone", "email", "referral", "website", "exhibition", "other"]).default("phone"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  estimated_value: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  required_by: zOptional(),

  // Advanced
  description: zOptional(),
});

export type EnquiryCreateInput = z.infer<typeof enquiryCreateSchema>;

export const sendRfqSchema = z.object({
  enquiry_id: zUuid,
  vendor_ids: z.array(zUuid).min(1, "Select at least one vendor"),
  due_date: zRequired("Due date"),
  notes: zOptional(),
});

export type SendRfqInput = z.infer<typeof sendRfqSchema>;
