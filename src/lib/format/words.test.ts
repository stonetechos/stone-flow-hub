import { describe, it, expect } from "bun:test";
import { amountToIndianWords } from "./words";

describe("amountToIndianWords", () => {
  it("converts 14,700 matching Zoho quote example", () => {
    expect(amountToIndianWords(14700)).toBe("Rupees Fourteen Thousand Seven Hundred Only");
  });

  it("converts 24,200 matching Zoho invoice example", () => {
    expect(amountToIndianWords(24200)).toBe("Rupees Twenty-Four Thousand Two Hundred Only");
  });

  it("converts lakhs correctly", () => {
    expect(amountToIndianWords(125670)).toBe(
      "Rupees One Lakh Twenty-Five Thousand Six Hundred Seventy Only",
    );
  });

  it("handles zero", () => {
    expect(amountToIndianWords(0)).toBe("Rupees Zero Only");
  });

  it("handles paise", () => {
    expect(amountToIndianWords(14700.5)).toBe(
      "Rupees Fourteen Thousand Seven Hundred and Fifty Paise Only",
    );
  });
});
