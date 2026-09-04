import { z } from "zod";

/**
 * Installation Agency Ledger — manual entries only (Task #48, per Rishi's
 * explicit "Manual entry only" answer). `entryType` is the UI-facing
 * choice; the api layer converts it to the underlying debit/credit
 * columns (see the migration's header comment for the convention).
 */
export const LEDGER_ENTRY_TYPES = ["charge", "payment"] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const installationLedgerEntryInputSchema = z.object({
  installation_agency_id: z.string().uuid(),
  entry_date: z.string().min(1, "Date is required"),
  entry_type: z.enum(LEDGER_ENTRY_TYPES),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().min(1, "Description is required").max(300),
  ref_no: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type InstallationLedgerEntryInput = z.infer<typeof installationLedgerEntryInputSchema>;
