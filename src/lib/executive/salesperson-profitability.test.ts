import { describe, expect, it } from "bun:test";
import { SALESPEOPLE_CONFIG } from "./salesperson-profitability";

describe("Salesperson Profitability & Target Configuration", () => {
  it("defines default ₹25 Lakhs target for Rishi and Raman summing to ₹50 Lakhs", () => {
    expect(SALESPEOPLE_CONFIG.rishi.defaultTarget).toBe(25_00_000);
    expect(SALESPEOPLE_CONFIG.raman.defaultTarget).toBe(25_00_000);
    const companyTotal =
      SALESPEOPLE_CONFIG.rishi.defaultTarget + SALESPEOPLE_CONFIG.raman.defaultTarget;
    expect(companyTotal).toBe(50_00_000);
  });

  it("calculates deals and sq.ft needed dynamically based on profit gap", () => {
    const target = 25_00_000;
    const currentProfit = 12_80_000;
    const gap = target - currentProfit; // 12,20,000
    const avgProfitPerDeal = 61_000;
    const avgDealSqft = 450;

    const dealsNeeded = Math.ceil(gap / avgProfitPerDeal); // 20 deals
    expect(dealsNeeded).toBe(20);

    const totalSqftNeeded = dealsNeeded * avgDealSqft; // 9,000 sq.ft
    expect(totalSqftNeeded).toBe(9000);

    const weeklyDeals = Math.ceil(dealsNeeded / 4);
    expect(weeklyDeals).toBe(5);
  });

  it("excludes declined (rejected) and expired quotes from active quoted values", () => {
    interface TestQuote {
      total: number;
      status: string;
    }

    function resolveQuotedValue(pQuotes: TestQuote[]): number {
      const approvedQ = pQuotes.find((q) => q.status === "accepted" || q.status === "converted");
      const activeNonApprovedQ = pQuotes.find(
        (q) => q.status !== "rejected" && q.status !== "expired",
      );
      return approvedQ ? approvedQ.total : activeNonApprovedQ ? activeNonApprovedQ.total : 0;
    }

    // A project having only a declined quote should NOT count in quoted value
    const declinedQuotes: TestQuote[] = [{ total: 101640, status: "rejected" }];
    expect(resolveQuotedValue(declinedQuotes)).toBe(0);

    // Expired quotes should also yield 0
    const deadQuotes: TestQuote[] = [{ total: 60000, status: "expired" }];
    expect(resolveQuotedValue(deadQuotes)).toBe(0);

    // If an approved quote exists, it should be chosen
    const mixedQuotesWithApproved: TestQuote[] = [
      { total: 101640, status: "rejected" },
      { total: 85000, status: "accepted" },
    ];
    expect(resolveQuotedValue(mixedQuotesWithApproved)).toBe(85000);

    // If only an active sent/draft quote exists, it should be chosen
    const activePipelineQuote: TestQuote[] = [
      { total: 101640, status: "rejected" },
      { total: 85300, status: "sent" },
    ];
    expect(resolveQuotedValue(activePipelineQuote)).toBe(85300);
  });
});
