import { describe, expect, it } from "bun:test";
import {
  buildWhatsappAppUrl,
  buildWhatsappUrl,
  buildWhatsappWaMeUrl,
  buildWhatsappWebUrl,
  getWhatsappModePreference,
  normalizeWhatsappPhone,
  openWhatsappToContact,
  setWhatsappModePreference,
} from "./whatsapp";

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

  it("builds whatsapp:// desktop app URL", () => {
    const url = buildWhatsappAppUrl("9876543210", "Payment Receipt — RCT-001\nAmount: ₹10,000");
    expect(url).toContain("whatsapp://send?phone=919876543210&text=");
    expect(url).toContain("Payment%20Receipt");
    expect(url).toContain("%E2%82%B910%2C000");
  });

  it("builds direct WhatsApp Web URL", () => {
    const url = buildWhatsappWebUrl("9876543210", "Quotation Q-101");
    expect(url).toContain(
      "https://web.whatsapp.com/send?phone=919876543210&text=Quotation%20Q-101",
    );
  });

  it("builds standard wa.me link", () => {
    const url = buildWhatsappWaMeUrl("9876543210", "Invoice INV-001");
    expect(url).toContain("https://wa.me/919876543210?text=Invoice%20INV-001");
  });

  it("builds correct URL according to mode parameter", () => {
    expect(buildWhatsappUrl("9876543210", "Test", "app")).toContain(
      "whatsapp://send?phone=919876543210",
    );
    expect(buildWhatsappUrl("9876543210", "Test", "web")).toContain(
      "https://web.whatsapp.com/send?phone=919876543210",
    );
    expect(buildWhatsappUrl("9876543210", "Test", "wa.me")).toContain("https://wa.me/919876543210");
  });

  it("persists and reads WhatsApp mode preference", () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };

    setWhatsappModePreference("web");
    expect(getWhatsappModePreference()).toBe("web");
    setWhatsappModePreference("app");
    expect(getWhatsappModePreference()).toBe("app");
  });

  it("handles targetWindow in openWhatsappToContact for web mode", () => {
    const mockWindow = {
      closed: false,
      location: { href: "" },
      focus: () => {},
    };
    const res = openWhatsappToContact("9876543210", "Hello", mockWindow as never, { mode: "web" });
    expect(res).toBe(true);
    expect(mockWindow.location.href).toContain(
      "https://web.whatsapp.com/send?phone=919876543210&text=Hello",
    );
  });

  it("handles targetWindow in openWhatsappToContact for wa.me mode", () => {
    const mockWindow = {
      closed: false,
      location: { href: "" },
      focus: () => {},
    };
    const res = openWhatsappToContact("9876543210", "Hello", mockWindow as never, {
      mode: "wa.me",
    });
    expect(res).toBe(true);
    expect(mockWindow.location.href).toContain("https://wa.me/919876543210?text=Hello");
  });
});
