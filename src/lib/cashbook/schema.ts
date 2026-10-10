import { z } from "zod";

export const CASHBOOK_ENTRY_TYPES = ["debit", "credit"] as const;
export type CashbookEntryType = (typeof CASHBOOK_ENTRY_TYPES)[number];

export const cashbookEntryInputSchema = z.object({
  entry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
    .default(() => new Date().toISOString().slice(0, 10)),
  entry_type: z.enum(["debit", "credit"], {
    errorMap: () => ({ message: "Entry type must be either debit (inflow) or credit (outflow)" }),
  }),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  remarks: z.string().trim().min(1, "Remarks / notes are required"),
});

export type CashbookEntryInput = z.infer<typeof cashbookEntryInputSchema>;

export type CashbookEntryRow = {
  id: string;
  entry_date: string;
  entry_type: CashbookEntryType;
  amount: number;
  remarks: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Computed client-side running balance */
  running_balance?: number;
  debit?: number;
  credit?: number;
};
