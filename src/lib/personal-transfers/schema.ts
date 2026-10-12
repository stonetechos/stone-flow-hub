import { z } from "zod";

export type AccountOwner = "rishi" | "raman" | "company" | "other";

export interface TransferAccountDef {
  id: string;
  label: string;
  shortLabel: string;
  owner: AccountOwner;
  type: "bank" | "upi" | "current" | "cash" | "other";
  iconName: string;
}

export const TRANSFER_ACCOUNTS: readonly TransferAccountDef[] = [
  {
    id: "rishi_bank",
    label: "Rishi Rai — Personal Bank A/c",
    shortLabel: "Rishi Bank",
    owner: "rishi",
    type: "bank",
    iconName: "Landmark",
  },
  {
    id: "rishi_upi",
    label: "Rishi Rai — UPI",
    shortLabel: "Rishi UPI",
    owner: "rishi",
    type: "upi",
    iconName: "Smartphone",
  },
  {
    id: "raman_bank",
    label: "Raman Pupneja — Personal Bank A/c",
    shortLabel: "Raman Bank",
    owner: "raman",
    type: "bank",
    iconName: "Landmark",
  },
  {
    id: "raman_upi",
    label: "Raman Pupneja — UPI",
    shortLabel: "Raman UPI",
    owner: "raman",
    type: "upi",
    iconName: "Smartphone",
  },
  {
    id: "stone_tech_current",
    label: "Stone Tech Operations — BOB Current A/c",
    shortLabel: "Stone Tech Current (BOB)",
    owner: "company",
    type: "current",
    iconName: "Building2",
  },
  {
    id: "stone_tech_upi",
    label: "Stone Tech Operations — BOB UPI Current A/c",
    shortLabel: "Stone Tech UPI (BOB)",
    owner: "company",
    type: "upi",
    iconName: "Smartphone",
  },
  {
    id: "petty_cash",
    label: "Stone Tech Operations — Cash Drawer",
    shortLabel: "Cash Drawer",
    owner: "company",
    type: "cash",
    iconName: "Coins",
  },
  {
    id: "other",
    label: "Other / External Account",
    shortLabel: "Other Account",
    owner: "other",
    type: "other",
    iconName: "Wallet",
  },
] as const;

export const TRANSFER_CATEGORIES = [
  {
    id: "customer_receipt_diversion",
    label: "Customer Payment Received / Diverted",
    description: "Payment from client credited to personal account or redirected",
  },
  {
    id: "partner_settlement",
    label: "Partner Transfer (Rishi ↔ Raman)",
    description: "Funds transferred between Rishi Rai and Raman Pupneja",
  },
  {
    id: "drawings",
    label: "Drawings / Personal Withdrawal",
    description: "Transfer from company current account to personal account/UPI",
  },
  {
    id: "capital_infusion",
    label: "Capital Infusion (Personal → Company)",
    description: "Personal funds deposited into Stone Tech Current Account",
  },
  {
    id: "expense_reimbursement",
    label: "Business Expense Reimbursement",
    description: "Repayment of operational expenses paid personally",
  },
  {
    id: "self_transfer",
    label: "Self Account Transfer",
    description: "Transfer between own personal bank and UPI",
  },
  {
    id: "other",
    label: "Other Internal Transfer",
    description: "General internal or miscellaneous movement",
  },
] as const;

export type TransferCategoryKey = (typeof TRANSFER_CATEGORIES)[number]["id"];

export const personalTransferInputSchema = z
  .object({
    transfer_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
      .default(() => new Date().toISOString().slice(0, 10)),
    from_account: z.string().min(1, "Sender account is required"),
    from_account_custom: z.string().trim().optional(),
    to_account: z.string().min(1, "Receiver account is required"),
    to_account_custom: z.string().trim().optional(),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    category: z.string().default("other"),
    reference_no: z.string().trim().optional(),
    remarks: z.string().trim().min(1, "Remarks / description is required"),
    receipt_url: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.from_account === "other" && !data.from_account_custom) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify the custom sender account name",
      path: ["from_account_custom"],
    },
  )
  .refine(
    (data) => {
      if (data.to_account === "other" && !data.to_account_custom) {
        return false;
      }
      return true;
    },
    {
      message: "Please specify the custom receiver account name",
      path: ["to_account_custom"],
    },
  )
  .refine(
    (data) => {
      // Must not be identical standard accounts
      if (data.from_account !== "other" && data.from_account === data.to_account) {
        return false;
      }
      return true;
    },
    {
      message: "From and To accounts cannot be identical",
      path: ["to_account"],
    },
  );

export type PersonalTransferInput = z.infer<typeof personalTransferInputSchema>;

export interface PersonalTransferRow {
  id: string;
  transfer_date: string;
  from_account: string;
  from_account_custom?: string | null;
  to_account: string;
  to_account_custom?: string | null;
  amount: number;
  category: string;
  reference_no?: string | null;
  remarks: string;
  receipt_url?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedTransferLedgerRow extends PersonalTransferRow {
  fromAccountDef?: TransferAccountDef;
  toAccountDef?: TransferAccountDef;
  fromDisplay: string;
  toDisplay: string;
  categoryDisplay: string;
  debit: number; // Outflow for current scoped ledger
  credit: number; // Inflow for current scoped ledger
  runningBalance: number;
}

export type LedgerPerspective = "all" | "rishi" | "raman" | "company";

export function getAccountDef(id: string): TransferAccountDef | undefined {
  return TRANSFER_ACCOUNTS.find((a) => a.id === id);
}

export function getAccountDisplayName(id: string, customName?: string | null): string {
  if (id === "other" && customName?.trim()) {
    return customName.trim();
  }
  const found = getAccountDef(id);
  return found ? found.label : id;
}

export function getAccountShortName(id: string, customName?: string | null): string {
  if (id === "other" && customName?.trim()) {
    return customName.trim();
  }
  const found = getAccountDef(id);
  return found ? found.shortLabel : id;
}

export function getCategoryDisplayName(catId: string): string {
  const found = TRANSFER_CATEGORIES.find((c) => c.id === catId);
  return found ? found.label : catId;
}

/**
 * Computes running ledgers for a given perspective:
 * - 'all': displays all transfers with absolute values
 * - 'rishi': credits (inflows to Rishi), debits (outflows from Rishi), running net position
 * - 'raman': credits (inflows to Raman), debits (outflows from Raman), running net position
 * - 'company': credits (inflows to Stone Tech), debits (outflows from Stone Tech)
 */
export function computeScopedLedger(
  transfers: PersonalTransferRow[],
  perspective: LedgerPerspective,
): {
  rows: EnrichedTransferLedgerRow[];
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  transferCount: number;
} {
  // Sort chronologically ascending for accurate running balance calculation
  const sorted = [...transfers].sort((a, b) => {
    const cmp = a.transfer_date.localeCompare(b.transfer_date);
    if (cmp !== 0) return cmp;
    return a.created_at.localeCompare(b.created_at);
  });

  const isMatchingOwner = (accId: string, owner: AccountOwner) => {
    const def = getAccountDef(accId);
    return def ? def.owner === owner : false;
  };

  let totalInflow = 0;
  let totalOutflow = 0;
  let running = 0;

  const rows: EnrichedTransferLedgerRow[] = [];

  for (const t of sorted) {
    const fromDef = getAccountDef(t.from_account);
    const toDef = getAccountDef(t.to_account);
    const amount = Number(t.amount || 0);

    let credit = 0; // Inflow to the scoped entity
    let debit = 0; // Outflow from the scoped entity

    if (perspective === "rishi") {
      const isFromRishi = isMatchingOwner(t.from_account, "rishi");
      const isToRishi = isMatchingOwner(t.to_account, "rishi");

      if (!isFromRishi && !isToRishi) {
        continue; // Doesn't affect Rishi's ledger
      }

      if (isToRishi && !isFromRishi) {
        credit = amount;
      } else if (isFromRishi && !isToRishi) {
        debit = amount;
      } else {
        // Internal transfer between Rishi Bank and Rishi UPI (0 net effect)
        credit = 0;
        debit = 0;
      }
    } else if (perspective === "raman") {
      const isFromRaman = isMatchingOwner(t.from_account, "raman");
      const isToRaman = isMatchingOwner(t.to_account, "raman");

      if (!isFromRaman && !isToRaman) {
        continue; // Doesn't affect Raman's ledger
      }

      if (isToRaman && !isFromRaman) {
        credit = amount;
      } else if (isFromRaman && !isToRaman) {
        debit = amount;
      } else {
        // Internal transfer between Raman Bank and Raman UPI (0 net effect)
        credit = 0;
        debit = 0;
      }
    } else if (perspective === "company") {
      const isFromCompany = isMatchingOwner(t.from_account, "company");
      const isToCompany = isMatchingOwner(t.to_account, "company");

      if (!isFromCompany && !isToCompany) {
        continue;
      }

      if (isToCompany && !isFromCompany) {
        credit = amount;
      } else if (isFromCompany && !isToCompany) {
        debit = amount;
      } else {
        // Internal between Stone Tech BOB and Cash Drawer / UPI
        credit = 0;
        debit = 0;
      }
    } else {
      // Perspective === 'all'
      // By convention, show credit = amount, debit = 0
      credit = amount;
      debit = 0;
    }

    totalInflow += credit;
    totalOutflow += debit;
    running += credit - debit;

    rows.push({
      ...t,
      fromAccountDef: fromDef,
      toAccountDef: toDef,
      fromDisplay: getAccountDisplayName(t.from_account, t.from_account_custom),
      toDisplay: getAccountDisplayName(t.to_account, t.to_account_custom),
      categoryDisplay: getCategoryDisplayName(t.category),
      credit,
      debit,
      runningBalance: running,
    });
  }

  // Reverse back to descending order (newest first) for UI display
  const displayRows = [...rows].reverse();

  return {
    rows: displayRows,
    totalInflow,
    totalOutflow,
    netBalance: running,
    transferCount: rows.length,
  };
}
