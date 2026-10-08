import { z } from "zod";

/**
 * Liabilities — business debts/recurring obligations Rishi wants tracked
 * and grouped "like Xth day of every month". See the migration
 * (20260904170000_liabilities_business_expenses.sql) for the table shape.
 */
export const liabilityInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  // null/undefined = no fixed monthly date ("one-time" section in the UI).
  due_day_of_month: z.coerce.number().int().min(1).max(31).nullable().optional(),
  is_recurring: z.boolean().default(true),
  is_active: z.boolean().default(true),
  notes: z.string().max(2000).nullable().optional(),
  sort_order: z.coerce.number().int().default(100),
});

export type LiabilityInput = z.infer<typeof liabilityInputSchema>;

export const liabilityPaymentInputSchema = z.object({
  liability_id: z.string().uuid("Please select a liability"),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero"),
  payment_mode: z.string().default("Bank Transfer"),
  reference_no: z.string().max(200).nullable().optional(),
  month_for: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type LiabilityPaymentInput = z.infer<typeof liabilityPaymentInputSchema>;
