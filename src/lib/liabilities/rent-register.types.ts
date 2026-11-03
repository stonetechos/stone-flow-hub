import { z } from "zod";

export interface OfficeRentSettings {
  propertyName: string;
  propertyAddress: string;
  landlordName: string;
  landlordPhone?: string;
  monthlyRent: number;
  dueDayOfMonth: number; // e.g. 5 (5th of every month)
  payableInAdvance: boolean; // default true: rent for month M is due on or before 5th of month M
  startMonth: string; // "2025-02" (Feb 2025 baseline, rent starts tracking from Mar 2025)
  endMonth?: string; // "2026-11" (Nov 2026, or any user chosen projection horizon)
  notes?: string;
}

/**
 * Universal Tenancy Ledger Entry ("Diary Mode")
 * Tracks every single debit and credit transaction between tenant and landlord.
 *
 * - debits (charges):
 *   - rent_charge: Monthly contract rent accrued
 *   - maintenance_charge: Society maintenance / AMC / Electricity bill
 *   - material_sale_to_landlord: Material / stone bought by landlord from Stone Tech (landlord owes us)
 *   - deposit_renewal_cheque: New deposit renewal cheque handed over to landlord
 *   - other_debit: Custom charge or adjustment
 *
 * - credits (payments & recoveries):
 *   - rent_payment_bank: Lumpsum or exact rent paid via Bank / RTGS / NEFT / IMPS
 *   - rent_payment_cash: Cash payment handed over for rent
 *   - rent_payment_cheque: Cheque issued for rent
 *   - deposit_refund_received: Cash / Bank refund returned back by landlord
 *   - landlord_payment_for_material: Cash or bank transfer received from landlord for stone material
 *   - other_credit: Any other credit or settlement
 */
export type TenancyEntryCategory =
  | "rent_charge"
  | "rent_payment_bank"
  | "rent_payment_cash"
  | "rent_payment_cheque"
  | "deposit_renewal_cheque"
  | "deposit_refund_received"
  | "material_sale_to_landlord"
  | "landlord_payment_for_material"
  | "maintenance_charge"
  | "maintenance_payment"
  | "other_debit"
  | "other_credit";

export interface TenancyLedgerEntry {
  id: string;
  date: string; // YYYY-MM-DD
  category: TenancyEntryCategory;
  direction: "we_paid_or_charged" | "landlord_paid_or_refunded";
  // Mathematical impact on final balance:
  // "payable_increase": adds to what we owe (e.g. rent charge, maintenance bill, or deposit refund received)
  // "payable_decrease": reduces what we owe (e.g. our rent payment, lumpsum, material supplied to him, renewal cheque given)
  impact: "we_owe_more" | "we_owe_less";
  amount: number;
  paymentMode:
    | "Bank Transfer (NEFT/RTGS/IMPS)"
    | "Cheque"
    | "Cash"
    | "UPI"
    | "Contra / Adjusted"
    | "Bill Accrual"
    | "Other";
  referenceNo?: string; // Cheque No, UTR, Voucher No
  bankName?: string;
  description: string; // Diary notes: "Lumpsum payment", "He bought sandstone tiles", "Returned 40k deposit in cash"
  monthTag?: string; // Optional YYYY-MM tag if related to a specific rent month
  createdAt: string;
}

export interface SecurityDepositLedger {
  oldDepositAmount: number; // Previous deposit held by landlord
  newDepositAmount: number; // New renewal deposit amount requested
  newDepositChequeNo?: string;
  newDepositChequeDate?: string;
  newDepositPaidAmount: number; // Cheque given for renewal
  oldDepositRefundReceived: number; // Partial refund returned back by landlord
  notes?: string;
  offsetAgainstRent: boolean;
}

export interface MaintenanceAmcRecord {
  id: string;
  type: "Society Maintenance" | "AMC" | "Electricity / Utility" | "Property Tax" | "Other";
  title: string;
  periodLabel: string; // e.g. "Q1 2025-26", "April 2025"
  billDate?: string;
  dueDate?: string;
  amount: number;
  paidAmount: number;
  isPaid: boolean;
  notes?: string;
  createdAt: string;
}

export interface OfficeRentRegisterData {
  settings: OfficeRentSettings;
  entries: TenancyLedgerEntry[]; // The complete running diary
  // Backwards compatibility stores (automatically projected into diary)
  payments?: {
    id: string;
    paymentDate: string;
    monthFor: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string;
    chequeDate?: string;
    bankName?: string;
    notes?: string;
    createdAt: string;
  }[];
  deposit: SecurityDepositLedger;
  maintenance: MaintenanceAmcRecord[];
  updatedAt: string;
}

export const TenancyLedgerEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.enum([
    "rent_charge",
    "rent_payment_bank",
    "rent_payment_cash",
    "rent_payment_cheque",
    "deposit_renewal_cheque",
    "deposit_refund_received",
    "material_sale_to_landlord",
    "landlord_payment_for_material",
    "maintenance_charge",
    "maintenance_payment",
    "other_debit",
    "other_credit",
  ]),
  direction: z.enum(["we_paid_or_charged", "landlord_paid_or_refunded"]),
  impact: z.enum(["we_owe_more", "we_owe_less"]),
  amount: z.number(),
  paymentMode: z.enum([
    "Bank Transfer (NEFT/RTGS/IMPS)",
    "Cheque",
    "Cash",
    "UPI",
    "Contra / Adjusted",
    "Bill Accrual",
    "Other",
  ]),
  referenceNo: z.string().optional(),
  bankName: z.string().optional(),
  description: z.string(),
  monthTag: z.string().optional(),
  createdAt: z.string(),
});

export const RentRegisterDataSchema = z.object({
  settings: z.object({
    propertyName: z.string(),
    propertyAddress: z.string(),
    landlordName: z.string(),
    landlordPhone: z.string().optional(),
    monthlyRent: z.number(),
    dueDayOfMonth: z.number(),
    payableInAdvance: z.boolean(),
    startMonth: z.string(),
    endMonth: z.string().optional(),
    notes: z.string().optional(),
  }),
  entries: z.array(TenancyLedgerEntrySchema).optional().default([]),
  payments: z.array(z.any()).optional().default([]),
  deposit: z.object({
    oldDepositAmount: z.number(),
    newDepositAmount: z.number(),
    newDepositChequeNo: z.string().optional(),
    newDepositChequeDate: z.string().optional(),
    newDepositPaidAmount: z.number(),
    oldDepositRefundReceived: z.number(),
    notes: z.string().optional(),
    offsetAgainstRent: z.boolean(),
  }),
  maintenance: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        "Society Maintenance",
        "AMC",
        "Electricity / Utility",
        "Property Tax",
        "Other",
      ]),
      title: z.string(),
      periodLabel: z.string(),
      billDate: z.string().optional(),
      dueDate: z.string().optional(),
      amount: z.number(),
      paidAmount: z.number(),
      isPaid: z.boolean(),
      notes: z.string().optional(),
      createdAt: z.string(),
    }),
  ),
  updatedAt: z.string(),
});

export const DEFAULT_OFFICE_RENT_REGISTER: OfficeRentRegisterData = {
  settings: {
    propertyName: "Stone Tech Atelier & Office (SG Business Hub)",
    propertyAddress: "Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
    landlordName: "Office Landlord",
    landlordPhone: "",
    monthlyRent: 35000,
    dueDayOfMonth: 5,
    payableInAdvance: true,
    startMonth: "2025-02", // Feb 2025 baseline fully paid
    endMonth: "2026-11", // November 2026 horizon
    notes:
      "Rent cleared in full up to February 2025. Accounting running from March 2025 to November 2026.",
  },
  entries: [],
  payments: [],
  deposit: {
    oldDepositAmount: 0,
    newDepositAmount: 0,
    newDepositChequeNo: "",
    newDepositPaidAmount: 0,
    oldDepositRefundReceived: 0,
    offsetAgainstRent: true,
    notes: "Landlord took cheque for renewal deposit and returned old deposit only partially.",
  },
  maintenance: [],
  updatedAt: new Date().toISOString(),
};

/**
 * Generates an array of YYYY-MM strings starting from startMonth up to target endMonth
 */
export function generateMonthList(startMonth: string, endMonth: string): string[] {
  const [startYear, startM] = startMonth.split("-").map(Number);
  const [endYear, endM] = endMonth.split("-").map(Number);

  const result: string[] = [];
  let y = startYear;
  let m = startM;

  while (y < endYear || (y === endYear && m <= endM)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return result;
}

export interface ComputedDiaryRow {
  entry: TenancyLedgerEntry;
  runningBalance: number; // Positive = we owe landlord, Negative = landlord owes us
}

export interface DiaryAccountingSummary {
  // Rent figures
  totalRentContractMonths: number; // e.g. 21 months (Mar 2025 to Nov 2026)
  monthlyRentRate: number;
  totalRentContractAmount: number; // e.g. 21 × 35,000 = 735,000
  totalRentPaidByUs: number; // all lumpsums, bank, cash, cheque paid towards rent
  rentBalanceDue: number; // totalRentContractAmount - totalRentPaidByUs

  // Deposit Shortfall
  oldDepositAmount: number;
  depositRefundReceived: number;
  depositShortfallOwedByLandlord: number; // oldDeposit - refundReceived
  renewalChequeGiven: number;

  // Material Transactions with Landlord
  totalMaterialSoldToLandlord: number;
  totalLandlordPaidForMaterial: number;
  netMaterialOwedByLandlord: number; // materialSold - materialPaid (reduces our payable)

  // Maintenance & AMC
  totalMaintenanceBilled: number;
  totalMaintenancePaid: number;
  unpaidMaintenanceBalance: number;

  // Other adjustments
  otherDebitsTotal: number;
  otherCreditsTotal: number;

  // Final Net Payable to Landlord
  grossPayable: number;
  totalOffsetsAndCredits: number;
  finalOptimumNetPayable: number; // The exact cheque/cash amount to settle everything
}

/**
 * Calculates complete Tenancy Diary, running balance, and Master Inbuilt Calculator
 */
export function computeDiaryAndReconciliation(
  data: OfficeRentRegisterData,
  asOfDate: Date = new Date(),
): {
  months: string[];
  diaryRows: ComputedDiaryRow[];
  summary: DiaryAccountingSummary;
} {
  const { settings, deposit, maintenance } = data;
  const startMonth = settings.startMonth || "2025-02";
  const endMonth = settings.endMonth || "2026-11";

  // List all months from startMonth up to endMonth
  const months = generateMonthList(startMonth, endMonth);
  // Chargeable months: excludes baseline month (Feb 2025 was already cleared)
  const contractMonths = months.filter((m) => m !== startMonth);
  const totalRentContractMonths = contractMonths.length;
  const monthlyRentRate = Number(settings.monthlyRent || 0);
  const totalRentContractAmount = totalRentContractMonths * monthlyRentRate;

  // Assemble full list of transactions:
  // 1. Existing user-entered diary entries
  const allEntries: TenancyLedgerEntry[] = [...(data.entries || [])];

  // 2. If legacy payments exist, merge them seamlessly
  if (Array.isArray(data.payments) && data.payments.length > 0) {
    const existingIds = new Set(allEntries.map((e) => e.id));
    for (const p of data.payments) {
      if (!existingIds.has(p.id)) {
        allEntries.push({
          id: p.id,
          date: p.paymentDate,
          category:
            p.paymentMode === "Cash"
              ? "rent_payment_cash"
              : p.paymentMode === "Cheque"
                ? "rent_payment_cheque"
                : "rent_payment_bank",
          direction: "we_paid_or_charged",
          impact: "we_owe_less",
          amount: Number(p.amount || 0),
          paymentMode:
            (p.paymentMode as TenancyLedgerEntry["paymentMode"]) ||
            "Bank Transfer (NEFT/RTGS/IMPS)",
          referenceNo: p.referenceNo,
          bankName: p.bankName,
          description: p.notes || `Rent payment for ${p.monthFor}`,
          monthTag: p.monthFor,
          createdAt: p.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  // Sort entries chronologically by date
  allEntries.sort((a, b) => a.date.localeCompare(b.date));

  // Compute breakdown totals
  let totalRentPaidByUs = 0;
  let totalMaterialSoldToLandlord = 0;
  let totalLandlordPaidForMaterial = 0;
  let totalDepositRefundReceived = Number(deposit.oldDepositRefundReceived || 0);
  let otherDebitsTotal = 0;
  let otherCreditsTotal = 0;

  for (const e of allEntries) {
    const amt = Number(e.amount || 0);
    switch (e.category) {
      case "rent_payment_bank":
      case "rent_payment_cash":
      case "rent_payment_cheque":
        totalRentPaidByUs += amt;
        break;
      case "material_sale_to_landlord":
        totalMaterialSoldToLandlord += amt;
        break;
      case "landlord_payment_for_material":
        totalLandlordPaidForMaterial += amt;
        break;
      case "deposit_refund_received":
        totalDepositRefundReceived += amt;
        break;
      case "other_debit":
        otherDebitsTotal += amt;
        break;
      case "other_credit":
        otherCreditsTotal += amt;
        break;
    }
  }

  // Maintenance & AMC calculations
  let totalMaintenanceBilled = 0;
  let totalMaintenancePaid = 0;
  for (const m of maintenance || []) {
    totalMaintenanceBilled += Number(m.amount || 0);
    totalMaintenancePaid += m.isPaid ? Number(m.amount || 0) : Number(m.paidAmount || 0);
  }
  const unpaidMaintenanceBalance = Math.max(0, totalMaintenanceBilled - totalMaintenancePaid);

  // Deposit calculations
  const oldDepositAmount = Number(deposit.oldDepositAmount || 0);
  const depositShortfallOwedByLandlord = Math.max(0, oldDepositAmount - totalDepositRefundReceived);
  const renewalChequeGiven = Number(deposit.newDepositPaidAmount || 0);

  // Material net owed by landlord
  const netMaterialOwedByLandlord = Math.max(
    0,
    totalMaterialSoldToLandlord - totalLandlordPaidForMaterial,
  );

  // Rent Balance Due
  const rentBalanceDue = Math.max(0, totalRentContractAmount - totalRentPaidByUs);

  // Gross Payable (Total obligations: Rent Contract Amount + Maintenance + Any extra debits)
  const grossPayable = totalRentContractAmount + unpaidMaintenanceBalance + otherDebitsTotal;

  // Offsets (Payments made + Deposit shortfall owed to us + Material delivered to landlord + other credits)
  const totalOffsetsAndCredits =
    totalRentPaidByUs +
    (deposit.offsetAgainstRent ? depositShortfallOwedByLandlord : 0) +
    netMaterialOwedByLandlord +
    otherCreditsTotal;

  // Final Optimum Net Payable
  const finalOptimumNetPayable = Math.max(0, grossPayable - totalOffsetsAndCredits);

  // Running balance for each diary row
  let runningBal = totalRentContractAmount + unpaidMaintenanceBalance;
  if (deposit.offsetAgainstRent && depositShortfallOwedByLandlord > 0) {
    runningBal -= depositShortfallOwedByLandlord;
  }

  const diaryRows: ComputedDiaryRow[] = [];
  let currentBalance = totalRentContractAmount; // Starts with contract obligation

  for (const entry of allEntries) {
    if (entry.impact === "we_owe_less") {
      currentBalance -= entry.amount;
    } else {
      currentBalance += entry.amount;
    }
    diaryRows.push({
      entry,
      runningBalance: currentBalance,
    });
  }

  return {
    months,
    diaryRows,
    summary: {
      totalRentContractMonths,
      monthlyRentRate,
      totalRentContractAmount,
      totalRentPaidByUs,
      rentBalanceDue,
      oldDepositAmount,
      depositRefundReceived: totalDepositRefundReceived,
      depositShortfallOwedByLandlord,
      renewalChequeGiven,
      totalMaterialSoldToLandlord,
      totalLandlordPaidForMaterial,
      netMaterialOwedByLandlord,
      totalMaintenanceBilled,
      totalMaintenancePaid,
      unpaidMaintenanceBalance,
      otherDebitsTotal,
      otherCreditsTotal,
      grossPayable,
      totalOffsetsAndCredits,
      finalOptimumNetPayable,
    },
  };
}
