/**
 * GST Data Access and Computation API.
 * Integrates live Sales Invoices and Purchase Invoices with the GST Calculation Engine.
 */
import { getDb } from "@/integrations/supabase/server-context";
import { getActiveCompanyProfile } from "@/lib/company/api";
import { AppError, mapDbError } from "@/lib/errors";
import {
  calculateGstSummary,
  generatePmt06Challan,
  generateGstr3bJson,
  generateGstr1Json,
  type GstCalculationSummary,
  type Pmt06Challan,
  type RawSalesInvoice,
  type RawPurchaseInvoice,
} from "./gst-engine";

export interface GstPeriodOption {
  year: number;
  month: number;
  label: string;
  periodCode: string;
}

/** Generates last 12 months as period selection options. */
export function getAvailableGstPeriods(): GstPeriodOption[] {
  const options: GstPeriodOption[] = [];
  const now = new Date();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    options.push({
      year: y,
      month: m,
      label: `${monthNames[m - 1]} ${y}`,
      periodCode: `${String(m).padStart(2, "0")}${y}`,
    });
  }
  return options;
}

/**
 * Fetches all sales & purchase invoices and calculates complete GST metrics for the period.
 */
export async function getGstCalculationForPeriod(
  year: number,
  month: number,
): Promise<{
  summary: GstCalculationSummary;
  challan: Pmt06Challan;
  gstr3b: Record<string, unknown>;
  gstr1: Record<string, unknown>;
}> {
  const db = getDb();

  // 1. Get Company details (GSTIN)
  let companyGstin = "24BJEPR8383P1ZB";
  let companyName = "Stone Tech India";

  try {
    const profile = await getActiveCompanyProfile();
    if (profile?.gstin) companyGstin = profile.gstin;
    if (profile?.company_name) companyName = profile.company_name;
  } catch (err) {
    console.warn("[gst] could not fetch company profile, using fallback", err);
  }

  // 2. Fetch Sales Invoices
  const { data: salesData, error: salesErr } = await db
    .from("invoices")
    .select(
      "id, invoice_no, issue_date, subtotal, tax_amount, total, status, place_of_supply, customer:customers!invoices_customer_id_fkey(id, name, gst_number, customer_code)",
    )
    .order("issue_date", { ascending: false });

  if (salesErr) throw new AppError(mapDbError(salesErr));

  // 3. Fetch Purchase Invoices
  const { data: purchaseData, error: purchaseErr } = await db
    .from("purchase_invoices" as never)
    .select(
      "id, invoice_no, vendor_invoice_no, invoice_date, subtotal, tax_amount, total_amount, status, vendor:vendors!purchase_invoices_vendor_id_fkey(id, company_name, gst_number, vendor_code)",
    )
    .order("invoice_date", { ascending: false });

  if (purchaseErr) throw new AppError(mapDbError(purchaseErr));

  const salesInvoices = (salesData ?? []) as unknown as RawSalesInvoice[];
  const purchaseInvoices = (purchaseData ?? []) as unknown as RawPurchaseInvoice[];

  const summary = calculateGstSummary({
    salesInvoices,
    purchaseInvoices,
    companyGstin,
    companyName,
    year,
    month,
  });

  const challan = generatePmt06Challan(summary);
  const gstr3b = generateGstr3bJson(summary);
  const gstr1 = generateGstr1Json(summary);

  return {
    summary,
    challan,
    gstr3b,
    gstr1,
  };
}
