import { describe, expect, it } from "bun:test";
import { buildWhatsappUrl, normalizeWhatsappPhone } from "./whatsapp";

describe("WhatsApp utilities", () => {
  it("normalizes 10-digit Indian mobile numbers with 91 prefix", () => {
    expect(normalizeWhatsappPhone("9876543210")).toBe("919876543210");
  });

  it("handles numbers with spaces, dashes, and + signs", () => {
    expect(normalizeWhatsappPhone("+91 98765-43210")).toBe("919876543210");
  });

  it("strips leading 0 from 11-digit numbers", () => {
    expect(normalizeWhatsappPhone("09876543210")).toBe("919876543210");
  });

  it("preserves already prefixed 12-digit numbers", () => {
    expect(normalizeWhatsappPhone("919876543210")).toBe("919876543210");
  });

  it("preserves international numbers", () => {
    expect(normalizeWhatsappPhone("+1 (415) 555-2671")).toBe("14155552671");
  });

  it("handles empty or null inputs", () => {
    expect(normalizeWhatsappPhone("")).toBe("");
    expect(normalizeWhatsappPhone(null)).toBe("");
    expect(normalizeWhatsappPhone(undefined)).toBe("");
  });

  it("builds correct wa.me link with encoded text", () => {
    const url = buildWhatsappUrl("9876543210", "Payment Receipt — RCT-001\nAmount: ₹10,000");
    expect(url).toContain("https://wa.me/919876543210?text=");
    expect(url).toContain("Payment%20Receipt");
    expect(url).toContain("%E2%82%B910%2C000");
  });

  it("falls back to api.whatsapp.com/send when phone is missing", () => {
    const url = buildWhatsappUrl("", "Receipt RCT-001");
    expect(url).toContain("https://api.whatsapp.com/send?text=Receipt%20RCT-001");
  });
});
