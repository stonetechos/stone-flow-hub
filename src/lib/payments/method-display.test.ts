import { describe, expect, it } from "bun:test";
import {
  formatPaymentMethodDisplay,
  getPaymentAccountCategory,
  getPaymentMethodBadgeClass,
} from "./method-display";

describe("method-display", () => {
  describe("getPaymentAccountCategory", () => {
    it("identifies UPI Personal - Rishi via method or account_used", () => {
      expect(getPaymentAccountCategory({ method: "upi_rishi" })).toBe("upi_rishi");
      expect(
        getPaymentAccountCategory({
          method: "upi_personal",
          account_used: "Personal UPI - Rishi",
        }),
      ).toBe("upi_rishi");
      expect(
        getPaymentAccountCategory({
          method: "upi_personal",
          notes: "Transferred to Rishi account",
        }),
      ).toBe("upi_rishi");
    });

    it("identifies UPI Personal - Raman via method or account_used", () => {
      expect(getPaymentAccountCategory({ method: "upi_raman" })).toBe("upi_raman");
      expect(
        getPaymentAccountCategory({
          method: "upi_personal",
          account_used: "Personal UPI - Raman",
        }),
      ).toBe("upi_raman");
      expect(
        getPaymentAccountCategory({
          method: "upi_personal",
          notes: "Account: Personal UPI - Raman",
        }),
      ).toBe("upi_raman");
    });

    it("identifies BOB Current Account across UPI and Bank Transfer variants", () => {
      expect(getPaymentAccountCategory({ method: "upi_bob_current" })).toBe("bob_current");
      expect(getPaymentAccountCategory({ method: "upi_stone_tech" })).toBe("bob_current");
      expect(getPaymentAccountCategory({ method: "current_bob" })).toBe("bob_current");
      expect(getPaymentAccountCategory({ method: "bank_transfer" })).toBe("bob_current");
      expect(getPaymentAccountCategory({ method: "neft" })).toBe("bob_current");
      expect(
        getPaymentAccountCategory({
          method: "other",
          bank_name: "Bank of Baroda",
        }),
      ).toBe("bob_current");
    });

    it("identifies Cash payments", () => {
      expect(getPaymentAccountCategory({ method: "cash" })).toBe("cash");
      expect(getPaymentAccountCategory({ account_used: "Cash Counter" })).toBe("cash");
    });
  });

  describe("formatPaymentMethodDisplay", () => {
    it("formats Rishi payments cleanly", () => {
      expect(
        formatPaymentMethodDisplay({
          method: "upi_personal",
          account_used: "Personal UPI - Rishi",
        }),
      ).toBe("UPI Personal - Rishi");
      expect(formatPaymentMethodDisplay({ method: "upi_rishi" })).toBe("UPI Personal - Rishi");
    });

    it("formats Raman payments cleanly", () => {
      expect(
        formatPaymentMethodDisplay({
          method: "upi_personal",
          account_used: "Personal UPI - Raman",
        }),
      ).toBe("UPI Personal - Raman");
      expect(formatPaymentMethodDisplay({ method: "upi_raman" })).toBe("UPI Personal - Raman");
    });

    it("formats BOB Current UPI vs Bank Transfer clearly", () => {
      expect(formatPaymentMethodDisplay({ method: "upi_bob_current" })).toBe("BOB Current (UPI)");
      expect(formatPaymentMethodDisplay({ method: "bank_transfer" })).toBe(
        "BOB Current (Bank Transfer)",
      );
    });

    it("formats Cash and Cheque clearly", () => {
      expect(formatPaymentMethodDisplay({ method: "cash" })).toBe("Cash");
      expect(formatPaymentMethodDisplay({ method: "cheque" })).toBe("Cheque");
    });
  });

  describe("getPaymentMethodBadgeClass", () => {
    it("returns thematic styling per category", () => {
      expect(getPaymentMethodBadgeClass("upi_rishi")).toContain("sky");
      expect(getPaymentMethodBadgeClass("upi_raman")).toContain("indigo");
      expect(getPaymentMethodBadgeClass("bob_current")).toContain("emerald");
      expect(getPaymentMethodBadgeClass("cash")).toContain("amber");
    });
  });
});
