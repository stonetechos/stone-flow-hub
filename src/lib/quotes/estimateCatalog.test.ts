import { describe, expect, it } from "bun:test";
import {
  ceilWhole,
  DEFAULT_WASTAGE_PCT,
  materialQuantityToOrder,
  wallSqft,
} from "./estimateCatalog";

describe("estimateCatalog - rounding and wastage calculations", () => {
  describe("ceilWhole", () => {
    it("preserves exact whole numbers", () => {
      expect(ceilWhole(100)).toBe(100);
      expect(ceilWhole(25)).toBe(25);
      expect(ceilWhole(1)).toBe(1);
    });

    it("rounds up fractional amounts, including tiny decimals like 101.0000001 -> 102", () => {
      expect(ceilWhole(101.0000001)).toBe(102);
      expect(ceilWhole(101.1)).toBe(102);
      expect(ceilWhole(101.9)).toBe(102);
      expect(ceilWhole(1.0000001)).toBe(2);
      expect(ceilWhole(1.5)).toBe(2);
      expect(ceilWhole(1.99)).toBe(2);
    });

    it("ignores microscopic float precision jitter (< 1e-12)", () => {
      expect(ceilWhole(100 + 1e-14)).toBe(100);
      expect(ceilWhole(25 - 1e-14)).toBe(25);
    });

    it("handles zero and invalid inputs safely", () => {
      expect(ceilWhole(0)).toBe(0);
      expect(ceilWhole(-5)).toBe(0);
      expect(ceilWhole(NaN)).toBe(0);
      expect(ceilWhole(Infinity)).toBe(0);
    });
  });

  describe("materialQuantityToOrder", () => {
    it("uses default 5% wastage", () => {
      expect(DEFAULT_WASTAGE_PCT).toBe(5);
      // 100 sqft + 5% = 105 sqft
      expect(materialQuantityToOrder(100)).toBe(105);
      // 36 sqft + 5% = 37.8 sqft -> 38 sqft
      expect(materialQuantityToOrder(36)).toBe(38);
    });

    it("rounds up 101.0000001 to 102 when wastage is applied", () => {
      // 96.1904762857 * 1.05 = 101.00000009998... ~ 101.0000001
      const rawSqft = 101.0000001 / 1.05;
      expect(materialQuantityToOrder(rawSqft, 5)).toBe(102);
    });

    it("supports custom wastage percentages (e.g. 0%, 5%, 8%, 10%)", () => {
      // 0% wastage
      expect(materialQuantityToOrder(100, 0)).toBe(100);
      expect(materialQuantityToOrder(100.1, 0)).toBe(101);

      // 5% wastage
      expect(materialQuantityToOrder(100, 5)).toBe(105);

      // 8% wastage: 50 * 1.08 = 54
      expect(materialQuantityToOrder(50, 8)).toBe(54);
      // 50.1 * 1.08 = 54.108 -> 55
      expect(materialQuantityToOrder(50.1, 8)).toBe(55);

      // 10% wastage: 36 * 1.10 = 39.6 -> 40
      expect(materialQuantityToOrder(36, 10)).toBe(40);
    });

    it("returns 0 for zero or non-positive area", () => {
      expect(materialQuantityToOrder(0, 5)).toBe(0);
      expect(materialQuantityToOrder(-10, 5)).toBe(0);
    });
  });

  describe("wallSqft", () => {
    it("calculates wall area correctly across units", () => {
      // 10ft x 10ft = 100 sqft
      expect(wallSqft(10, 10, "ft")).toBeCloseTo(100, 4);
      // 108in x 48in = 9ft x 4ft = 36 sqft
      expect(wallSqft(108, 48, "in")).toBeCloseTo(36, 4);
      // 1m x 1m ~ 10.7639 sqft
      expect(wallSqft(1, 1, "m")).toBeCloseTo(10.7639, 3);
    });
  });
});
