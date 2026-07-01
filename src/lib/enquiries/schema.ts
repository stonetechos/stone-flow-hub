import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const enquiryCreateSchema = z.object({
  // Quick Fill — pick an existing project (customer is derived server-side)
  project_id: zUuid,

  // More Details
  source: zOptional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  budget_inr: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  required_delivery_date: zOptional(),

  // Advanced
  notes: zOptional(),
});

export type EnquiryCreateInput = z.infer<typeof enquiryCreateSchema>;

export const sendRfqSchema = z.object({
  enquiry_id: zUuid,
  vendor_ids: z.array(zUuid).min(1, "Select at least one vendor"),
  due_date: z.string().min(1, "Due date is required"),
  notes: zOptional(),
});

export type SendRfqInput = z.infer<typeof sendRfqSchema>;
