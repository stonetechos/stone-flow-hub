import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const ESTIMATE_TEMPLATE = z.enum([
  "material_supply",
  "material_install",
  "custom_articles",
  "custom_manufacturing",
]);

export const ESTIMATE_ITEM_CATEGORY = z.enum([
  "material",
  "manufacturing",
  "installation",
  "consumable",
  "other",
]);

export const COST_COMPONENT_KIND = z.enum([
  "adhesives",
  "chemicals",
  "sealer",
  "packing",
  "freight",
  "other",
]);

export const PAYMENT_SCHEDULE_KIND = z.enum(["75_25", "80_20", "custom"]);

export const estimateItemInputSchema = z.object({
  category: ESTIMATE_ITEM_CATEGORY.default("material"),
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unit: zOptional(),
  unit_price: z.coerce.number().nonnegative(),
  tax_pct: z.coerce.number().min(0).max(100).default(0),
});
export type EstimateItemInput = z.infer<typeof estimateItemInputSchema>;

export const estimateComponentInputSchema = z.object({
  kind: COST_COMPONENT_KIND,
  label: zOptional(),
  quantity: z.coerce.number().nonnegative().default(1),
  unit: zOptional(),
  unit_price: z.coerce.number().nonnegative().default(0),
});
export type EstimateComponentInput = z.infer<typeof estimateComponentInputSchema>;

export const paymentScheduleRowSchema = z.object({
  label: z.string().trim().min(1),
  pct: z.coerce.number().min(0).max(100),
  due_offset_days: z.coerce.number().int().min(0).default(0),
});
export type PaymentScheduleRow = z.infer<typeof paymentScheduleRowSchema>;

export const estimateCreateSchema = z.object({
  template: ESTIMATE_TEMPLATE,
  project_id: zUuid,
  enquiry_id: z.string().uuid().nullable().optional(),
  source_quote_id: z.string().uuid().nullable().optional(),
  valid_until: zOptional(),
  notes: zOptional(),
  terms: zOptional(),
  margin_pct: z.coerce.number().min(0).max(100).default(0),
  gst_pct: z.coerce.number().min(0).max(100).default(18),
  payment_schedule_kind: PAYMENT_SCHEDULE_KIND.default("custom"),
  items: z.array(estimateItemInputSchema).min(1, "Add at least one line item"),
  components: z.array(estimateComponentInputSchema).default([]),
  schedule: z
    .array(paymentScheduleRowSchema)
    .min(1, "Add at least one payment schedule row")
    .refine(
      (rows) => Math.abs(rows.reduce((a, b) => a + b.pct, 0) - 100) < 0.01,
      "Payment schedule rows must total 100%",
    ),
});
export type EstimateCreateInput = z.infer<typeof estimateCreateSchema>;

export const estimateUpdateSchema = estimateCreateSchema.omit({ template: true, project_id: true });
export type EstimateUpdateInput = z.infer<typeof estimateUpdateSchema>;

export const generateDocumentSchema = z.object({
  estimate_id: zUuid,
  kind: z.enum(["customer_pdf", "cost_sheet_pdf", "whatsapp_text", "email_html"]),
  subject: zOptional(),
  body_text: zOptional(),
  body_html: zOptional(),
});
export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
