import { z } from "zod";

export interface OfficeRentSettings {
  propertyName: string;
  propertyAddress: string;
  landlordName: string;
  landlordPhone?: string;
  monthlyRent: number;
  dueDayOfMonth: number; // e.g. 5 (5th of every month)
  payableInAdvance: boolean; // default true: rent for month M is due on or before 5th of month M
  startMonth: string; // "2025-02" (Feb 2025, where rent was fully cleared)
  notes?: string;
}

export interface RentPaymentRecord {
  id: string;
  paymentDate: string; // YYYY-MM-DD
  monthFor: string; // "2025-03", "2025-04", etc.
  amount: number;
  paymentMode: "Cheque" | "Bank Transfer (NEFT/RTGS/IMPS)" | "UPI" | "Cash" | "Other";
  referenceNo?: string; // Cheque No, UTR, Txn ID
  chequeDate?: string;
  bankName?: string;
  notes?: string;
  createdAt: string;
}

export interface SecurityDepositLedger {
  oldDepositAmount: number; // e.g. previous deposit held by landlord
  newDepositAmount: number; // new renewal deposit amount requested
  newDepositChequeNo?: string;
  newDepositChequeDate?: string;
  newDepositPaidAmount: number; // cheque given for renewal
  newDepositPaidDate?: string;
  oldDepositRefundReceived: number; // partial refund returned back by landlord
  oldDepositRefundDate?: string;
  oldDepositRefundRef?: string;
  notes?: string;
  offsetAgainstRent: boolean; // whether to automatically offset unreturned deposit in optimal calculation
}

export interface MaintenanceAmcRecord {
  id: string;
  type: "Society Maintenance" | "AMC" | "Electricity / Utility" | "Property Tax" | "Other";
  title: string;
  periodLabel: string; // e.g. "Q1 2025-26", "April 2025", "Annual 2025-26"
  billDate?: string;
  dueDate?: string;
  amount: number;
  paidAmount: number;
  isPaid: boolean;
  paymentDate?: string;
  paymentRef?: string;
  notes?: string;
  createdAt: string;
}

export interface OfficeRentRegisterData {
  settings: OfficeRentSettings;
  payments: RentPaymentRecord[];
  deposit: SecurityDepositLedger;
  maintenance: MaintenanceAmcRecord[];
  updatedAt: string;
}

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
    notes: z.string().optional(),
  }),
  payments: z.array(
    z.object({
      id: z.string(),
      paymentDate: z.string(),
      monthFor: z.string(),
      amount: z.number(),
      paymentMode: z.enum(["Cheque", "Bank Transfer (NEFT/RTGS/IMPS)", "UPI", "Cash", "Other"]),
      referenceNo: z.string().optional(),
      chequeDate: z.string().optional(),
      bankName: z.string().optional(),
      notes: z.string().optional(),
      createdAt: z.string(),
    }),
  ),
  deposit: z.object({
    oldDepositAmount: z.number(),
    newDepositAmount: z.number(),
    newDepositChequeNo: z.string().optional(),
    newDepositChequeDate: z.string().optional(),
    newDepositPaidAmount: z.number(),
    newDepositPaidDate: z.string().optional(),
    oldDepositRefundReceived: z.number(),
    oldDepositRefundDate: z.string().optional(),
    oldDepositRefundRef: z.string().optional(),
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
      paymentDate: z.string().optional(),
      paymentRef: z.string().optional(),
      notes: z.string().optional(),
      createdAt: z.string(),
    }),
  ),
  updatedAt: z.string(),
});

export type ReconciliationResult = ReturnType<typeof computeRentScheduleAndReconciliation>;

export const DEFAULT_OFFICE_RENT_REGISTER: OfficeRentRegisterData = {
  settings: {
    propertyName: "Stone Tech Atelier & Office (SG Business Hub)",
    propertyAddress: "Ground Floor, SG Business Hub, Vasant Nagar, Gota, Ahmedabad, Gujarat 380060",
    landlordName: "Office Landlord",
    landlordPhone: "",
    monthlyRent: 35000,
    dueDayOfMonth: 5,
    payableInAdvance: true,
    startMonth: "2025-02",
    notes:
      "Rent cleared in full up to February 2025. Advance rent due on or before the 5th of every month.",
  },
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
 * Generates an array of YYYY-MM strings starting from startMonth up to the target month (defaults to current date + optional advance months)
 */
export function generateMonthList(startMonth: string, endMonth?: string): string[] {
  const [startYear, startM] = startMonth.split("-").map(Number);
  const now = new Date();
  const target = endMonth
    ? endMonth.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const result: string[] = [];
  let y = startYear;
  let m = startM;

  while (y < target[0] || (y === target[0] && m <= target[1])) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return result;
}

export interface MonthlyRentScheduleRow {
  monthKey: string; // "2025-03"
  monthLabel: string; // "March 2025"
  dueDate: string; // "2025-03-05"
  rentDue: number;
  totalPaid: number;
  balanceDue: number;
  status: "cleared" | "paid" | "partial" | "overdue" | "advance_due";
  payments: RentPaymentRecord[];
}

export interface TenancyReconciliation {
  totalMonths: number;
  totalRentAccrued: number;
  totalRentPaid: number;
  netRentOutstanding: number;

  depositShortfallOwedByLandlord: number; // oldDepositAmount - oldDepositRefundReceived
  netDepositPaidOut: number; // newDepositPaidAmount - oldDepositRefundReceived

  totalMaintenanceBilled: number;
  totalMaintenancePaid: number;
  netMaintenanceOutstanding: number;

  grossPayable: number; // netRentOutstanding + netMaintenanceOutstanding
  optimalNetPayable: number; // grossPayable - (offsetAgainstRent ? depositShortfallOwedByLandlord : 0)

  currentMonthKey: string;
  currentMonthAdvanceDue: number;
  currentMonthStatus: "paid" | "partial" | "due_soon" | "overdue";
  currentMonthDueDate: string;
}

export function computeRentScheduleAndReconciliation(
  data: OfficeRentRegisterData,
  asOfDate: Date = new Date(),
): {
  schedule: MonthlyRentScheduleRow[];
  reconciliation: TenancyReconciliation;
} {
  const { settings, payments, deposit, maintenance } = data;
  const currentYear = asOfDate.getFullYear();
  const currentMonthNum = asOfDate.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;

  // Start from month AFTER startMonth if startMonth was fully paid, or include startMonth if needed
  // In user request: "rents i paid from Feb 2025, because on that our rent was fully paid"
  // So Feb 2025 is the benchmark month (balance was 0 at Feb 2025). The first new advance rent cycle is March 2025 (or Feb 2025 if Feb is listed as cleared baseline).
  const months = generateMonthList(settings.startMonth, currentMonthKey);

  const schedule: MonthlyRentScheduleRow[] = [];
  let totalRentAccrued = 0;
  let totalRentPaid = 0;

  for (const mKey of months) {
    const isBaselineMonth = mKey === settings.startMonth;
    const [y, m] = mKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, settings.dueDayOfMonth);
    const monthLabel = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });
    const dueDate = `${y}-${String(m).padStart(2, "0")}-${String(settings.dueDayOfMonth).padStart(2, "0")}`;

    const matchingPayments = payments.filter((p) => p.monthFor === mKey);
    const paidForMonth = matchingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // If baseline month (Feb 2025) was already fully cleared before this ledger started, rentDue is 0 or equal to paid
    const rentDue = isBaselineMonth ? 0 : Number(settings.monthlyRent || 0);
    const balanceDue = Math.max(0, rentDue - paidForMonth);

    let status: MonthlyRentScheduleRow["status"] = "paid";
    if (isBaselineMonth) {
      status = "cleared";
    } else if (paidForMonth >= rentDue && rentDue > 0) {
      status = "paid";
    } else if (paidForMonth > 0 && paidForMonth < rentDue) {
      status = "partial";
    } else {
      const isPastDue = asOfDate > new Date(y, m - 1, settings.dueDayOfMonth, 23, 59, 59);
      status = isPastDue ? "overdue" : "advance_due";
    }

    if (!isBaselineMonth) {
      totalRentAccrued += rentDue;
      totalRentPaid += paidForMonth;
    }

    schedule.push({
      monthKey: mKey,
      monthLabel: isBaselineMonth ? `${monthLabel} (Baseline Cleared)` : monthLabel,
      dueDate,
      rentDue,
      totalPaid: paidForMonth,
      balanceDue,
      status,
      payments: matchingPayments,
    });
  }

  // Reverse so newest month (current advance month) appears at top, but keep chronological option
  const netRentOutstanding = Math.max(0, totalRentAccrued - totalRentPaid);

  // Deposit calculation
  const oldDeposit = Number(deposit.oldDepositAmount || 0);
  const oldRefund = Number(deposit.oldDepositRefundReceived || 0);
  const newDepositPaid = Number(deposit.newDepositPaidAmount || 0);
  const depositShortfallOwedByLandlord = Math.max(0, oldDeposit - oldRefund);
  const netDepositPaidOut = Math.max(0, newDepositPaid - oldRefund);

  // Maintenance & AMC
  let totalMaintenanceBilled = 0;
  let totalMaintenancePaid = 0;
  for (const item of maintenance) {
    totalMaintenanceBilled += Number(item.amount || 0);
    totalMaintenancePaid += item.isPaid ? Number(item.amount || 0) : Number(item.paidAmount || 0);
  }
  const netMaintenanceOutstanding = Math.max(0, totalMaintenanceBilled - totalMaintenancePaid);

  const grossPayable = netRentOutstanding + netMaintenanceOutstanding;
  const depositOffset = deposit.offsetAgainstRent ? depositShortfallOwedByLandlord : 0;
  const optimalNetPayable = Math.max(0, grossPayable - depositOffset);

  // Current Month status
  const currentMonthRow = schedule.find((s) => s.monthKey === currentMonthKey);
  const currentMonthAdvanceDue = currentMonthRow
    ? currentMonthRow.balanceDue
    : Number(settings.monthlyRent || 0);
  let currentMonthStatus: TenancyReconciliation["currentMonthStatus"] = "due_soon";
  if (currentMonthRow) {
    if (currentMonthRow.status === "paid") currentMonthStatus = "paid";
    else if (currentMonthRow.status === "partial") currentMonthStatus = "partial";
    else if (currentMonthRow.status === "overdue") currentMonthStatus = "overdue";
    else currentMonthStatus = "due_soon";
  }

  const currentMonthDueDate = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}-${String(settings.dueDayOfMonth).padStart(2, "0")}`;

  return {
    schedule,
    reconciliation: {
      totalMonths: schedule.filter((s) => s.monthKey !== settings.startMonth).length,
      totalRentAccrued,
      totalRentPaid,
      netRentOutstanding,
      depositShortfallOwedByLandlord,
      netDepositPaidOut,
      totalMaintenanceBilled,
      totalMaintenancePaid,
      netMaintenanceOutstanding,
      grossPayable,
      optimalNetPayable,
      currentMonthKey,
      currentMonthAdvanceDue,
      currentMonthStatus,
      currentMonthDueDate,
    },
  };
}
