/**
 * Comprehensive Multi-Party Accounting Statement Engine.
 *
 * Generates an end-to-end, real-time itemized accounting statement
 * for Customers, Vendors, or Agencies up to the exact moment of sending.
 *
 * Formats:
 *  - WhatsApp real-time markdown message (rich, bulletproof on mobile/desktop)
 *  - Clipboard plain text
 *  - Printable HTML / PDF view
 */
import { formatInr, formatDate } from "@/lib/format";
import { normalizeWhatsappPhone, openWhatsappToContact } from "@/lib/whatsapp";

export type StatementPartyType = "customer" | "vendor" | "agency";

export interface StatementPartyInfo {
  partyType: StatementPartyType;
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  city?: string | null;
}

export interface StatementTransactionRow {
  date: string;
  type: string;
  refNo: string;
  debit: number;
  credit: number;
  runningBalance: number;
  description?: string | null;
  status?: string | null;
}

export interface AccountingStatementData {
  party: StatementPartyInfo;
  asOfTimestamp: string; // e.g. "18 Oct 2026, 04:30 PM"
  totalDebit: number;
  totalCredit: number;
  balance: number; // positive = party owes Stone Tech (or we owe vendor/agency)
  unallocatedAdvance?: number;
  writeOffTotal?: number;
  transactions: StatementTransactionRow[];
}

/**
 * Returns formatted current timestamp: e.g. "18/10/2026, 03:45 PM"
 */
export function getCurrentStatementTimestamp(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Builds the complete itemized WhatsApp Accounting Statement message.
 */
export function buildWhatsappAccountingStatement(data: AccountingStatementData): string {
  const { party, asOfTimestamp, totalDebit, totalCredit, balance, writeOffTotal, transactions } =
    data;

  const isCustomer = party.partyType === "customer";
  const isVendor = party.partyType === "vendor";
  const isAgency = party.partyType === "agency";

  const title = isCustomer
    ? "CUSTOMER STATEMENT OF ACCOUNT"
    : isVendor
      ? "VENDOR ACCOUNT STATEMENT"
      : "AGENCY ACCOUNT STATEMENT";

  const lines: string[] = [];

  // Header Banner
  lines.push("════════════════════════════");
  lines.push(`       🏛️ *STONE TECH*`);
  lines.push(`   *${title}*`);
  lines.push("════════════════════════════");
  lines.push("");

  // Party Details
  const partyLabel = isCustomer
    ? "Customer"
    : isVendor
      ? "Vendor / Supplier"
      : "Agency / Contractor";
  lines.push(`👤 *${partyLabel}:* ${party.name}${party.code ? ` (${party.code})` : ""}`);
  if (party.companyName && party.companyName !== party.name) {
    lines.push(`🏢 *Firm:* ${party.companyName}`);
  }
  if (party.contactPerson) {
    lines.push(`🤝 *Contact Person:* ${party.contactPerson}`);
  }
  const contactPhone = party.whatsapp || party.phone;
  if (contactPhone) {
    lines.push(`📞 *Phone:* ${contactPhone}`);
  }
  if (party.city) {
    lines.push(`📍 *Location:* ${party.city}`);
  }

  lines.push(`🗓️ *Statement As Of:* ${asOfTimestamp}`);
  lines.push(`⏱️ *Ledger Scope:* Complete Real-Time Account Record`);
  lines.push("");

  // Executive Financial Summary
  lines.push("────────────────────────────");
  lines.push("📊 *EXECUTIVE FINANCIAL SUMMARY*");
  lines.push("────────────────────────────");

  if (isCustomer) {
    lines.push(`• Total Invoiced / Debits: *${formatInr(totalDebit)}*`);
    lines.push(`• Total Received / Credits: *${formatInr(totalCredit)}*`);
    if (writeOffTotal && writeOffTotal > 0) {
      lines.push(`• Total Concessions & Write-Offs: *${formatInr(writeOffTotal)}*`);
    }
    if (data.unallocatedAdvance && data.unallocatedAdvance > 0) {
      lines.push(`• Unallocated Advance On-Hand: *${formatInr(data.unallocatedAdvance)}*`);
    }
    lines.push("────────────────────────────");
    if (balance > 0) {
      lines.push(`👉 *NET OUTSTANDING BALANCE DUE: ${formatInr(balance)}*`);
    } else if (balance < 0) {
      lines.push(`👉 *NET CREDIT BALANCE (ADVANCE): ${formatInr(Math.abs(balance))}*`);
    } else {
      lines.push(`👉 *BALANCE: NIL (ALL DUES FULLY CLEARED)*`);
    }
  } else if (isVendor) {
    lines.push(`• Total Material & Bills (Debit): *${formatInr(totalDebit)}*`);
    lines.push(`• Total Paid to Vendor (Credit): *${formatInr(totalCredit)}*`);
    lines.push("────────────────────────────");
    if (balance > 0) {
      lines.push(`👉 *NET PAYABLE DUE TO VENDOR: ${formatInr(balance)}*`);
    } else if (balance < 0) {
      lines.push(`👉 *VENDOR ADVANCE / CREDIT BALANCE: ${formatInr(Math.abs(balance))}*`);
    } else {
      lines.push(`👉 *NET BALANCE: NIL (ACCOUNT FULLY SETTLED)*`);
    }
  } else {
    lines.push(`• Total Work Charged (Debit): *${formatInr(totalDebit)}*`);
    lines.push(`• Total Paid to Agency (Credit): *${formatInr(totalCredit)}*`);
    lines.push("────────────────────────────");
    if (balance > 0) {
      lines.push(`👉 *AGENCY BALANCE DUE: ${formatInr(balance)}*`);
    } else if (balance < 0) {
      lines.push(`👉 *AGENCY ADVANCE: ${formatInr(Math.abs(balance))}*`);
    } else {
      lines.push(`👉 *NET BALANCE: NIL (ALL DUES SETTLED)*`);
    }
  }
  lines.push("────────────────────────────");
  lines.push("");

  // Detailed Transactions Record
  lines.push(`📋 *ITEMIZED TRANSACTION RECORD (${transactions.length} entries)*`);
  lines.push("────────────────────────────");

  if (transactions.length === 0) {
    lines.push("No transactions posted to this ledger to date.");
  } else {
    transactions.forEach((tx, idx) => {
      const num = idx + 1;
      const formattedDate = formatDate(tx.date);
      lines.push(`${num}. ${formattedDate} · *${tx.type}*`);
      lines.push(`   Ref: \`${tx.refNo}\``);
      if (tx.description) {
        lines.push(`   Note: ${tx.description}`);
      }

      const debitStr = tx.debit > 0 ? formatInr(tx.debit) : "—";
      const creditStr = tx.credit > 0 ? formatInr(tx.credit) : "—";
      lines.push(`   Debit: ${debitStr} | Credit: ${creditStr}`);
      lines.push(`   Balance: *${formatInr(tx.runningBalance)}*`);
      lines.push("");
    });
  }

  // Payment / Remittance Coordinates for Customers
  if (isCustomer && balance > 0) {
    lines.push("🏦 *STONE TECH BANKING & PAYMENT DETAILS:*");
    lines.push("• Beneficiary: *Stone Tech*");
    lines.push("• Bank: *Bank of Baroda (BOB)*");
    lines.push("• Account Type: *Current Account*");
    lines.push("• UPI Options: *BOB Current A/c* | *Personal UPI (Rishi/Raman)*");
    lines.push("");
  }

  // Verification & Audit Sign-Off
  lines.push("────────────────────────────");
  lines.push("ℹ️ *Statement Verification:*");
  lines.push(
    "This is an official automated accounting statement generated from Stone Tech OS up till the moment of transmission. Kindly verify every transaction against your records.",
  );
  lines.push("For accounts reconciliation or queries, please reach Stone Tech Accounts.");
  lines.push("");
  lines.push("Warm regards,");
  lines.push("*Stone Tech Operations & Accounts*");

  return lines.join("\n");
}

/**
 * Dispatches the complete accounting statement directly to the contact's WhatsApp.
 */
export function sendAccountingStatementWhatsapp(
  data: AccountingStatementData,
  recipientPhone?: string | null,
): boolean {
  const phone = recipientPhone || data.party.whatsapp || data.party.phone;
  const text = buildWhatsappAccountingStatement(data);
  return openWhatsappToContact(phone || "", text);
}
