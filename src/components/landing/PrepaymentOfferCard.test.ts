import { describe, it, expect } from "bun:test";
import { formatInr } from "@/lib/format";

describe("Prepayment 100% Discount Calculation", () => {
  it("calculates 5% discount correctly for standard project amounts", () => {
    const testCases = [
      { amount: 50000, expectedDiscount: 2500, expectedNet: 47500 },
      { amount: 150000, expectedDiscount: 7500, expectedNet: 142500 },
      { amount: 300000, expectedDiscount: 15000, expectedNet: 285000 },
      { amount: 500000, expectedDiscount: 25000, expectedNet: 475000 },
      { amount: 1000000, expectedDiscount: 50000, expectedNet: 950000 },
    ];

    for (const { amount, expectedDiscount, expectedNet } of testCases) {
      const discount = Math.round(amount * 0.05);
      const net = amount - discount;
      expect(discount).toBe(expectedDiscount);
      expect(net).toBe(expectedNet);
    }
  });

  it("formats Indian currency correctly for display", () => {
    expect(formatInr(7500)).toBe("₹7,500");
    expect(formatInr(142500)).toBe("₹1,42,500");
    expect(formatInr(50000)).toBe("₹50,000");
  });

  it("handles zero and fractional calculations without error", () => {
    const discountZero = Math.round(0 * 0.05);
    expect(discountZero).toBe(0);

    const oddAmount = 33333;
    const discountOdd = Math.round(oddAmount * 0.05);
    expect(discountOdd).toBe(1667);
    expect(oddAmount - discountOdd).toBe(31666);
  });
});
