import type { PaymentRegisterRow } from "@/lib/payments/crud";
import type { VendorPaymentListItem } from "@/lib/vendor-payments/api";
import type { InstallationLedgerRow } from "@/lib/installation-ledger/api";

export type FlowDirection = "in" | "out";

export interface DailyMoneyFlowTransaction {
  id: string;
  type: FlowDirection;
  source: "customer_receipt" | "customer_payment" | "vendor_payment" | "agency_payment";
  date: string; // YYYY-MM-DD
  timestamp: string;
  partyName: string;
  partyType: "Customer" | "Vendor" | "Agency";
  docNo: string;
  amount: number;
  method: string;
  referenceNo?: string | null;
  notes?: string | null;
  detailUrl: string;
}

export interface DayTrendItem {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  weekday: string;
  inflow: number;
  outflow: number;
  net: number;
  transactionCount: number;
  isSelected: boolean;
  isToday: boolean;
}

export interface DailyMoneyFlowSummary {
  selectedDate: string;
  isToday: boolean;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  inflowCount: number;
  outflowCount: number;
  totalCount: number;
  transactions: DailyMoneyFlowTransaction[];
  inflowTransactions: DailyMoneyFlowTransaction[];
  outflowTransactions: DailyMoneyFlowTransaction[];
  recentDays: DayTrendItem[];
  // Month-to-date figures for context
  mtdInflow: number;
  mtdOutflow: number;
  mtdNet: number;
}

function normalizeDate(rawDate?: string | null): string {
  if (!rawDate) return "";
  return rawDate.slice(0, 10);
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDayLabel(
  dateStr: string,
  todayStr: string,
): { label: string; weekday: string } {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    const [ty, tm, td] = todayStr.split("-").map(Number);
    const today = new Date(ty, tm - 1, td);

    const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    const weekday = date.toLocaleDateString("en-IN", { weekday: "short" });
    const formattedDate = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    if (diffDays === 0) return { label: "Today", weekday };
    if (diffDays === 1) return { label: "Yesterday", weekday };
    return { label: formattedDate, weekday };
  } catch {
    return { label: dateStr, weekday: "" };
  }
}

export function buildDailyMoneyFlowData({
  customerPayments = [],
  vendorPayments = [],
  agencyLedger = [],
  agencyNames = {},
  selectedDate = getTodayString(),
  trendDaysCount = 7,
}: {
  customerPayments?: PaymentRegisterRow[];
  vendorPayments?: VendorPaymentListItem[];
  agencyLedger?: InstallationLedgerRow[];
  agencyNames?: Record<string, string>;
  selectedDate?: string;
  trendDaysCount?: number;
}): DailyMoneyFlowSummary {
  const todayStr = getTodayString();
  const targetDate = selectedDate || todayStr;
  const currentMonthPrefix = targetDate.slice(0, 7); // YYYY-MM

  const allTransactions: DailyMoneyFlowTransaction[] = [];

  // 1. Process Customer Receipts & Payments (Money In)
  for (const cp of customerPayments) {
    const date = normalizeDate(cp.paid_at) || normalizeDate(cp.created_at);
    if (!date) continue;

    allTransactions.push({
      id: `in-cust-${cp.id}`,
      type: "in",
      source: cp.source === "receipt" ? "customer_receipt" : "customer_payment",
      date,
      timestamp: cp.paid_at || cp.created_at || date,
      partyName: cp.customer_name || "Customer Order",
      partyType: "Customer",
      docNo: cp.doc_no,
      amount: Math.abs(Number(cp.amount) || 0),
      method: cp.method || "bank_transfer",
      referenceNo: cp.reference_no,
      notes: cp.notes,
      detailUrl: cp.source === "receipt" ? `/receipts/${cp.id}` : `/payments/${cp.id}`,
    });
  }

  // 2. Process Vendor Payments (Money Out)
  for (const vp of vendorPayments) {
    const date = normalizeDate(vp.paid_at) || normalizeDate(vp.created_at);
    if (!date) continue;

    allTransactions.push({
      id: `out-vend-${vp.id}`,
      type: "out",
      source: "vendor_payment",
      date,
      timestamp: vp.paid_at || vp.created_at || date,
      partyName: vp.vendor?.company_name || "Vendor Supplier",
      partyType: "Vendor",
      docNo: vp.payment_no,
      amount: Math.abs(Number(vp.amount) || 0),
      method: vp.method || "bank_transfer",
      referenceNo: vp.reference_no,
      notes: vp.notes,
      detailUrl: `/vendor-payments/${vp.id}`,
    });
  }

  // 3. Process Agency Payments (Money Out)
  for (const al of agencyLedger) {
    // Only payments made to the agency (credit > 0)
    const credit = Number(al.credit) || 0;
    if (credit <= 0) continue;

    const date = normalizeDate(al.entry_date) || normalizeDate(al.created_at);
    if (!date) continue;

    const agencyName = agencyNames[al.installation_agency_id] || "Installation Agency";

    allTransactions.push({
      id: `out-agency-${al.id}`,
      type: "out",
      source: "agency_payment",
      date,
      timestamp: al.entry_date || al.created_at || date,
      partyName: agencyName,
      partyType: "Agency",
      docNo: al.ref_no || `AGY-${al.id.slice(0, 8)}`,
      amount: credit,
      method: al.description?.toLowerCase().includes("upi")
        ? "upi"
        : al.description?.toLowerCase().includes("cash")
          ? "cash"
          : "bank_transfer",
      referenceNo: al.ref_no,
      notes: al.description,
      detailUrl: "/agency-payments",
    });
  }

  // Sort newest first
  allTransactions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Compute selected day totals
  const dayTransactions = allTransactions.filter((t) => t.date === targetDate);
  const inflowTransactions = dayTransactions.filter((t) => t.type === "in");
  const outflowTransactions = dayTransactions.filter((t) => t.type === "out");

  const totalInflow = inflowTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalOutflow = outflowTransactions.reduce((acc, t) => acc + t.amount, 0);
  const netCashFlow = totalInflow - totalOutflow;

  // Compute MTD figures
  let mtdInflow = 0;
  let mtdOutflow = 0;
  for (const t of allTransactions) {
    if (t.date.startsWith(currentMonthPrefix)) {
      if (t.type === "in") mtdInflow += t.amount;
      else mtdOutflow += t.amount;
    }
  }
  const mtdNet = mtdInflow - mtdOutflow;

  // Build Recent Trend (last trendDaysCount days ending at today)
  const recentDays: DayTrendItem[] = [];
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const baseToday = new Date(ty, tm - 1, td);

  for (let i = trendDaysCount - 1; i >= 0; i--) {
    const d = new Date(baseToday);
    d.setDate(baseToday.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

    const itemsForThisDay = allTransactions.filter((t) => t.date === dateStr);
    const dayIn = itemsForThisDay
      .filter((t) => t.type === "in")
      .reduce((acc, t) => acc + t.amount, 0);
    const dayOut = itemsForThisDay
      .filter((t) => t.type === "out")
      .reduce((acc, t) => acc + t.amount, 0);

    const { label, weekday } = formatDayLabel(dateStr, todayStr);

    recentDays.push({
      date: dateStr,
      dayLabel: label,
      weekday,
      inflow: dayIn,
      outflow: dayOut,
      net: dayIn - dayOut,
      transactionCount: itemsForThisDay.length,
      isSelected: dateStr === targetDate,
      isToday: dateStr === todayStr,
    });
  }

  return {
    selectedDate: targetDate,
    isToday: targetDate === todayStr,
    totalInflow,
    totalOutflow,
    netCashFlow,
    inflowCount: inflowTransactions.length,
    outflowCount: outflowTransactions.length,
    totalCount: dayTransactions.length,
    transactions: dayTransactions,
    inflowTransactions,
    outflowTransactions,
    recentDays,
    mtdInflow,
    mtdOutflow,
    mtdNet,
  };
}
