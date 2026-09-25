import { describe, it, expect } from "bun:test";
import {
  getStateCodeFromGstin,
  isInterStateSupply,
  performGstSetOff,
  calculateGstSummary,
  generatePmt06Challan,
  generateGstr3bJson,
  generateGstr1Json,
  type RawSalesInvoice,
  type RawPurchaseInvoice,
} from "./gst-engine";

describe("gst-engine — Statutory GST Calculation & Filing Engine", () => {
  it("extracts state code from 15-digit GSTIN correctly", () => {
    expect(getStateCodeFromGstin("24BJEPR8383P1ZB")).toBe("24"); // Gujarat
    expect(getStateCodeFromGstin("27AAAPL1234C1ZV")).toBe("27"); // Maharashtra
    expect(getStateCodeFromGstin("29AABCU9603R1ZM")).toBe("29"); // Karnataka
    expect(getStateCodeFromGstin(null)).toBe("24"); // fallback default
  });

  it("identifies intra-state vs inter-state supplies correctly", () => {
    const compGst = "24BJEPR8383P1ZB"; // Gujarat (24)
    // Same state buyer
    expect(isInterStateSupply(compGst, "24ABCDE1234F1Z5")).toBe(false);
    // Other state buyer (Maharashtra 27)
    expect(isInterStateSupply(compGst, "27ABCDE1234F1Z5")).toBe(true);
    // Based on place of supply code
    expect(isInterStateSupply(compGst, null, "27")).toBe(true);
    expect(isInterStateSupply(compGst, null, "24")).toBe(false);
  });

  it("performs Rule 88A / Circular 98/17/2019 statutory set-off accurately", () => {
    // Scenario 1: Output IGST = 10,000, CGST = 18,000, SGST = 18,000
    // Input ITC: IGST = 15,000, CGST = 10,000, SGST = 10,000
    // 1. IGST ITC (15,000) offsets IGST output (10,000) -> 5,000 remaining.
    // 2. Remaining IGST ITC (5,000) offsets CGST output (18,000) -> CGST output left: 13,000.
    // 3. CGST ITC (10,000) offsets CGST output (13,000) -> CGST payable: 3,000.
    // 4. SGST ITC (10,000) offsets SGST output (18,000) -> SGST payable: 8,000.
    // Net Payable: IGST = 0, CGST = 3,000, SGST = 8,000. Total = 11,000.
    const result = performGstSetOff(
      { igst: 10000, cgst: 18000, sgst: 18000 },
      { igst: 15000, cgst: 10000, sgst: 10000 },
    );

    expect(result.netPayable.igst).toBe(0);
    expect(result.netPayable.cgst).toBe(3000);
    expect(result.netPayable.sgst).toBe(8000);
    expect(result.netPayable.totalTax).toBe(11000);
    expect(result.itcCarriedForward.totalTax).toBe(0);
  });

  it("handles excess ITC with zero net payable and carries forward remaining credit", () => {
    // Higher purchases than sales
    const result = performGstSetOff(
      { igst: 5000, cgst: 5000, sgst: 5000 },
      { igst: 10000, cgst: 10000, sgst: 10000 },
    );

    expect(result.netPayable.totalTax).toBe(0);
    expect(result.itcCarriedForward.igst).toBe(0);
    expect(result.itcCarriedForward.cgst).toBe(10000);
    expect(result.itcCarriedForward.sgst).toBe(5000);
    expect(result.itcCarriedForward.totalTax).toBe(15000);
  });

  it("aggregates raw sales and purchase invoices into complete monthly GST summary", () => {
    const rawSales: RawSalesInvoice[] = [
      {
        id: "inv-1",
        invoice_no: "INV-2026-001",
        issue_date: "2026-09-10",
        subtotal: 100000,
        tax_amount: 18000,
        total: 118000,
        status: "paid",
        customer: { id: "c-1", name: "Ahmedabad Builders", gst_number: "24AAACA1234A1Z1" },
      },
      {
        id: "inv-2",
        invoice_no: "INV-2026-002",
        issue_date: "2026-09-15",
        subtotal: 50000,
        tax_amount: 9000,
        total: 59000,
        status: "sent",
        customer: { id: "c-2", name: "Mumbai Interiors", gst_number: "27BBBCA1234B1Z2" }, // Inter-state
      },
      {
        id: "inv-3",
        invoice_no: "INV-2026-003",
        issue_date: "2026-08-15", // Different month
        subtotal: 80000,
        tax_amount: 14400,
        total: 94400,
        status: "paid",
      },
    ];

    const rawPurchases: RawPurchaseInvoice[] = [
      {
        id: "pinv-1",
        invoice_no: "PINV-2026-001",
        invoice_date: "2026-09-05",
        subtotal: 60000,
        tax_amount: 10800,
        total_amount: 70800,
        status: "recorded",
        vendor: {
          id: "v-1",
          company_name: "Rajasthan Marble Quarry",
          gst_number: "08CCCRA1234C1Z3",
        }, // Inter-state (Rajasthan 08)
      },
    ];

    const summary = calculateGstSummary({
      salesInvoices: rawSales,
      purchaseInvoices: rawPurchases,
      companyGstin: "24BJEPR8383P1ZB",
      companyName: "Stone Tech India Pvt Ltd",
      year: 2026,
      month: 9,
    });

    expect(summary.periodLabel).toBe("September 2026");
    expect(summary.periodCode).toBe("092026");
    expect(summary.salesCount).toBe(2);
    expect(summary.purchaseCount).toBe(1);

    // Sales Output Tax:
    // INV-1 (intra): 18000 tax -> CGST 9000, SGST 9000
    // INV-2 (inter): 9000 tax -> IGST 9000
    expect(summary.outputTax.taxableAmount).toBe(150000);
    expect(summary.outputTax.cgst).toBe(9000);
    expect(summary.outputTax.sgst).toBe(9000);
    expect(summary.outputTax.igst).toBe(9000);
    expect(summary.outputTax.totalTax).toBe(27000);

    // Purchase Input Tax:
    // PINV-1 (inter): 10800 tax -> IGST 10800
    expect(summary.inputTaxCredit.taxableAmount).toBe(60000);
    expect(summary.inputTaxCredit.igst).toBe(10800);
    expect(summary.inputTaxCredit.totalTax).toBe(10800);

    // Offset:
    // IGST Output (9000) offset by IGST ITC (10800) -> 0 IGST payable, 1800 IGST ITC remaining
    // Remaining IGST ITC (1800) offset against CGST Output (9000) -> CGST payable: 7200
    // SGST Output: 9000 payable
    expect(summary.netPayable.igst).toBe(0);
    expect(summary.netPayable.cgst).toBe(7200);
    expect(summary.netPayable.sgst).toBe(9000);
    expect(summary.netPayable.totalTax).toBe(16200);
  });

  it("generates a valid Form GST PMT-06 challan with CPIN and breakdown", () => {
    const summary = calculateGstSummary({
      salesInvoices: [
        {
          id: "s1",
          invoice_no: "INV-101",
          issue_date: "2026-09-01",
          subtotal: 100000,
          tax_amount: 18000,
          total: 118000,
          status: "paid",
          customer: { id: "c1", name: "Client A", gst_number: "24AABCA1111A1Z1" },
        },
      ],
      purchaseInvoices: [],
      companyGstin: "24BJEPR8383P1ZB",
      companyName: "Stone Tech India Pvt Ltd",
      year: 2026,
      month: 9,
    });

    const challan = generatePmt06Challan(summary);
    expect(challan.cpin.length).toBe(14);
    expect(challan.gstin).toBe("24BJEPR8383P1ZB");
    expect(challan.breakup.cgst.tax).toBe(9000);
    expect(challan.breakup.sgst.tax).toBe(9000);
    expect(challan.breakup.totalChallanAmount).toBe(18000);
    expect(challan.portalUrl).toContain("payment.gst.gov.in");
  });

  it("generates GSTN-compliant GSTR-3B offline JSON structure", () => {
    const summary = calculateGstSummary({
      salesInvoices: [
        {
          id: "s1",
          invoice_no: "INV-101",
          issue_date: "2026-09-01",
          subtotal: 100000,
          tax_amount: 18000,
          total: 118000,
          status: "paid",
          customer: { id: "c1", name: "Client A", gst_number: "24AABCA1111A1Z1" },
        },
      ],
      purchaseInvoices: [],
      companyGstin: "24BJEPR8383P1ZB",
      companyName: "Stone Tech India Pvt Ltd",
      year: 2026,
      month: 9,
    });

    const gstr3b = generateGstr3bJson(summary);
    expect(gstr3b.gstin).toBe("24BJEPR8383P1ZB");
    expect(gstr3b.ret_period).toBe("092026");
    const secSum = gstr3b.sec_sum as Record<
      string,
      { osup_det: { txval: number; camt: number; samt: number } }
    >;
    expect(secSum.sec_31.osup_det.txval).toBe(100000);
    expect(secSum.sec_31.osup_det.camt).toBe(9000);
    expect(secSum.sec_31.osup_det.samt).toBe(9000);
  });

  it("generates GSTN-compliant GSTR-1 offline JSON structure with B2B invoices", () => {
    const summary = calculateGstSummary({
      salesInvoices: [
        {
          id: "s1",
          invoice_no: "INV-101",
          issue_date: "2026-09-01",
          subtotal: 100000,
          tax_amount: 18000,
          total: 118000,
          status: "paid",
          customer: { id: "c1", name: "Client A", gst_number: "27AABCA1111A1Z1" }, // Inter-state
        },
      ],
      purchaseInvoices: [],
      companyGstin: "24BJEPR8383P1ZB",
      companyName: "Stone Tech India Pvt Ltd",
      year: 2026,
      month: 9,
    });

    const gstr1 = generateGstr1Json(summary);
    expect(gstr1.gstin).toBe("24BJEPR8383P1ZB");
    expect(gstr1.fp).toBe("092026");
    const b2bList = gstr1.b2b as Array<{ ctin: string; inv: Array<{ inum: string }> }>;
    expect(b2bList.length).toBe(1);
    expect(b2bList[0]?.ctin).toBe("27AABCA1111A1Z1");
    expect(b2bList[0]?.inv[0]?.inum).toBe("INV-101");
  });
});
