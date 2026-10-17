import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "./schema";

export type PaymentAccountCategory = "bob_current" | "upi_rishi" | "upi_raman" | "cash" | "other";

export interface PaymentMethodRowInput {
  method?: string | null;
  account_used?: string | null;
  bank_name?: string | null;
  notes?: string | null;
}

/**
 * Categorizes a customer payment / receipt into its underlying financial account:
 * - `bob_current`: Bank of Baroda corporate current account (via Bank Transfer, NEFT, RTGS, IMPS, or Stone Tech UPI)
 * - `upi_rishi`: Personal UPI account belonging to Rishi
 * - `upi_raman`: Personal UPI account belonging to Raman
 * - `cash`: Cash counter collection
 * - `other`: Unspecified personal UPI or other payment mode
 */
export function getPaymentAccountCategory(row: PaymentMethodRowInput): PaymentAccountCategory {
  const method = (row.method || "").toLowerCase().trim();
  const account = (row.account_used || "").toLowerCase().trim();
  const bank = (row.bank_name || "").toLowerCase().trim();
  const notes = (row.notes || "").toLowerCase().trim();

  // 1. Rishi check
  if (method === "upi_rishi" || account.includes("rishi") || notes.includes("rishi")) {
    return "upi_rishi";
  }

  // 2. Raman check
  if (method === "upi_raman" || account.includes("raman") || notes.includes("raman")) {
    return "upi_raman";
  }

  // 3. Cash check
  if (method === "cash" || account.includes("cash")) {
    return "cash";
  }

  // 4. BOB Current Account check
  // Matches upi_bob_current, upi_stone_tech, current_bob, bank_transfer, neft, rtgs, imps,
  // or account_used / bank_name / notes mentioning BOB or Bank of Baroda or Stone Tech
  if (
    method === "upi_bob_current" ||
    method === "upi_stone_tech" ||
    method === "current_bob" ||
    method === "bank_transfer" ||
    method === "neft" ||
    method === "rtgs" ||
    method === "imps" ||
    account.includes("bob") ||
    account.includes("bank of baroda") ||
    account.includes("stone tech") ||
    account.includes("current a/c") ||
    account.includes("current account") ||
    bank.includes("bob") ||
    bank.includes("baroda") ||
    notes.includes("bob") ||
    notes.includes("bank of baroda")
  ) {
    return "bob_current";
  }

  return "other";
}

/**
 * Returns human-readable label for the payment method badge in the table:
 * E.g. "UPI Personal - Rishi", "UPI Personal - Raman", "BOB Current (Bank Transfer)", "BOB Current (UPI)"
 */
export function formatPaymentMethodDisplay(row: PaymentMethodRowInput): string {
  const category = getPaymentAccountCategory(row);
  const method = (row.method || "").toLowerCase().trim();
  const account = (row.account_used || "").trim();

  if (category === "upi_rishi") {
    return "UPI Personal - Rishi";
  }
  if (category === "upi_raman") {
    return "UPI Personal - Raman";
  }
  if (category === "bob_current") {
    if (method === "upi_bob_current" || method === "upi_stone_tech") {
      return "BOB Current (UPI)";
    }
    if (
      method === "bank_transfer" ||
      method === "current_bob" ||
      method === "neft" ||
      method === "rtgs" ||
      method === "imps"
    ) {
      return "BOB Current (Bank Transfer)";
    }
    return "BOB Current Account";
  }
  if (category === "cash") {
    return "Cash";
  }
  if (method === "cheque") {
    return "Cheque";
  }
  if (method === "upi_personal") {
    return account ? `UPI Personal (${account})` : "UPI Personal";
  }
  if (account) {
    return account;
  }
  if (PAYMENT_METHOD_LABELS[method as PaymentMethod]) {
    return PAYMENT_METHOD_LABELS[method as PaymentMethod];
  }
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—";
}

/**
 * Returns consistent Tailwind badge classes matching account themes
 */
export function getPaymentMethodBadgeClass(category: PaymentAccountCategory): string {
  switch (category) {
    case "upi_rishi":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
    case "upi_raman":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
    case "bob_current":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    case "cash":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800";
  }
}
