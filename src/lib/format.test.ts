import { describe, expect, it } from "bun:test";
import { formatInr, formatDisplayDate, formatDate, toIndicDigits, toEnglishDigits } from "./format";

describe("toIndicDigits & toEnglishDigits", () => {
  it("converts digits to Gujarati and back to English", () => {
    const gu = toIndicDigits("2026-11-05", "gu");
    expect(gu).toBe("૨૦૨૬-૧૧-૦૫");
    expect(toEnglishDigits(gu)).toBe("2026-11-05");
  });

  it("converts digits to Devanagari Hindi and back to English", () => {
    const hi = toIndicDigits("2026-11-05", "hi");
    expect(hi).toBe("२०२६-११-०५");
    expect(toEnglishDigits(hi)).toBe("2026-11-05");
  });

  it("formats dates into localized Indian format with Indic digits", () => {
    expect(formatDate("2026-11-05", "gu")).toBe("૫/૧૧/૨૦૨૬");
    expect(formatDate("2026-11-05", "en")).toBe("5/11/2026");
  });
});

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

describe("formatDisplayDate", () => {
  it("formats YYYY-MM-DD strings to Indian business format without timezone shifts", () => {
    expect(formatDisplayDate("2026-10-20")).toBe("20 Oct 2026");
    expect(formatDisplayDate("2026-01-05")).toBe("05 Jan 2026");
  });

  it("handles null, undefined, and empty string", () => {
    expect(formatDisplayDate(null)).toBe("—");
    expect(formatDisplayDate(undefined)).toBe("—");
    expect(formatDisplayDate("")).toBe("—");
  });
});
