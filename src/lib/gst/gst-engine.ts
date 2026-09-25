/**
 * GST Calculation, Set-off & 1-Click Filing Engine for Stone Tech OS.
 *
 * Implements Indian GST statutory rules:
 * - Rule 88A / Circular 98/17/2019 order of Input Tax Credit (ITC) utilization:
 *     1. IGST ITC must be fully exhausted first (against IGST, then CGST, then SGST).
 *     2. CGST ITC against CGST, then IGST (never SGST).
 *     3. SGST ITC against SGST, then IGST (never CGST).
 * - Aggregation of Output GST from Sales Invoices (`invoices`).
 * - Aggregation of Input Tax Credit (ITC) from Purchase Invoices (`purchase_invoices`).
 * - Generation of Form GST PMT-06 E-Payment Challan with CPIN and direct payment portal link.
 * - Generation of standard GSTN GSTR-3B & GSTR-1 JSON payloads for 1-click portal filing.
 */

export interface TaxBreakup {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface GstInvoiceItem {
  id: string;
  invoiceNo: string;
  date: string;
  partyName: string;
  partyGstin: string | null;
  placeOfSupply: string | null;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalAmount: number;
  status: string;
  isInterState: boolean;
}

export interface GstOffsetSummary {
  igstPaidByIgst: number;
  cgstPaidByIgst: number;
  sgstPaidByIgst: number;
  cgstPaidByCgst: number;
  cgstPaidByIgstRemaining: number;
  sgstPaidBySgst: number;
  sgstPaidByIgstRemaining: number;
}

export interface GstCalculationSummary {
  periodMonth: number; // 1-12
  periodYear: number;
  periodLabel: string; // e.g. "September 2026"
  periodCode: string; // e.g. "092026" (GST portal format)
  companyGstin: string;
  companyName: string;
  companyStateCode: string;

  // Output Tax (Sales)
  outputTax: TaxBreakup;
  salesCount: number;
  salesInvoices: GstInvoiceItem[];

  // Input Tax Credit (Purchases)
  inputTaxCredit: TaxBreakup;
  purchaseCount: number;
  purchaseInvoices: GstInvoiceItem[];

  // Offset & Cash Liability
  offsetSummary: GstOffsetSummary;
  netPayable: TaxBreakup;
  itcCarriedForward: TaxBreakup;

  // Compliance Flags
  hasPendingDisputes: boolean;
  missingGstinCount: number;
  isReadyForFiling: boolean;
  isReadyForPayment: boolean;
}

export interface Pmt06Challan {
  cpin: string; // 14-digit Common Portal Identification Number
  gstin: string;
  taxpayerName: string;
  period: string;
  periodCode: string;
  createdDate: string;
  expiryDate: string;
  paymentMode: "NEFT_RTGS" | "NET_BANKING" | "OVER_THE_COUNTER";
  breakup: {
    cgst: {
      tax: number;
      interest: number;
      penalty: number;
      fees: number;
      others: number;
      total: number;
    };
    sgst: {
      tax: number;
      interest: number;
      penalty: number;
      fees: number;
      others: number;
      total: number;
    };
    igst: {
      tax: number;
      interest: number;
      penalty: number;
      fees: number;
      others: number;
      total: number;
    };
    cess: {
      tax: number;
      interest: number;
      penalty: number;
      fees: number;
      others: number;
      total: number;
    };
    totalChallanAmount: number;
  };
  portalUrl: string;
}

/** Extracts 2-digit Indian state code from 15-character GSTIN. Defaults to "24" (Gujarat). */
export function getStateCodeFromGstin(gstin?: string | null): string {
  if (!gstin) return "24";
  const cleaned = gstin.trim().toUpperCase();
  if (cleaned.length >= 2 && /^\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 2);
  }
  return "24";
}

/** Check if supply is inter-state based on company GSTIN and party GSTIN/place of supply. */
export function isInterStateSupply(
  companyGstin: string,
  partyGstin?: string | null,
  placeOfSupply?: string | null,
): boolean {
  const compState = getStateCodeFromGstin(companyGstin);

  if (partyGstin) {
    const partyState = getStateCodeFromGstin(partyGstin);
    return compState !== partyState;
  }

  if (placeOfSupply) {
    const posState = getStateCodeFromGstin(placeOfSupply);
    return compState !== posState;
  }

  return false;
}

/**
 * Standard Indian GST Statutory Set-off Engine (Rule 88A / Circular 98/17/2019).
 * Utilizes ITC against Output Tax liability adhering to mandatory statutory sequence.
 */
export function performGstSetOff(
  outputTax: { igst: number; cgst: number; sgst: number },
  itc: { igst: number; cgst: number; sgst: number },
): {
  netPayable: TaxBreakup;
  itcCarriedForward: TaxBreakup;
  offsetSummary: GstOffsetSummary;
} {
  let remainingOutputIgst = Math.max(0, Math.round(outputTax.igst));
  let remainingOutputCgst = Math.max(0, Math.round(outputTax.cgst));
  let remainingOutputSgst = Math.max(0, Math.round(outputTax.sgst));

  let availableItcIgst = Math.max(0, Math.round(itc.igst));
  let availableItcCgst = Math.max(0, Math.round(itc.cgst));
  let availableItcSgst = Math.max(0, Math.round(itc.sgst));

  const offsetSummary: GstOffsetSummary = {
    igstPaidByIgst: 0,
    cgstPaidByIgst: 0,
    sgstPaidByIgst: 0,
    cgstPaidByCgst: 0,
    cgstPaidByIgstRemaining: 0,
    sgstPaidBySgst: 0,
    sgstPaidByIgstRemaining: 0,
  };

  // Step 1: Utilize IGST ITC against IGST Output Liability
  const igstToIgst = Math.min(availableItcIgst, remainingOutputIgst);
  offsetSummary.igstPaidByIgst = igstToIgst;
  availableItcIgst -= igstToIgst;
  remainingOutputIgst -= igstToIgst;

  // Step 2: Remaining IGST ITC can be utilized against CGST and SGST output liability
  if (availableItcIgst > 0) {
    const igstToCgst = Math.min(availableItcIgst, remainingOutputCgst);
    offsetSummary.cgstPaidByIgst = igstToCgst;
    availableItcIgst -= igstToCgst;
    remainingOutputCgst -= igstToCgst;
  }

  if (availableItcIgst > 0) {
    const igstToSgst = Math.min(availableItcIgst, remainingOutputSgst);
    offsetSummary.sgstPaidByIgst = igstToSgst;
    availableItcIgst -= igstToSgst;
    remainingOutputSgst -= igstToSgst;
  }

  // Step 3: Utilize CGST ITC against remaining CGST Output Liability, then IGST (if any left)
  const cgstToCgst = Math.min(availableItcCgst, remainingOutputCgst);
  offsetSummary.cgstPaidByCgst = cgstToCgst;
  availableItcCgst -= cgstToCgst;
  remainingOutputCgst -= cgstToCgst;

  if (availableItcCgst > 0 && remainingOutputIgst > 0) {
    const cgstToIgst = Math.min(availableItcCgst, remainingOutputIgst);
    availableItcCgst -= cgstToIgst;
    remainingOutputIgst -= cgstToIgst;
  }

  // Step 4: Utilize SGST ITC against remaining SGST Output Liability, then IGST (if any left)
  const sgstToSgst = Math.min(availableItcSgst, remainingOutputSgst);
  offsetSummary.sgstPaidBySgst = sgstToSgst;
  availableItcSgst -= sgstToSgst;
  remainingOutputSgst -= sgstToSgst;

  if (availableItcSgst > 0 && remainingOutputIgst > 0) {
    const sgstToIgst = Math.min(availableItcSgst, remainingOutputIgst);
    availableItcSgst -= sgstToIgst;
    remainingOutputIgst -= sgstToIgst;
  }

  const netPayable: TaxBreakup = {
    taxableAmount: 0,
    cgst: remainingOutputCgst,
    sgst: remainingOutputSgst,
    igst: remainingOutputIgst,
    totalTax: remainingOutputCgst + remainingOutputSgst + remainingOutputIgst,
  };

  const itcCarriedForward: TaxBreakup = {
    taxableAmount: 0,
    cgst: availableItcCgst,
    sgst: availableItcSgst,
    igst: availableItcIgst,
    totalTax: availableItcCgst + availableItcSgst + availableItcIgst,
  };

  return {
    netPayable,
    itcCarriedForward,
    offsetSummary,
  };
}

export interface RawSalesInvoice {
  id: string;
  invoice_no: string;
  issue_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: string;
  place_of_supply?: string | null;
  customer?: {
    id: string;
    name: string;
    gst_number?: string | null;
    customer_code?: string;
  } | null;
}

export interface RawPurchaseInvoice {
  id: string;
  invoice_no: string;
  vendor_invoice_no?: string | null;
  invoice_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  vendor?: {
    id: string;
    company_name: string;
    gst_number?: string | null;
    vendor_code?: string;
  } | null;
}

/**
 * Calculates complete GST metrics, aggregates invoices and computes statutory offset.
 */
export function calculateGstSummary(params: {
  salesInvoices: RawSalesInvoice[];
  purchaseInvoices: RawPurchaseInvoice[];
  companyGstin: string;
  companyName: string;
  year: number;
  month: number; // 1-12
}): GstCalculationSummary {
  const { salesInvoices, purchaseInvoices, companyGstin, companyName, year, month } = params;
  const compState = getStateCodeFromGstin(companyGstin);

  // Filter sales invoices for period and active status
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
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
  const periodLabel = `${monthNames[month - 1]} ${year}`;
  const periodCode = `${String(month).padStart(2, "0")}${year}`;

  const periodSales = salesInvoices.filter((inv) => {
    if (inv.status === "cancelled") return false;
    const invDate = inv.issue_date?.slice(0, 7);
    return invDate === monthPrefix;
  });

  const periodPurchases = purchaseInvoices.filter((pinv) => {
    if (pinv.status === "cancelled" || pinv.status === "disputed") return false;
    const pDate = pinv.invoice_date?.slice(0, 7);
    return pDate === monthPrefix;
  });

  // Process Sales Invoices (Output GST)
  let salesTaxable = 0;
  let salesCgst = 0;
  let salesSgst = 0;
  let salesIgst = 0;
  let missingGstinCount = 0;

  const processedSales: GstInvoiceItem[] = periodSales.map((inv) => {
    const isInter = isInterStateSupply(companyGstin, inv.customer?.gst_number, inv.place_of_supply);
    const tax = Number(inv.tax_amount || 0);
    const taxable = Number(inv.subtotal || 0);
    const total = Number(inv.total || 0);

    salesTaxable += taxable;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInter) {
      igst = tax;
      salesIgst += igst;
    } else {
      cgst = Math.round((tax / 2) * 100) / 100;
      sgst = tax - cgst;
      salesCgst += cgst;
      salesSgst += sgst;
    }

    if (!inv.customer?.gst_number) {
      missingGstinCount++;
    }

    return {
      id: inv.id,
      invoiceNo: inv.invoice_no,
      date: inv.issue_date,
      partyName: inv.customer?.name || "Cash Customer",
      partyGstin: inv.customer?.gst_number || null,
      placeOfSupply: inv.place_of_supply || null,
      taxableAmount: taxable,
      cgst,
      sgst,
      igst,
      totalTax: tax,
      totalAmount: total,
      status: inv.status,
      isInterState: isInter,
    };
  });

  // Process Purchase Invoices (Input Tax Credit / ITC)
  let itcTaxable = 0;
  let itcCgst = 0;
  let itcSgst = 0;
  let itcIgst = 0;

  const processedPurchases: GstInvoiceItem[] = periodPurchases.map((pinv) => {
    const isInter = isInterStateSupply(companyGstin, pinv.vendor?.gst_number);
    const tax = Number(pinv.tax_amount || 0);
    const taxable = Number(pinv.subtotal || 0);
    const total = Number(pinv.total_amount || 0);

    itcTaxable += taxable;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInter) {
      igst = tax;
      itcIgst += igst;
    } else {
      cgst = Math.round((tax / 2) * 100) / 100;
      sgst = tax - cgst;
      itcCgst += cgst;
      itcSgst += sgst;
    }

    return {
      id: pinv.id,
      invoiceNo: pinv.invoice_no,
      date: pinv.invoice_date,
      partyName: pinv.vendor?.company_name || "Supplier",
      partyGstin: pinv.vendor?.gst_number || null,
      placeOfSupply: null,
      taxableAmount: taxable,
      cgst,
      sgst,
      igst,
      totalTax: tax,
      totalAmount: total,
      status: pinv.status,
      isInterState: isInter,
    };
  });

  const outputTax: TaxBreakup = {
    taxableAmount: Math.round(salesTaxable),
    cgst: Math.round(salesCgst),
    sgst: Math.round(salesSgst),
    igst: Math.round(salesIgst),
    totalTax: Math.round(salesCgst + salesSgst + salesIgst),
  };

  const inputTaxCredit: TaxBreakup = {
    taxableAmount: Math.round(itcTaxable),
    cgst: Math.round(itcCgst),
    sgst: Math.round(itcSgst),
    igst: Math.round(itcIgst),
    totalTax: Math.round(itcCgst + itcSgst + itcIgst),
  };

  // Perform Statutory Set-off
  const { netPayable, itcCarriedForward, offsetSummary } = performGstSetOff(
    outputTax,
    inputTaxCredit,
  );

  return {
    periodMonth: month,
    periodYear: year,
    periodLabel,
    periodCode,
    companyGstin,
    companyName,
    companyStateCode: compState,

    outputTax,
    salesCount: processedSales.length,
    salesInvoices: processedSales,

    inputTaxCredit,
    purchaseCount: processedPurchases.length,
    purchaseInvoices: processedPurchases,

    offsetSummary,
    netPayable,
    itcCarriedForward,

    hasPendingDisputes: false,
    missingGstinCount,
    isReadyForFiling: true,
    isReadyForPayment: netPayable.totalTax > 0,
  };
}

/** Generates deterministic 14-digit CPIN for GST PMT-06 challan. */
export function generateCpin(gstin: string, periodCode: string): string {
  const cleanGst = gstin.replace(/[^A-Z0-9]/g, "");
  let hash = 0;
  for (let i = 0; i < cleanGst.length; i++) {
    hash = (hash << 5) - hash + cleanGst.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash).toString().padStart(8, "7").slice(0, 8);
  return `26${periodCode.slice(0, 4)}${posHash}`.slice(0, 14);
}

/**
 * Generates GST PMT-06 Challan for online payment.
 */
export function generatePmt06Challan(summary: GstCalculationSummary): Pmt06Challan {
  const cpin = generateCpin(summary.companyGstin, summary.periodCode);
  const now = new Date();
  const expiry = new Date();
  expiry.setDate(now.getDate() + 15); // Valid for 15 days

  const cgstAmount = summary.netPayable.cgst;
  const sgstAmount = summary.netPayable.sgst;
  const igstAmount = summary.netPayable.igst;
  const totalAmount = summary.netPayable.totalTax;

  const breakup = {
    cgst: { tax: cgstAmount, interest: 0, penalty: 0, fees: 0, others: 0, total: cgstAmount },
    sgst: { tax: sgstAmount, interest: 0, penalty: 0, fees: 0, others: 0, total: sgstAmount },
    igst: { tax: igstAmount, interest: 0, penalty: 0, fees: 0, others: 0, total: igstAmount },
    cess: { tax: 0, interest: 0, penalty: 0, fees: 0, others: 0, total: 0 },
    totalChallanAmount: totalAmount,
  };

  // Direct official payment link
  const portalUrl = `https://payment.gst.gov.in/payment/`;

  return {
    cpin,
    gstin: summary.companyGstin,
    taxpayerName: summary.companyName,
    period: summary.periodLabel,
    periodCode: summary.periodCode,
    createdDate: now.toISOString().slice(0, 10),
    expiryDate: expiry.toISOString().slice(0, 10),
    paymentMode: "NET_BANKING",
    breakup,
    portalUrl,
  };
}

/**
 * Generates GSTN GSTR-3B offline JSON format (v2.0) ready for portal upload.
 */
export function generateGstr3bJson(summary: GstCalculationSummary): Record<string, unknown> {
  return {
    gstin: summary.companyGstin,
    ret_period: summary.periodCode,
    filing_type: "GSTR3B",
    sec_sum: {
      // Table 3.1: Details of Outward Supplies and inward supplies liable to reverse charge
      sec_31: {
        osup_det: {
          txval: summary.outputTax.taxableAmount,
          iamt: summary.outputTax.igst,
          camt: summary.outputTax.cgst,
          samt: summary.outputTax.sgst,
          csamt: 0,
        },
        osup_zero: { txval: 0, iamt: 0, csamt: 0 },
        osup_nil_exmp: { txval: 0 },
        isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_nongst: { txval: 0 },
      },
      // Table 4: Eligible Input Tax Credit (ITC)
      sec_4: {
        itc_avl: [
          {
            ty: "ALL_OTHER_ITC",
            iamt: summary.inputTaxCredit.igst,
            camt: summary.inputTaxCredit.cgst,
            samt: summary.inputTaxCredit.sgst,
            csamt: 0,
          },
        ],
        itc_rev: [],
        itc_net: {
          iamt: summary.inputTaxCredit.igst,
          camt: summary.inputTaxCredit.cgst,
          samt: summary.inputTaxCredit.sgst,
          csamt: 0,
        },
        itc_inelg: [],
      },
      // Table 6.1: Payment of Tax
      sec_61: {
        tx_pmt: [
          {
            tran_desc: "Integrated Tax (IGST)",
            tx_py: summary.outputTax.igst,
            pd_itc: summary.outputTax.igst - summary.netPayable.igst,
            pd_cash: summary.netPayable.igst,
            intr_py: 0,
            fee_py: 0,
          },
          {
            tran_desc: "Central Tax (CGST)",
            tx_py: summary.outputTax.cgst,
            pd_itc: summary.outputTax.cgst - summary.netPayable.cgst,
            pd_cash: summary.netPayable.cgst,
            intr_py: 0,
            fee_py: 0,
          },
          {
            tran_desc: "State Tax (SGST)",
            tx_py: summary.outputTax.sgst,
            pd_itc: summary.outputTax.sgst - summary.netPayable.sgst,
            pd_cash: summary.netPayable.sgst,
            intr_py: 0,
            fee_py: 0,
          },
        ],
      },
    },
    version: "GSTR3B_v2.0",
    generated_at: new Date().toISOString(),
    generated_by: "Stone Tech OS (STOS)",
  };
}

/**
 * Generates GSTN GSTR-1 offline JSON format (v1.0) with B2B & B2C breakup.
 */
export function generateGstr1Json(summary: GstCalculationSummary): Record<string, unknown> {
  const b2bInvoices = summary.salesInvoices.filter((inv) => !!inv.partyGstin);
  const b2cInvoices = summary.salesInvoices.filter((inv) => !inv.partyGstin);

  // Group B2B by Customer GSTIN
  const b2bMap: Record<string, typeof b2bInvoices> = {};
  for (const inv of b2bInvoices) {
    const ctin = inv.partyGstin!;
    if (!b2bMap[ctin]) b2bMap[ctin] = [];
    b2bMap[ctin].push(inv);
  }

  const b2bArray = Object.entries(b2bMap).map(([ctin, invs]) => ({
    ctin,
    cfs: "Y",
    inv: invs.map((inv) => ({
      inum: inv.invoiceNo,
      idt: inv.date,
      val: inv.totalAmount,
      pos: getStateCodeFromGstin(inv.partyGstin),
      rchrg: "N",
      inv_typ: "R",
      itms: [
        {
          num: 1,
          itm_det: {
            txval: inv.taxableAmount,
            rt: inv.taxableAmount > 0 ? Math.round((inv.totalTax / inv.taxableAmount) * 100) : 18,
            iamt: inv.igst,
            camt: inv.cgst,
            samt: inv.sgst,
            csamt: 0,
          },
        },
      ],
    })),
  }));

  // B2C Small Summary (Table 7)
  const b2csTotalTaxable = b2cInvoices.reduce((acc, i) => acc + i.taxableAmount, 0);
  const b2csTotalIgst = b2cInvoices.reduce((acc, i) => acc + i.igst, 0);
  const b2csTotalCgst = b2cInvoices.reduce((acc, i) => acc + i.cgst, 0);
  const b2csTotalSgst = b2cInvoices.reduce((acc, i) => acc + i.sgst, 0);

  const b2csArray =
    b2csTotalTaxable > 0
      ? [
          {
            sply_ty: b2csTotalIgst > 0 ? "INTER" : "INTRA",
            pos: summary.companyStateCode,
            typ: "OE",
            txval: b2csTotalTaxable,
            rt: 18,
            iamt: b2csTotalIgst,
            camt: b2csTotalCgst,
            samt: b2csTotalSgst,
            csamt: 0,
          },
        ]
      : [];

  return {
    gstin: summary.companyGstin,
    fp: summary.periodCode,
    version: "GSTR1_v1.0",
    hash: "hash_stos_" + summary.periodCode,
    b2b: b2bArray,
    b2cs: b2csArray,
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: "Invoices for outward supply",
          totnum: summary.salesCount,
          canc: 0,
          net_issue: summary.salesCount,
        },
      ],
    },
    generated_at: new Date().toISOString(),
    generated_by: "Stone Tech OS (STOS)",
  };
}
