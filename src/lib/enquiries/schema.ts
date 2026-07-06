import { z } from "zod";
import { zOptional, zRequired, zUuid, zEmail } from "@/lib/zod";

/**
 * New Enquiry: captured directly against a Customer (created inline if new).
 * A Project is NOT required at this stage — enquiries start as raw leads and
 * are later converted into projects via the "Convert to Project" action.
 */
export const enquiryCreateSchema = z
  .object({
    // Existing customer selection (preferred). When provided, customer_name/mobile
    // are ignored — no new customer is created.
    customer_id: z.string().uuid().nullable().optional(),

    // Inline-create fallback (used only when customer_id is null/absent).
    customer_name: z.string().trim().optional().default(""),
    mobile: z.string().trim().optional().default(""),
    email: zEmail,
    source: zRequired("Lead source"),
    requirement: zRequired("Requirement"),
    budget_inr: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().nonnegative().nullable().optional(),
    ),
    notes: zOptional(),

    // Advanced
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    required_delivery_date: zOptional(),
  })
  .superRefine((v, ctx) => {
    if (!v.customer_id) {
      if (!v.customer_name || v.customer_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_name"],
          message: "Customer name is required",
        });
      }
      const mobile = (v.mobile ?? "").replace(/\D/g, "");
      if (mobile.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mobile"],
          message: "Enter a valid mobile number",
        });
      }
    }
  });

export type EnquiryCreateInput = z.infer<typeof enquiryCreateSchema>;

/** Editing an existing enquiry — no customer changes here. */
export const enquiryUpdateSchema = z.object({
  source: zOptional(),
  requirement: zOptional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  budget_inr: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  required_delivery_date: zOptional(),
  notes: zOptional(),
});
export type EnquiryUpdateInput = z.infer<typeof enquiryUpdateSchema>;

/** Convert an enquiry to a project — asks for project-specific details only. */
export const convertToProjectSchema = z.object({
  name: zRequired("Project name"),
  site_address: zOptional(),
  city: zRequired("City"),
  state: zOptional(),
  architect_name: zOptional(),
  contractor_name: zOptional(),
  area_sqft: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  expected_completion_date: zOptional(),
});
export type ConvertToProjectInput = z.infer<typeof convertToProjectSchema>;

export const sendRfqSchema = z.object({
  enquiry_id: zUuid,
  vendor_ids: z.array(zUuid).min(1, "Select at least one vendor"),
  due_date: z.string().min(1, "Due date is required"),
  notes: zOptional(),
});

export type SendRfqInput = z.infer<typeof sendRfqSchema>;
