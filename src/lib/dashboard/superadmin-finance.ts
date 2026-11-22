/**
 * Super Admin Executive Financial Intelligence & Statutory Governance Engine
 *
 * Implements:
 * 1. 4-Digit HSN Inward vs Outward Purchase Balancing (GST Negative-Stock Radar)
 * 2. Personal Savings Accounts / UPI Limit & Income Tax SFT Scrutiny Monitor (Section 285BA ₹10L Threshold)
 * 3. Cash Deal Penetration & Realized Inflow Channel Decomposition
 */

import { supabase } from "@/integrations/supabase/client";
import { getPaymentAccountCategory } from "@/lib/payments/method-display";
import { getQuoteSaleMode } from "@/lib/quotes/sale-mode";

// Standard statutory limit for personal savings accounts under Rule 114E (SFT-004)
export const SFT_SAVINGS_ANNUAL_LIMIT_INR = 10_00_000;

export interface HsnGroupSummary {
  hsn4: string;
  categoryName: string;
  soldQty: number;
  soldValue: number;
  purchasedQty: number;
  purchasedValue: number;
  deficitQty: number;
  deficitValue: number;
  unit: string;
  status: "deficit" | "balanced" | "surplus";
}

export const HSN4_CANONICAL_NAMES: Record<string, { name: string; defaultUnit: string }> = {
  "6802": { name: "Natural Stone Claddings, Slabs & Murals", defaultUnit: "sq.ft" },
  "2516": { name: "Granite, Sandstone & Rough Blocks", defaultUnit: "sq.ft" },
  "3214": { name: "Adhesives, Mastics & Joint Fillers", defaultUnit: "bag" },
  "3824": { name: "Chemical Sealers & Water Repellents", defaultUnit: "ltr" },
  "3506": { name: "Glues & Specialized Tile Adhesives", defaultUnit: "bag" },
  "3208": { name: "Solvent-Based Penetrating Sealers", defaultUnit: "ltr" },
  "9954": { name: "Cladding Fixing & Installation Services", defaultUnit: "sq.ft" },
  "9965": { name: "Local Carting & Freight Transportation", defaultUnit: "trip" },
};

export interface PersonalAccountScrutiny {
  accountKey: "raman" | "rishi";
  accountName: string;
  holderName: string;
  upiVpa: string;
  sftLimitInr: number;
  fyLabel: string;
  cumulativeInflowsInr: number;
  headroomInr: number;
  usagePercentage: number;
  riskLevel: "safe" | "caution" | "high_risk" | "critical";
  transactionCount: number;
  recommendation: string;
}

export interface CashDealAnalytics {
  totalDealsCount: number;
  cashDealsCount: number;
  invoicedDealsCount: number;
  hybridDealsCount: number;
  cashDealAdoptionRate: number;
  invoicedAdoptionRate: number;

  inflows: {
    currencyNotesInr: number;
    personalUpiRamanInr: number;
    personalUpiRishiInr: number;
    directVendorOffsetsInr: number;
    totalCashPoolInr: number;
  };
  inflowPercentages: {
    currencyNotesPct: number;
    personalUpiRamanPct: number;
    personalUpiRishiPct: number;
    directVendorOffsetsPct: number;
  };
}

export interface SuperAdminFinanceReport {
  fyLabel: string;
  fyStartDate: string;
  fyEndDate: string;
  hsnSummary: HsnGroupSummary[];
  totalDeficitValueInr: number;
  totalDeficitCount: number;
  personalAccounts: PersonalAccountScrutiny[];
  cashAnalytics: CashDealAnalytics;
}

/**
 * Extracts the first 4 numeric digits of an HSN / SAC code as the sole benchmark for equating
 * sales and purchase transactions.
 */
export function extractHsn4(rawHsn: string | number | null | undefined): string {
  if (!rawHsn) return "UNASSIGNED";
  const cleaned = String(rawHsn).replace(/\D/g, "");
  if (!cleaned) return "UNASSIGNED";
  return cleaned.length >= 4 ? cleaned.slice(0, 4) : cleaned.padEnd(4, "0");
}

/**
 * Calculates current Indian Financial Year boundaries (1 April to 31 March).
 */
export function getIndianFinancialYear(date: Date = new Date()): {
  label: string;
  startDate: string;
  endDate: string;
} {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = Jan, 3 = Apr, 11 = Dec)

  let startYear = year;
  let endYear = year + 1;

  if (month < 3) {
    // January to March belongs to preceding year's FY
    startYear = year - 1;
    endYear = year;
  }

  const shortEnd = String(endYear).slice(2);
  return {
    label: `FY ${startYear}-${shortEnd}`,
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
  };
}

/**
 * Evaluates risk level according to personal savings account SFT statutory reporting rules.
 */
export function evaluateSftRisk(
  inflow: number,
  limit = SFT_SAVINGS_ANNUAL_LIMIT_INR,
): {
  riskLevel: "safe" | "caution" | "high_risk" | "critical";
  recommendation: string;
} {
  const pct = (inflow / limit) * 100;
  if (pct >= 90) {
    return {
      riskLevel: "critical",
      recommendation:
        "CRITICAL SFT THRESHOLD DANGER (>90%). Stop personal UPI immediately. Route all customer collections to Bank of Baroda Current Account or Direct Vendor Offsets to avert Section 68/285BA scrutiny.",
    };
  }
  if (pct >= 75) {
    return {
      riskLevel: "high_risk",
      recommendation:
        "High Scrutiny Alert (75%-90%). SFT reporting limit imminent. Cease accepting large UPI collections into this personal account and divert payments to partner or vendor offsets.",
    };
  }
  if (pct >= 50) {
    return {
      riskLevel: "caution",
      recommendation:
        "Moderate Inflow (50%-75%). Monitor transaction velocity and balance customer collections with partner's account.",
    };
  }
  return {
    riskLevel: "safe",
    recommendation:
      "Safe Operations (<50%). Substantial headroom remaining below the ₹10 Lakh statutory SFT reporting threshold.",
  };
}

/**
 * Computes 4-Digit HSN balancing between outward billed items and inward purchase bills.
 */
export function computeHsnBalancing(
  soldItems: Array<{
    hsn?: string | number | null;
    quantity?: number | null;
    unit?: string | null;
    unit_price?: number | null;
    line_total?: number | null;
  }>,
  purchasedItems: Array<{
    hsn?: string | number | null;
    quantity?: number | null;
    unit?: string | null;
    unit_cost?: number | null;
    line_total?: number | null;
  }>,
): {
  hsnSummary: HsnGroupSummary[];
  totalDeficitValue: number;
  totalDeficitCount: number;
} {
  const hsnMap = new Map<
    string,
    {
      soldQty: number;
      soldValue: number;
      purchasedQty: number;
      purchasedValue: number;
      units: Set<string>;
    }
  >();

  const getOrCreate = (code: string) => {
    let entry = hsnMap.get(code);
    if (!entry) {
      entry = {
        soldQty: 0,
        soldValue: 0,
        purchasedQty: 0,
        purchasedValue: 0,
        units: new Set<string>(),
      };
      hsnMap.set(code, entry);
    }
    return entry;
  };

  // 1. Process sold outward items
  for (const item of soldItems) {
    const hsn4 = extractHsn4(item.hsn);
    if (hsn4 === "UNASSIGNED") continue;
    const entry = getOrCreate(hsn4);
    const q = Number(item.quantity) || 0;
    const p = Number(item.unit_price) || 0;
    const val = item.line_total != null ? Number(item.line_total) : q * p;

    entry.soldQty += q;
    entry.soldValue += val;
    if (item.unit) entry.units.add(item.unit.trim().toLowerCase());
  }

  // 2. Process inward purchased items
  for (const item of purchasedItems) {
    const hsn4 = extractHsn4(item.hsn);
    if (hsn4 === "UNASSIGNED") continue;
    const entry = getOrCreate(hsn4);
    const q = Number(item.quantity) || 0;
    const c = Number(item.unit_cost) || 0;
    const val = item.line_total != null ? Number(item.line_total) : q * c;

    entry.purchasedQty += q;
    entry.purchasedValue += val;
    if (item.unit) entry.units.add(item.unit.trim().toLowerCase());
  }

  let totalDeficitValue = 0;
  let totalDeficitCount = 0;

  const hsnSummary: HsnGroupSummary[] = [];

  for (const [hsn4, data] of hsnMap.entries()) {
    const meta = HSN4_CANONICAL_NAMES[hsn4];
    const categoryName = meta?.name || `Product Group (HSN ${hsn4})`;
    const unit = data.units.size > 0 ? Array.from(data.units)[0] : meta?.defaultUnit || "units";

    const deficitQty = Math.max(0, Math.round((data.soldQty - data.purchasedQty) * 100) / 100);
    // Value of outward goods not covered by inward purchases
    const avgSoldRate = data.soldQty > 0 ? data.soldValue / data.soldQty : 0;
    const deficitValue =
      deficitQty > 0
        ? Math.max(0, Math.round(deficitQty * avgSoldRate))
        : Math.max(0, Math.round(data.soldValue - data.purchasedValue));

    let status: "deficit" | "balanced" | "surplus" = "balanced";
    if (deficitQty > 0) {
      status = "deficit";
      totalDeficitCount++;
      totalDeficitValue += deficitValue;
    } else if (data.purchasedQty > data.soldQty) {
      status = "surplus";
    }

    hsnSummary.push({
      hsn4,
      categoryName,
      soldQty: Math.round(data.soldQty * 100) / 100,
      soldValue: Math.round(data.soldValue),
      purchasedQty: Math.round(data.purchasedQty * 100) / 100,
      purchasedValue: Math.round(data.purchasedValue),
      deficitQty,
      deficitValue,
      unit,
      status,
    });
  }

  // Sort: Deficits first (highest deficit value to lowest), then by sold value
  hsnSummary.sort((a, b) => {
    if (a.status === "deficit" && b.status !== "deficit") return -1;
    if (b.status === "deficit" && a.status !== "deficit") return 1;
    if (b.deficitValue !== a.deficitValue) return b.deficitValue - a.deficitValue;
    return b.soldValue - a.soldValue;
  });

  return { hsnSummary, totalDeficitValue, totalDeficitCount };
}

/**
 * Computes Cash Deal Penetration and decomposes cash inflows across:
 * 1. Physical currency notes
 * 2. Personal UPI - Raman
 * 3. Personal UPI - Rishi
 * 4. Direct vendor/agency payments by customer
 */
export function computeCashDealAnalytics(
  quotes: Array<{ workflow_state?: unknown; notes?: string | null; sale_mode?: string | null }>,
  receipts: Array<{
    amount?: number | null;
    method?: string | null;
    account_used?: string | null;
    bank_name?: string | null;
    notes?: string | null;
  }>,
  cashbookInflowsInr = 0,
): CashDealAnalytics {
  let cashDealsCount = 0;
  let invoicedDealsCount = 0;
  let hybridDealsCount = 0;

  for (const q of quotes) {
    const mode = getQuoteSaleMode(q);
    if (mode === "cash") cashDealsCount++;
    else if (mode === "hybrid") hybridDealsCount++;
    else invoicedDealsCount++;
  }

  const totalDealsCount = quotes.length;
  const cashDealAdoptionRate =
    totalDealsCount > 0 ? Math.round((cashDealsCount / totalDealsCount) * 1000) / 10 : 0;
  const invoicedAdoptionRate =
    totalDealsCount > 0 ? Math.round((invoicedDealsCount / totalDealsCount) * 1000) / 10 : 0;

  let currencyNotesInr = cashbookInflowsInr;
  let personalUpiRamanInr = 0;
  let personalUpiRishiInr = 0;
  let directVendorOffsetsInr = 0;

  for (const r of receipts) {
    const amt = Math.abs(Number(r.amount) || 0);
    if (amt <= 0) continue;

    const cat = getPaymentAccountCategory(r);
    const notesLower = (r.notes || "").toLowerCase();

    // Check if this payment was made directly to an external vendor / transporter / agency
    if (
      notesLower.includes("vendor direct") ||
      notesLower.includes("direct to vendor") ||
      notesLower.includes("paid to driver") ||
      notesLower.includes("paid to agency") ||
      notesLower.includes("transport direct") ||
      notesLower.includes("quarry direct")
    ) {
      directVendorOffsetsInr += amt;
    } else if (cat === "upi_raman") {
      personalUpiRamanInr += amt;
    } else if (cat === "upi_rishi") {
      personalUpiRishiInr += amt;
    } else if (cat === "cash") {
      currencyNotesInr += amt;
    } else if (cat === "other") {
      // Unspecified personal / direct transfer
      directVendorOffsetsInr += amt;
    }
  }

  const totalCashPoolInr =
    currencyNotesInr + personalUpiRamanInr + personalUpiRishiInr + directVendorOffsetsInr;

  const pct = (val: number) =>
    totalCashPoolInr > 0 ? Math.round((val / totalCashPoolInr) * 1000) / 10 : 0;

  return {
    totalDealsCount,
    cashDealsCount,
    invoicedDealsCount,
    hybridDealsCount,
    cashDealAdoptionRate,
    invoicedAdoptionRate,
    inflows: {
      currencyNotesInr: Math.round(currencyNotesInr),
      personalUpiRamanInr: Math.round(personalUpiRamanInr),
      personalUpiRishiInr: Math.round(personalUpiRishiInr),
      directVendorOffsetsInr: Math.round(directVendorOffsetsInr),
      totalCashPoolInr: Math.round(totalCashPoolInr),
    },
    inflowPercentages: {
      currencyNotesPct: pct(currencyNotesInr),
      personalUpiRamanPct: pct(personalUpiRamanInr),
      personalUpiRishiPct: pct(personalUpiRishiInr),
      directVendorOffsetsPct: pct(directVendorOffsetsInr),
    },
  };
}

/**
 * Main query function fetching live data and compiling the Super Admin Financial Report.
 */
export async function getSuperAdminFinanceReport(): Promise<SuperAdminFinanceReport> {
  const fy = getIndianFinancialYear();

  // 1. Fetch Sales Invoices & Line Items (Billed Outward Supplies)
  const { data: invoiceRows, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, issue_date, invoice_items(id, hsn_sac, quantity, unit, unit_price)")
    .not("status", "eq", "cancelled")
    .gte("issue_date", fy.startDate)
    .lte("issue_date", fy.endDate);

  if (invErr) console.warn("[superadmin-finance] Invoices query failed:", invErr);

  const soldItems: Array<{
    hsn?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_price?: number | null;
  }> = [];

  for (const inv of invoiceRows ?? []) {
    const rawItems = (inv.invoice_items ?? []) as Array<{
      hsn_sac?: string | null;
      quantity?: number | null;
      unit?: string | null;
      unit_price?: number | null;
    }>;
    for (const it of rawItems) {
      soldItems.push({
        hsn: it.hsn_sac,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
      });
    }
  }

  // 2. Fetch Inward Purchases (GRN Items joined with Products)
  const { data: grnItemsRows, error: grnErr } = await supabase
    .from("grn_items" as never)
    .select(
      "id, quantity_accepted, unit, unit_cost, products!grn_items_product_id_fkey(hsn_code), grns!grn_items_grn_id_fkey(received_date, status)",
    );

  if (grnErr) console.warn("[superadmin-finance] GRN items query failed:", grnErr);

  const purchasedItems: Array<{
    hsn?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_cost?: number | null;
  }> = [];

  for (const row of (grnItemsRows ?? []) as Array<Record<string, unknown>>) {
    const grn = row.grns as { received_date?: string; status?: string } | null;
    if (grn?.status === "cancelled") continue;
    if (
      grn?.received_date &&
      (grn.received_date < fy.startDate || grn.received_date > fy.endDate)
    ) {
      continue;
    }
    const prod = row.products as { hsn_code?: string } | null;
    purchasedItems.push({
      hsn: prod?.hsn_code,
      quantity: Number(row.quantity_accepted) || 0,
      unit: (row.unit as string) || null,
      unit_cost: Number(row.unit_cost) || 0,
    });
  }

  // 3. Compute 4-Digit HSN balancing
  const { hsnSummary, totalDeficitValue, totalDeficitCount } = computeHsnBalancing(
    soldItems,
    purchasedItems,
  );

  // 4. Fetch Receipts for the Financial Year (Personal Accounts SFT Monitoring)
  const { data: receiptRows, error: recErr } = await supabase
    .from("receipts" as never)
    .select("id, amount, method, account_used, bank_name, notes, received_at")
    .gte("received_at" as never, `${fy.startDate}T00:00:00` as never)
    .lte("received_at" as never, `${fy.endDate}T23:59:59` as never);

  if (recErr) console.warn("[superadmin-finance] Receipts query failed:", recErr);

  // 5. Fetch Ramans cashbook entries for physical cash tracking
  let cashbookInflows = 0;
  try {
    const { data: cbEntries } = await supabase
      .from("ramans_cashbook" as never)
      .select("amount, entry_type, entry_date")
      .eq("entry_type" as never, "debit" as never) // debit = money into drawer
      .gte("entry_date" as never, fy.startDate as never)
      .lte("entry_date" as never, fy.endDate as never);

    for (const cb of (cbEntries ?? []) as Array<{ amount?: number }>) {
      cashbookInflows += Number(cb.amount) || 0;
    }
  } catch (err) {
    console.warn("[superadmin-finance] Cashbook query non-critical:", err);
  }

  // 6. Compute Personal Accounts Scrutiny
  let ramanTotal = 0;
  let ramanTxCount = 0;
  let rishiTotal = 0;
  let rishiTxCount = 0;

  for (const r of (receiptRows ?? []) as Array<{
    amount?: number | null;
    method?: string | null;
    account_used?: string | null;
    bank_name?: string | null;
    notes?: string | null;
  }>) {
    const cat = getPaymentAccountCategory(r);
    const amt = Math.abs(Number(r.amount) || 0);
    if (cat === "upi_raman") {
      ramanTotal += amt;
      ramanTxCount++;
    } else if (cat === "upi_rishi") {
      rishiTotal += amt;
      rishiTxCount++;
    }
  }

  const ramanRisk = evaluateSftRisk(ramanTotal, SFT_SAVINGS_ANNUAL_LIMIT_INR);
  const rishiRisk = evaluateSftRisk(rishiTotal, SFT_SAVINGS_ANNUAL_LIMIT_INR);

  const personalAccounts: PersonalAccountScrutiny[] = [
    {
      accountKey: "raman",
      accountName: "Personal Savings (UPI / Bank)",
      holderName: "Raman",
      upiVpa: "Personal UPI QR",
      sftLimitInr: SFT_SAVINGS_ANNUAL_LIMIT_INR,
      fyLabel: fy.label,
      cumulativeInflowsInr: ramanTotal,
      headroomInr: Math.max(0, SFT_SAVINGS_ANNUAL_LIMIT_INR - ramanTotal),
      usagePercentage: Math.round((ramanTotal / SFT_SAVINGS_ANNUAL_LIMIT_INR) * 1000) / 10,
      riskLevel: ramanRisk.riskLevel,
      transactionCount: ramanTxCount,
      recommendation: ramanRisk.recommendation,
    },
    {
      accountKey: "rishi",
      accountName: "Personal Savings (UPI / Bank)",
      holderName: "Rishi",
      upiVpa: "Personal UPI QR",
      sftLimitInr: SFT_SAVINGS_ANNUAL_LIMIT_INR,
      fyLabel: fy.label,
      cumulativeInflowsInr: rishiTotal,
      headroomInr: Math.max(0, SFT_SAVINGS_ANNUAL_LIMIT_INR - rishiTotal),
      usagePercentage: Math.round((rishiTotal / SFT_SAVINGS_ANNUAL_LIMIT_INR) * 1000) / 10,
      riskLevel: rishiRisk.riskLevel,
      transactionCount: rishiTxCount,
      recommendation: rishiRisk.recommendation,
    },
  ];

  // 7. Fetch Quotations for Cash Deal Penetration
  const { data: quoteRows, error: quoteErr } = await supabase
    .from("quotes")
    .select("id, status, notes, workflow_state, created_at")
    .not("status", "eq", "cancelled")
    .gte("created_at", `${fy.startDate}T00:00:00`)
    .lte("created_at", `${fy.endDate}T23:59:59`);

  if (quoteErr) console.warn("[superadmin-finance] Quotes query failed:", quoteErr);

  const cashAnalytics = computeCashDealAnalytics(
    (quoteRows ?? []) as unknown as Array<{
      workflow_state?: unknown;
      notes?: string | null;
      sale_mode?: string | null;
    }>,
    (receiptRows ?? []) as unknown as Array<{
      amount?: number | null;
      method?: string | null;
      account_used?: string | null;
      bank_name?: string | null;
      notes?: string | null;
    }>,
    cashbookInflows,
  );

  return {
    fyLabel: fy.label,
    fyStartDate: fy.startDate,
    fyEndDate: fy.endDate,
    hsnSummary,
    totalDeficitValueInr: totalDeficitValue,
    totalDeficitCount,
    personalAccounts,
    cashAnalytics,
  };
}
