import { describe, expect, it } from "bun:test";
import { formatInr } from "./format";

describe("formatInr", () => {
  it("handles null and empty values", () => {
    expect(formatInr(null)).toBe("—");
    expect(formatInr(undefined)).toBe("—");
    expect(formatInr("")).toBe("—");
  });

  it("rounds values with decimals >= 0.5 up to next integer", () => {
    expect(formatInr(101.52)).toBe("₹102");
    expect(formatInr(101.5)).toBe("₹102");
    expect(formatInr("101.52")).toBe("₹102");
  });

  it("rounds values with decimals < 0.5 down to integer", () => {
    expect(formatInr(101.49)).toBe("₹101");
    expect(formatInr(101.12)).toBe("₹101");
    expect(formatInr("101.49")).toBe("₹101");
  });

  it("formats large numbers correctly in Indian numbering without decimals", () => {
    expect(formatInr(100000)).toBe("₹1,00,000");
    expect(formatInr(27567.49)).toBe("₹27,567");
    expect(formatInr(27567.51)).toBe("₹27,568");
  });

  it("formats zero correctly", () => {
    expect(formatInr(0)).toBe("₹0");
  });
});
