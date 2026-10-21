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
});
