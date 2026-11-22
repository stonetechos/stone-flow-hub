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

export interface HsnVendorSpec {
  vendorType: string;
  description: string;
  suggestedVendors: string[];
  statutoryAdvice: string;
  unitRate: number;
}

export const CANONICAL_HSN_VENDOR_SPECS: Record<string, HsnVendorSpec> = {
  "6802": {
    vendorType: "Natural Stone Quarry / Processing Atelier",
    description:
      "Quarries & fabrication units supplying natural stone slabs, architectural claddings & carved murals",
    suggestedVendors: [
      "Dholpur Stone Quarries & Fabricators",
      "Gwalior Mint Sandstone Processing Unit",
      "Makrana Marble Slabs Atelier",
      "Rajasthan Stone Consortium",
    ],
    statutoryAdvice:
      "Ensure inward invoice mentions 4-digit HSN 6802, stone variety (Gwalior Mint, Agra Red), thickness (30mm/40mm), and square footage.",
    unitRate: 250,
  },
  "2516": {
    vendorType: "Granite & Sandstone Mine Owner / Block Quarry",
    description:
      "Quarry mine owners supplying raw unworked rough stone blocks and dimensional blocks",
    suggestedVendors: [
      "Bijolia Sandstone Quarries",
      "Jalore Granite Mines",
      "Kishangarh Dimensional Stone Traders",
    ],
    statutoryAdvice: "Require transit pass (e-Ravanna) and GST purchase invoice under HSN 2516.",
    unitRate: 180,
  },
  "3214": {
    vendorType: "Specialized Construction Chemical & Adhesive Distributor",
    description: "Authorized depots for polymer-modified stone adhesives, epoxy grout, and mastics",
    suggestedVendors: [
      "MAPEI Construction Chemicals Depot",
      "Fosroc Chemicals India Authorized Agency",
      "Kerakoll / Roff Distributor",
    ],
    statutoryAdvice:
      "Inward bill must specify adhesive grade (e.g. C2TE S1 for stone cladding) under HSN 3214.",
    unitRate: 900,
  },
  "3824": {
    vendorType: "Stone Care & Chemical Sealant Distributor",
    description:
      "Distributors supplying solvent-based impregnating sealers, oleophobic coatings & anti-efflorescence liquids",
    suggestedVendors: [
      "Tenax Stone Care Distributor",
      "Bellinzoni Surface Treatment Depot",
      "Akemi India Specialty Chemicals",
    ],
    statutoryAdvice: "Require GST bill under HSN 3824 with batch number and litre volume.",
    unitRate: 2500,
  },
  "9954": {
    vendorType: "Specialized Stone Cladding Contractor / Labour Subcontractor",
    description:
      "Subcontractor agencies for on-site wall dry-cladding, wet-cladding & stone fixing",
    suggestedVendors: [
      "Stone Tech On-site Cladding Contractors",
      "Elite Stone Masonry Guild",
      "Gujarat Site Installation Crew",
    ],
    statutoryAdvice:
      "Inward subcontract invoice or verified labour muster bill under SAC 9954 to equate client installation billing.",
    unitRate: 80,
  },
  "9965": {
    vendorType: "Freight Logistics & Carting Agency",
    description:
      "Transport unions, crane operators, and multi-axle truck agencies handling quarry-to-site freight",
    suggestedVendors: [
      "Gujarat-Rajasthan Roadways",
      "Ambaji Express Freight Carriers",
      "Local Tempo & Crane Transport Union",
    ],
    statutoryAdvice:
      "Keep Transporter Consignment Note (Bilty / LR) or Freight Agency GST bill under SAC 9965.",
    unitRate: 2500,
  },
};

export interface TotalMismatchResult {
  totalSoldValue: number;
  totalPurchasedValue: number;
  netMismatchValue: number; // positive = sales unbacked (+), negative = purchases ahead (-)
  mismatchSign: "+" | "-" | "";
  formattedMismatch: string;
  totalSoldQty: number;
  totalPurchasedQty: number;
  deficitCategoriesCount: number;
  isDeficit: boolean;
  statusText: string;
}

export function computeTotalMismatch(hsnSummary: HsnGroupSummary[]): TotalMismatchResult {
  let totalSoldValue = 0;
  let totalPurchasedValue = 0;
  let totalSoldQty = 0;
  let totalPurchasedQty = 0;
  let deficitCategoriesCount = 0;

  for (const h of hsnSummary) {
    totalSoldValue += h.soldValue;
    totalPurchasedValue += h.purchasedValue;
    totalSoldQty += h.soldQty;
    totalPurchasedQty += h.purchasedQty;
    if (h.status === "deficit" || h.soldQty > h.purchasedQty || h.soldValue > h.purchasedValue) {
      deficitCategoriesCount++;
    }
  }

  const netMismatchValue = totalSoldValue - totalPurchasedValue;
  const isDeficit = netMismatchValue > 0;
  const mismatchSign = netMismatchValue > 0 ? "+" : netMismatchValue < 0 ? "-" : "";

  const absVal = Math.abs(netMismatchValue);
  const formattedMismatch =
    netMismatchValue === 0 ? "₹0" : `${mismatchSign}₹${absVal.toLocaleString("en-IN")}`;

  const statusText =
    netMismatchValue > 0
      ? `Sales exceed purchase bills by ₹${absVal.toLocaleString("en-IN")}. Missing inward supplier bills!`
      : netMismatchValue < 0
        ? `Purchase bills exceed sales by ₹${absVal.toLocaleString("en-IN")}. Safe inward stock buffer.`
        : "Sales and purchase bills are completely balanced.";

  return {
    totalSoldValue,
    totalPurchasedValue,
    netMismatchValue,
    mismatchSign,
    formattedMismatch,
    totalSoldQty,
    totalPurchasedQty,
    deficitCategoriesCount,
    isDeficit,
    statusText,
  };
}

export interface FinancialAiSuggestion {
  id: string;
  type: "direct_agency_offset" | "partner_rebalance" | "current_account_route" | "scrutiny_alert";
  title: string;
  summary: string;
  impactInr?: number;
  headroomSavedInr?: number;
  priority: "high" | "critical" | "recommended";
  actionLabel: string;
  actionType: "offset" | "rebalance" | "invoice";
  details: string;
}

export function generateFinancialAiSuggestions(
  personalAccounts: PersonalAccountScrutiny[],
  cashAnalytics?: CashDealAnalytics,
): FinancialAiSuggestion[] {
  const suggestions: FinancialAiSuggestion[] = [];

  const raman = personalAccounts.find((a) => a.accountKey === "raman");
  const rishi = personalAccounts.find((a) => a.accountKey === "rishi");

  const ramanHeadroom = raman?.headroomInr ?? 10_00_000;
  const rishiHeadroom = rishi?.headroomInr ?? 10_00_000;
  const ramanUsage = raman?.usagePercentage ?? 0;
  const rishiUsage = rishi?.usagePercentage ?? 0;

  // 1. Core Rule: Direct Customer-to-Agency/Vendor Offsets (Preserves personal savings limit)
  suggestions.push({
    id: "sug-direct-vendor-offset",
    type: "direct_agency_offset",
    title: "Route Customer Cash Directly to Quarry / Transporter",
    summary:
      "Instruct customers opting for cash deals to pay directly to quarry or transport agency accounts against Stone Tech payables. This completely bypasses personal savings accounts.",
    headroomSavedInr: 150000,
    impactInr: 150000,
    priority: "critical",
    actionLabel: "Record Direct Agency Offset",
    actionType: "offset",
    details:
      "Under Income Tax Rule 114E (SFT-004), cash/credits into personal savings accounts are monitored at ₹10 Lakhs/year. When a customer pays ₹1.5L directly to a transport driver or quarry supplier on our behalf, ₹0 enters personal accounts, saving ₹1.5L of statutory headroom while immediately settling vendor liabilities.",
  });

  // 2. Partner UPI Rebalancing
  if (Math.abs(ramanUsage - rishiUsage) >= 15) {
    const higher = ramanUsage > rishiUsage ? "Raman" : "Rishi";
    const lower = ramanUsage > rishiUsage ? "Rishi" : "Raman";
    const lowerHeadroom = ramanUsage > rishiUsage ? rishiHeadroom : ramanHeadroom;
    suggestions.push({
      id: "sug-partner-rebalance",
      type: "partner_rebalance",
      title: `Switch Inbound UPI QR to ${lower} (+₹${lowerHeadroom.toLocaleString("en-IN")} Headroom Advantage)`,
      summary: `${higher}'s personal account has reached ${Math.max(ramanUsage, rishiUsage)}% of the ₹10L limit, while ${lower} has ₹${lowerHeadroom.toLocaleString("en-IN")} headroom left. Divert upcoming customer QR payments to ${lower}.`,
      priority: "high",
      actionLabel: `Activate ${lower}'s UPI QR`,
      actionType: "rebalance",
      details: `Rebalancing personal UPI inflow avoids triggering high-risk scrutiny brackets (75%-90%) on a single partner account, keeping both partners within the safe statutory corridor.`,
    });
  } else {
    suggestions.push({
      id: "sug-partner-balanced",
      type: "partner_rebalance",
      title: "Maintain Equalized Personal UPI Rotation",
      summary: `Both Raman (₹${ramanHeadroom.toLocaleString("en-IN")} left) and Rishi (₹${rishiHeadroom.toLocaleString("en-IN")} left) are in balanced parity. Alternate UPI QR presentations evenly.`,
      priority: "recommended",
      actionLabel: "View UPI Allocation",
      actionType: "rebalance",
      details:
        "Even distribution prevents one partner from hitting the ₹10 Lakh annual ceiling prematurely.",
    });
  }

  // 3. Corporate Current Account Routing for High-Value Invoices
  suggestions.push({
    id: "sug-current-account-route",
    type: "current_account_route",
    title: "Divert Transactions > ₹1.5L to Company Current Account",
    summary:
      "For orders exceeding ₹1,50,000, issue an official GST tax invoice and accept RTGS into the Bank of Baroda Company Current Account (zero personal SFT cap).",
    priority: "recommended",
    actionLabel: "Generate GST Quote / Bill",
    actionType: "invoice",
    details:
      "Corporate current accounts have no ₹10L personal SFT limits and enhance the company's formal banking turnover for future credit lines.",
  });

  return suggestions;
}

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
 * sales and purchase transactions. If raw HSN is missing, infers the canonical 4-digit HSN
 * from the product description.
 */
export function extractHsn4(
  rawHsn: string | number | null | undefined,
  description?: string | null,
): string {
  if (rawHsn) {
    const cleaned = String(rawHsn).replace(/\D/g, "");
    if (cleaned.length >= 4) return cleaned.slice(0, 4);
    if (cleaned.length > 0) return cleaned.padEnd(4, "0");
  }

  if (description) {
    const d = description.toLowerCase();
    if (
      d.includes("stone") ||
      d.includes("cladding") ||
      d.includes("slab") ||
      d.includes("mural") ||
      d.includes("mint") ||
      d.includes("sandstone") ||
      d.includes("granite") ||
      d.includes("marble") ||
      d.includes("dholpur") ||
      d.includes("agra") ||
      d.includes("fluted") ||
      d.includes("prism") ||
      d.includes("origami") ||
      d.includes("groove") ||
      d.includes("texture")
    ) {
      return "6802";
    }
    if (d.includes("block") || d.includes("rough") || d.includes("quarry")) {
      return "2516";
    }
    if (
      d.includes("adhesive") ||
      d.includes("mastic") ||
      d.includes("glue") ||
      d.includes("mortar") ||
      d.includes("grout") ||
      d.includes("bond")
    ) {
      return "3214";
    }
    if (
      d.includes("sealer") ||
      d.includes("repellent") ||
      d.includes("chemical") ||
      d.includes("coat") ||
      d.includes("impregnat")
    ) {
      return "3824";
    }
    if (
      d.includes("fixing") ||
      d.includes("installation") ||
      d.includes("laying") ||
      d.includes("labour") ||
      d.includes("labor")
    ) {
      return "9954";
    }
    if (
      d.includes("carting") ||
      d.includes("freight") ||
      d.includes("transport") ||
      d.includes("tempo") ||
      d.includes("crane") ||
      d.includes("loading")
    ) {
      return "9965";
    }
  }

  return "UNASSIGNED";
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

  // 1. Fetch Sales Invoices (All non-cancelled invoices created till now)
  const { data: invoiceRows, error: invErr } = await supabase
    .from("invoices")
    .select("id, invoice_no, total, subtotal, status, issue_date, created_at, workflow_state")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (invErr) console.warn("[superadmin-finance] Invoices query:", invErr);

  // Fetch invoice line items directly to prevent relation join syntax issues
  const { data: invoiceItemsRows, error: itemsErr } = await supabase
    .from("invoice_items")
    .select(
      "id, invoice_id, description, hsn_sac, quantity, unit, unit_price, line_total, created_at",
    );

  if (itemsErr) console.warn("[superadmin-finance] Invoice items query:", itemsErr);

  const soldItems: Array<{
    hsn?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_price?: number | null;
    line_total?: number | null;
  }> = [];

  const invoiceItemsByInvoiceId = new Map<string, typeof invoiceItemsRows>();
  for (const item of invoiceItemsRows ?? []) {
    const list = invoiceItemsByInvoiceId.get(item.invoice_id) ?? [];
    list.push(item);
    invoiceItemsByInvoiceId.set(item.invoice_id, list);
  }

  for (const inv of invoiceRows ?? []) {
    const dbItems = invoiceItemsByInvoiceId.get(inv.id);

    if (dbItems && dbItems.length > 0) {
      for (const it of dbItems) {
        const hsn = extractHsn4(it.hsn_sac, it.description);
        soldItems.push({
          hsn: hsn === "UNASSIGNED" ? "6802" : hsn,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          line_total: it.line_total,
        });
      }
    } else {
      // Check if line items exist in workflow_state (e.g. drafted or converted from quote)
      const wf = (inv.workflow_state as Record<string, unknown> | null) ?? {};
      const wfItems = (wf.items as Array<Record<string, unknown>> | null) ?? [];
      if (wfItems.length > 0) {
        for (const it of wfItems) {
          const desc = String(it.description || it.product_name || "");
          const hsn = extractHsn4((it.hsn_sac || it.hsn) as string, desc);
          soldItems.push({
            hsn: hsn === "UNASSIGNED" ? "6802" : hsn,
            quantity: Number(it.quantity) || 0,
            unit: (it.unit as string) || "sq.ft",
            unit_price: Number(it.unit_price || it.rate) || 0,
            line_total: Number(it.line_total || it.amount) || 0,
          });
        }
      } else if (Number(inv.total) > 0) {
        // If invoice has a total amount, attribute to core natural stone claddings
        const totalAmt = Number(inv.total);
        soldItems.push({
          hsn: "6802",
          quantity: Math.round(totalAmt / 250),
          unit: "sq.ft",
          unit_price: 250,
          line_total: totalAmt,
        });
      }
    }
  }

  // Fallback: If no invoice items exist in the system yet, check confirmed sales orders and quotes
  if (soldItems.length === 0) {
    try {
      const { data: soItems } = await supabase
        .from("sales_order_items" as never)
        .select("id, sales_order_id, description, hsn_sac, quantity, unit, unit_price, line_total");
      for (const it of (soItems ?? []) as Array<Record<string, unknown>>) {
        const hsn = extractHsn4(it.hsn_sac as string, it.description as string);
        soldItems.push({
          hsn: hsn === "UNASSIGNED" ? "6802" : hsn,
          quantity: Number(it.quantity) || 0,
          unit: (it.unit as string) || "sq.ft",
          unit_price: Number(it.unit_price) || 0,
          line_total: Number(it.line_total) || 0,
        });
      }
    } catch (soErr) {
      console.warn("[superadmin-finance] Sales order items query non-critical:", soErr);
    }
  }

  if (soldItems.length === 0) {
    try {
      const { data: quoteItems } = await supabase
        .from("quote_items")
        .select("id, quote_id, description, hsn_sac, quantity, unit, unit_price, line_total");
      for (const it of quoteItems ?? []) {
        const hsn = extractHsn4(it.hsn_sac, it.description);
        soldItems.push({
          hsn: hsn === "UNASSIGNED" ? "6802" : hsn,
          quantity: it.quantity,
          unit: it.unit,
          unit_price: it.unit_price,
          line_total: it.line_total,
        });
      }
    } catch (qErr) {
      console.warn("[superadmin-finance] Quote items fallback non-critical:", qErr);
    }
  }

  // 2. Fetch Inward Purchases (GRN Items and Purchase Invoices)
  const purchasedItems: Array<{
    hsn?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_cost?: number | null;
  }> = [];

  try {
    const { data: grnItemsRows } = await supabase
      .from("grn_items" as never)
      .select(
        "id, quantity_accepted, unit, unit_cost, products!grn_items_product_id_fkey(hsn_code)",
      );

    for (const row of (grnItemsRows ?? []) as Array<Record<string, unknown>>) {
      const prod = row.products as { hsn_code?: string } | null;
      purchasedItems.push({
        hsn: extractHsn4(prod?.hsn_code),
        quantity: Number(row.quantity_accepted) || 0,
        unit: (row.unit as string) || null,
        unit_cost: Number(row.unit_cost) || 0,
      });
    }
  } catch (gErr) {
    console.warn("[superadmin-finance] GRN query non-critical:", gErr);
  }

  // 3. Compute 4-Digit HSN balancing
  const { hsnSummary, totalDeficitValue, totalDeficitCount } = computeHsnBalancing(
    soldItems,
    purchasedItems,
  );

  // 4. Fetch Receipts & Payments for Personal Accounts SFT Monitoring
  const seenTxIds = new Set<string>();
  let ramanTotal = 0;
  let ramanTxCount = 0;
  let rishiTotal = 0;
  let rishiTxCount = 0;
  let currencyNotesInr = 0;
  let directVendorOffsetsInr = 0;

  // 4A. Query payment_register (unions receipts and legacy payments)
  try {
    const { data: regRows } = await supabase
      .from("payment_register" as never)
      .select("id, amount, method, account_used, bank_name, notes, status");

    for (const r of (regRows ?? []) as Array<{
      id: string;
      amount?: number | null;
      method?: string | null;
      account_used?: string | null;
      bank_name?: string | null;
      notes?: string | null;
    }>) {
      if (seenTxIds.has(r.id)) continue;
      seenTxIds.add(r.id);
      const amt = Math.abs(Number(r.amount) || 0);
      if (amt <= 0) continue;

      const cat = getPaymentAccountCategory({
        method: r.method,
        account_used: r.account_used,
        bank_name: r.bank_name,
        notes: r.notes,
        remarks: r.notes,
      });

      if (cat === "upi_raman") {
        ramanTotal += amt;
        ramanTxCount++;
      } else if (cat === "upi_rishi") {
        rishiTotal += amt;
        rishiTxCount++;
      } else if (cat === "cash") {
        currencyNotesInr += amt;
      } else if (cat === "agency_offset") {
        directVendorOffsetsInr += amt;
      }
    }
  } catch (regErr) {
    console.warn("[superadmin-finance] payment_register query:", regErr);
  }

  // 4B. Query receipts directly (using correct 'remarks' column)
  try {
    const { data: receiptRows } = await supabase
      .from("receipts" as never)
      .select("id, amount, method, account_used, bank_name, remarks, status");

    for (const r of (receiptRows ?? []) as Array<{
      id: string;
      amount?: number | null;
      method?: string | null;
      account_used?: string | null;
      bank_name?: string | null;
      remarks?: string | null;
    }>) {
      if (seenTxIds.has(r.id)) continue;
      seenTxIds.add(r.id);
      const amt = Math.abs(Number(r.amount) || 0);
      if (amt <= 0) continue;

      const cat = getPaymentAccountCategory({
        method: r.method,
        account_used: r.account_used,
        bank_name: r.bank_name,
        notes: r.remarks,
        remarks: r.remarks,
      });

      if (cat === "upi_raman") {
        ramanTotal += amt;
        ramanTxCount++;
      } else if (cat === "upi_rishi") {
        rishiTotal += amt;
        rishiTxCount++;
      } else if (cat === "cash") {
        currencyNotesInr += amt;
      } else if (cat === "agency_offset") {
        directVendorOffsetsInr += amt;
      }
    }
  } catch (recErr) {
    console.warn("[superadmin-finance] Receipts query:", recErr);
  }

  // 4C. Query payments directly
  try {
    const { data: paymentRows } = await supabase
      .from("payments" as never)
      .select("id, amount, method, notes");

    for (const p of (paymentRows ?? []) as Array<{
      id: string;
      amount?: number | null;
      method?: string | null;
      notes?: string | null;
    }>) {
      if (seenTxIds.has(p.id)) continue;
      seenTxIds.add(p.id);
      const amt = Math.abs(Number(p.amount) || 0);
      if (amt <= 0) continue;

      const cat = getPaymentAccountCategory({
        method: p.method,
        notes: p.notes,
      });

      if (cat === "upi_raman") {
        ramanTotal += amt;
        ramanTxCount++;
      } else if (cat === "upi_rishi") {
        rishiTotal += amt;
        rishiTxCount++;
      } else if (cat === "cash") {
        currencyNotesInr += amt;
      } else if (cat === "agency_offset") {
        directVendorOffsetsInr += amt;
      }
    }
  } catch (payErr) {
    console.warn("[superadmin-finance] Payments query:", payErr);
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

  // 5. Fetch Quotations for Cash Deal Penetration
  const { data: quoteRows, error: quoteErr } = await supabase
    .from("quotes")
    .select("id, status, notes, workflow_state, created_at")
    .not("status", "eq", "cancelled");

  if (quoteErr) console.warn("[superadmin-finance] Quotes query failed:", quoteErr);

  const totalCashPoolInr = currencyNotesInr + ramanTotal + rishiTotal + directVendorOffsetsInr;
  const pct = (val: number) =>
    totalCashPoolInr > 0 ? Math.round((val / totalCashPoolInr) * 1000) / 10 : 0;

  const baseCashAnalytics = computeCashDealAnalytics(
    (quoteRows ?? []) as unknown as Array<{
      workflow_state?: unknown;
      notes?: string | null;
      sale_mode?: string | null;
    }>,
    [],
    currencyNotesInr,
  );

  const cashAnalytics: CashDealAnalytics = {
    ...baseCashAnalytics,
    inflows: {
      currencyNotesInr,
      personalUpiRamanInr: ramanTotal,
      personalUpiRishiInr: rishiTotal,
      directVendorOffsetsInr,
      totalCashPoolInr,
    },
    inflowPercentages: {
      currencyNotesPct: pct(currencyNotesInr),
      personalUpiRamanPct: pct(ramanTotal),
      personalUpiRishiPct: pct(rishiTotal),
      directVendorOffsetsPct: pct(directVendorOffsetsInr),
    },
  };

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
