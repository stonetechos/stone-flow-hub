import { z } from "zod";

/**
 * Business Expenses — day-to-day petty-cash entries Rishi described:
 * "stationary, tea, maid, donation, these kind of entries will be done and
 * in the next box the amount has to be entered." Date defaults to today in
 * the UI but stays freely editable (backdating a few days is explicitly
 * allowed per his message).
 */
export const businessExpenseInputSchema = z.object({
  expense_date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required").max(300),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  notes: z.string().max(2000).nullable().optional(),
});

export type BusinessExpenseInput = z.infer<typeof businessExpenseInputSchema>;
