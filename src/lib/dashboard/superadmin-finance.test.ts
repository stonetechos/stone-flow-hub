import { describe, expect, it } from "bun:test";
import {
  extractHsn4,
  getIndianFinancialYear,
  evaluateSftRisk,
  computeHsnBalancing,
  computeCashDealAnalytics,
  computeTotalMismatch,
  generateFinancialAiSuggestions,
  SFT_SAVINGS_ANNUAL_LIMIT_INR,
  type HsnGroupSummary,
  type PersonalAccountScrutiny,
} from "./superadmin-finance";

describe("superadmin-finance", () => {
  describe("extractHsn4 (4-digit benchmark)", () => {
    it("extracts the first 4 numeric digits from 8-digit and 6-digit HSN codes", () => {
      expect(extractHsn4("68022190")).toBe("6802");
      expect(extractHsn4("251610")).toBe("2516");
      expect(extractHsn4(32141000)).toBe("3214");
      expect(extractHsn4("38249900")).toBe("3824");
      expect(extractHsn4("9954")).toBe("9954");
    });

    it("cleans non-digit noise and formatting", () => {
      expect(extractHsn4("HSN: 6802.21.90")).toBe("6802");
      expect(extractHsn4("SAC - 9965")).toBe("9965");
    });

    it("handles short, empty or null values safely", () => {
      expect(extractHsn4("68")).toBe("6800");
      expect(extractHsn4(null)).toBe("UNASSIGNED");
      expect(extractHsn4("")).toBe("UNASSIGNED");
      expect(extractHsn4(undefined)).toBe("UNASSIGNED");
    });
  });

  describe("getIndianFinancialYear", () => {
    it("calculates correct FY bounds for November (month >= April)", () => {
      const novDate = new Date(2026, 10, 22); // Month index 10 = Nov
      const fy = getIndianFinancialYear(novDate);
      expect(fy.label).toBe("FY 2026-27");
      expect(fy.startDate).toBe("2026-04-01");
      expect(fy.endDate).toBe("2027-03-31");
    });

    it("calculates correct FY bounds for February (month < April)", () => {
      const febDate = new Date(2027, 1, 15); // Month index 1 = Feb
      const fy = getIndianFinancialYear(febDate);
      expect(fy.label).toBe("FY 2026-27");
      expect(fy.startDate).toBe("2026-04-01");
      expect(fy.endDate).toBe("2027-03-31");
    });

    it("calculates correct FY bounds on exact April 1 boundary", () => {
      const aprDate = new Date(2026, 3, 1); // Month index 3 = Apr
      const fy = getIndianFinancialYear(aprDate);
      expect(fy.label).toBe("FY 2026-27");
      expect(fy.startDate).toBe("2026-04-01");
      expect(fy.endDate).toBe("2027-03-31");
    });
  });

  describe("evaluateSftRisk", () => {
    it("flags <50% as safe", () => {
      const r = evaluateSftRisk(3_00_000, SFT_SAVINGS_ANNUAL_LIMIT_INR);
      expect(r.riskLevel).toBe("safe");
      expect(r.recommendation).toContain("Safe Operations");
    });

    it("flags 50-75% as caution", () => {
      const r = evaluateSftRisk(6_00_000, SFT_SAVINGS_ANNUAL_LIMIT_INR);
      expect(r.riskLevel).toBe("caution");
      expect(r.recommendation).toContain("Moderate Inflow");
    });

    it("flags 75-90% as high_risk", () => {
      const r = evaluateSftRisk(8_20_000, SFT_SAVINGS_ANNUAL_LIMIT_INR);
      expect(r.riskLevel).toBe("high_risk");
      expect(r.recommendation).toContain("High Scrutiny Alert");
    });

    it("flags >90% as critical with immediate diversion instruction", () => {
      const r = evaluateSftRisk(9_40_000, SFT_SAVINGS_ANNUAL_LIMIT_INR);
      expect(r.riskLevel).toBe("critical");
      expect(r.recommendation).toContain("CRITICAL SFT THRESHOLD DANGER");
      expect(r.recommendation).toContain("Bank of Baroda Current Account");
    });
  });

  describe("computeHsnBalancing", () => {
    it("correctly identifies HSN deficit when sold exceeds purchased", () => {
      const sold = [
        { hsn: "68022190", quantity: 100, unit: "sq.ft", unit_price: 200, line_total: 20000 },
        { hsn: "68029900", quantity: 50, unit: "sq.ft", unit_price: 220, line_total: 11000 },
      ];
      const purchased = [
        { hsn: "6802", quantity: 70, unit: "sq.ft", unit_cost: 130, line_total: 9100 },
      ];

      const res = computeHsnBalancing(sold, purchased);
      expect(res.hsnSummary).toHaveLength(1);
      const row = res.hsnSummary[0];

      expect(row.hsn4).toBe("6802");
      expect(row.soldQty).toBe(150);
      expect(row.purchasedQty).toBe(70);
      expect(row.deficitQty).toBe(80); // 150 - 70
      expect(row.status).toBe("deficit");
      expect(res.totalDeficitCount).toBe(1);
      expect(res.totalDeficitValue).toBeGreaterThan(0);
    });

    it("correctly identifies surplus when purchased exceeds sold", () => {
      const sold = [
        { hsn: "32141000", quantity: 10, unit: "bag", unit_price: 900, line_total: 9000 },
      ];
      const purchased = [
        { hsn: "3214", quantity: 25, unit: "bag", unit_cost: 650, line_total: 16250 },
      ];

      const res = computeHsnBalancing(sold, purchased);
      expect(res.hsnSummary).toHaveLength(1);
      const row = res.hsnSummary[0];

      expect(row.hsn4).toBe("3214");
      expect(row.soldQty).toBe(10);
      expect(row.purchasedQty).toBe(25);
      expect(row.deficitQty).toBe(0);
      expect(row.status).toBe("surplus");
      expect(res.totalDeficitCount).toBe(0);
      expect(res.totalDeficitValue).toBe(0);
    });

    it("sorts deficit rows to the top", () => {
      const sold = [
        { hsn: "32141000", quantity: 10, unit: "bag", unit_price: 800, line_total: 8000 },
        { hsn: "68022190", quantity: 200, unit: "sq.ft", unit_price: 300, line_total: 60000 },
      ];
      const purchased = [
        { hsn: "3214", quantity: 10, unit: "bag", unit_cost: 600, line_total: 6000 }, // balanced
        { hsn: "6802", quantity: 50, unit: "sq.ft", unit_cost: 150, line_total: 7500 }, // deficit of 150
      ];

      const res = computeHsnBalancing(sold, purchased);
      expect(res.hsnSummary[0].hsn4).toBe("6802");
      expect(res.hsnSummary[0].status).toBe("deficit");
      expect(res.hsnSummary[1].hsn4).toBe("3214");
      expect(res.hsnSummary[1].status).toBe("balanced");
    });
  });

  describe("computeCashDealAnalytics", () => {
    it("computes deal adoption ratios and classifies cash inflows across all 4 channels", () => {
      const quotes = [
        { sale_mode: "cash" },
        { sale_mode: "cash" },
        { sale_mode: "cash" },
        { sale_mode: "invoiced" },
        { sale_mode: "hybrid" },
      ];

      const receipts = [
        { amount: 50000, method: "upi_raman" },
        { amount: 30000, method: "upi_rishi" },
        { amount: 20000, method: "cash" },
        { amount: 40000, method: "bank_transfer", notes: "Paid to driver directly on site" },
      ];

      const cashbookInflow = 10000;

      const res = computeCashDealAnalytics(quotes, receipts, cashbookInflow);

      expect(res.totalDealsCount).toBe(5);
      expect(res.cashDealsCount).toBe(3);
      expect(res.invoicedDealsCount).toBe(1);
      expect(res.hybridDealsCount).toBe(1);
      expect(res.cashDealAdoptionRate).toBe(60); // 3 / 5 = 60%
      expect(res.invoicedAdoptionRate).toBe(20); // 1 / 5 = 20%

      expect(res.inflows.personalUpiRamanInr).toBe(50000);
      expect(res.inflows.personalUpiRishiInr).toBe(30000);
      expect(res.inflows.currencyNotesInr).toBe(30000); // 20k receipt + 10k cashbook
      expect(res.inflows.directVendorOffsetsInr).toBe(40000); // driver direct
      expect(res.inflows.totalCashPoolInr).toBe(150000); // 50k + 30k + 30k + 40k

      expect(res.inflowPercentages.personalUpiRamanPct).toBe(33.3);
      expect(res.inflowPercentages.directVendorOffsetsPct).toBe(26.7);
    });
  });

  describe("computeTotalMismatch", () => {
    it("returns + sign when outward sales exceed inward purchase bills", () => {
      const summary: HsnGroupSummary[] = [
        {
          hsn4: "6802",
          categoryName: "Natural Stone Claddings",
          soldQty: 100,
          soldValue: 50000,
          purchasedQty: 40,
          purchasedValue: 20000,
          deficitQty: 60,
          deficitValue: 30000,
          unit: "sq.ft",
          status: "deficit",
        },
      ];

      const res = computeTotalMismatch(summary);
      expect(res.isDeficit).toBe(true);
      expect(res.mismatchSign).toBe("+");
      expect(res.netMismatchValue).toBe(30000);
      expect(res.formattedMismatch).toBe("+₹30,000");
      expect(res.deficitCategoriesCount).toBe(1);
    });

    it("returns - sign when inward purchase bills exceed outward sales", () => {
      const summary: HsnGroupSummary[] = [
        {
          hsn4: "6802",
          categoryName: "Natural Stone Claddings",
          soldQty: 50,
          soldValue: 25000,
          purchasedQty: 100,
          purchasedValue: 40000,
          deficitQty: 0,
          deficitValue: 0,
          unit: "sq.ft",
          status: "surplus",
        },
      ];

      const res = computeTotalMismatch(summary);
      expect(res.isDeficit).toBe(false);
      expect(res.mismatchSign).toBe("-");
      expect(res.netMismatchValue).toBe(-15000);
      expect(res.formattedMismatch).toBe("-₹15,000");
      expect(res.deficitCategoriesCount).toBe(0);
    });

    it("returns ₹0 when sales and purchases are balanced", () => {
      const summary: HsnGroupSummary[] = [];
      const res = computeTotalMismatch(summary);
      expect(res.netMismatchValue).toBe(0);
      expect(res.mismatchSign).toBe("");
      expect(res.formattedMismatch).toBe("₹0");
    });
  });

  describe("generateFinancialAiSuggestions", () => {
    it("generates core direct vendor offset strategy and partner balancing", () => {
      const accounts: PersonalAccountScrutiny[] = [
        {
          accountKey: "raman",
          accountName: "Personal Savings",
          holderName: "Raman",
          upiVpa: "Personal UPI",
          sftLimitInr: 1000000,
          fyLabel: "FY 2026-27",
          cumulativeInflowsInr: 720000,
          headroomInr: 280000,
          usagePercentage: 72,
          riskLevel: "caution",
          transactionCount: 14,
          recommendation: "Moderate",
        },
        {
          accountKey: "rishi",
          accountName: "Personal Savings",
          holderName: "Rishi",
          upiVpa: "Personal UPI",
          sftLimitInr: 1000000,
          fyLabel: "FY 2026-27",
          cumulativeInflowsInr: 310000,
          headroomInr: 690000,
          usagePercentage: 31,
          riskLevel: "safe",
          transactionCount: 8,
          recommendation: "Safe",
        },
      ];

      const suggestions = generateFinancialAiSuggestions(accounts);
      expect(suggestions.length).toBeGreaterThanOrEqual(3);

      const offsetSug = suggestions.find((s) => s.type === "direct_agency_offset");
      expect(offsetSug).toBeDefined();
      expect(offsetSug?.summary).toContain("pay directly to quarry or transport agency");

      const rebalanceSug = suggestions.find((s) => s.type === "partner_rebalance");
      expect(rebalanceSug).toBeDefined();
      expect(rebalanceSug?.title).toContain("Switch Inbound UPI QR to Rishi");
    });
  });
});
