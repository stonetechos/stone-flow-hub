import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const QUOTE_CATEGORIES = [
  "supply_only",
  "supply_and_installation",
  "installation_only",
  "material_and_labour",
] as const;
export type QuoteCategory = (typeof QUOTE_CATEGORIES)[number];
export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  supply_only: "Supply Only",
  supply_and_installation: "Supply + Installation",
  installation_only: "Installation Only",
  material_and_labour: "Material + Labour",
};
export const zQuoteCategory = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.enum(QUOTE_CATEGORIES).nullable().optional(),
);

export const quoteItemInputSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unit: zOptional(),
  unit_price: z.coerce.number().nonnegative(),
  tax_pct: z.coerce.number().min(0).max(100).default(0),
  fulfilment: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.enum(QUOTE_CATEGORIES).nullable().optional(),
  ),
});
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;

export const quoteCreateSchema = z
  .object({
    /** Either project_id (existing project-first flows: from a Project page,
     *  or converting an Enquiry that already has a project) or customer_id
     *  (new customer-first flow from the bare "New quote" button) must be
     *  given. When only customer_id is given, createQuote() auto-creates a
     *  lightweight Project behind the scenes so the rest of the Quote →
     *  Sales Order → Invoice chain, which still keys off project_id, keeps
     *  working unchanged. */
    project_id: zUuid.optional(),
    customer_id: zUuid.optional(),
    enquiry_id: z.string().uuid().nullable().optional(),
    category: zQuoteCategory,
    valid_until: zOptional(),
    notes: zOptional(),
    terms: zOptional(),
    items: z.array(quoteItemInputSchema).min(1, "Add at least one line item"),
    /** Estimate Studio calculator worksheet (walls, products, installation,
     *  discount) that produced these items, when the quote was created via
     *  the wall-cladding calculator. Stored as-is for later reload/PDF
     *  regeneration; loosely typed here since `EstimateWorksheet` (in
     *  quotes/estimateSchema.ts) is the source of truth for its shape. */
    wall_estimate: z.record(z.unknown()).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    // Kept on the `project_id` path (rather than customer_id, or a top-level
    // issue) deliberately: this schema is reused verbatim by the VIE
    // create_quotation action handler (src/lib/vie/actions/createQuotation.ts),
    // whose existing test suite asserts the itemized blocker for a missing
    // anchor names `project_id` specifically. Reusing that same path keeps
    // both the manual UI's customer-first flow and VIE's project-first flow
    // validated by one schema, per ADR-0001 (no parallel/duplicated
    // validation logic).
    if (!v.project_id && !v.customer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "project_id or customer_id is required — pick a customer or project",
        path: ["project_id"],
      });
    }
  });
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

export const convertQuoteSchema = z.object({
  quote_id: zUuid,
  due_date: zOptional(),
});
export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>;

export const quoteUpdateSchema = z.object({
  category: zQuoteCategory,
  valid_until: zOptional(),
  notes: zOptional(),
  terms: zOptional(),
});
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
