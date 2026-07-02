import { z } from "zod";
import { zOptional, zUuid } from "@/lib/zod";

export const quoteItemInputSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unit: zOptional(),
  unit_price: z.coerce.number().nonnegative(),
  tax_pct: z.coerce.number().min(0).max(100).default(0),
});
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;

export const quoteCreateSchema = z.object({
  project_id: zUuid,
  enquiry_id: z.string().uuid().nullable().optional(),
  valid_until: zOptional(),
  notes: zOptional(),
  terms: zOptional(),
  items: z.array(quoteItemInputSchema).min(1, "Add at least one line item"),
});
export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

export const convertQuoteSchema = z.object({
  quote_id: zUuid,
  due_date: zOptional(),
});
export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>;

export const quoteUpdateSchema = z.object({
  valid_until: zOptional(),
  notes: zOptional(),
  terms: zOptional(),
});
export type QuoteUpdateInput = z.infer<typeof quoteUpdateSchema>;
