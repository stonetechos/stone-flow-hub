import { describe, it, expect } from "bun:test";
import {
  calculateVendorDeliveryDays,
  buildVendorDeliveryPromptWhatsappMessage,
} from "./delivery-prompts";

describe("Vendor Delivery Proximity Prompts", () => {
  const refDate = new Date("2026-10-14T10:00:00.000Z");

  describe("calculateVendorDeliveryDays", () => {
    it("identifies 5 days remaining and calculates 4 days (1 day less) for vendor", () => {
      const res = calculateVendorDeliveryDays("2026-10-19", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBe(5);
      expect(res?.vendorDays).toBe(4);
      expect(res?.isPromptDue).toBe(true);
      expect(res?.vendorDaysText).toBe("4 days");
    });

    it("identifies 4 days remaining and calculates 3 days for vendor", () => {
      const res = calculateVendorDeliveryDays("2026-10-18", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBe(4);
      expect(res?.vendorDays).toBe(3);
      expect(res?.isPromptDue).toBe(true);
      expect(res?.vendorDaysText).toBe("3 days");
    });

    it("identifies 2 days remaining and calculates 1 day for vendor", () => {
      const res = calculateVendorDeliveryDays("2026-10-16", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBe(2);
      expect(res?.vendorDays).toBe(1);
      expect(res?.isPromptDue).toBe(true);
      expect(res?.vendorDaysText).toBe("1 day");
    });

    it("identifies 1 day remaining with less than 24 hours text", () => {
      const res = calculateVendorDeliveryDays("2026-10-15", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBe(1);
      expect(res?.vendorDays).toBe(0);
      expect(res?.isPromptDue).toBe(true);
      expect(res?.vendorDaysText).toBe("less than 24 hours");
    });

    it("identifies 0 days remaining (due today)", () => {
      const res = calculateVendorDeliveryDays("2026-10-14", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBe(0);
      expect(res?.vendorDays).toBe(0);
      expect(res?.isPromptDue).toBe(true);
      expect(res?.vendorDaysText).toBe("today");
    });

    it("marks 6 days away as not due for prompt yet", () => {
      const res = calculateVendorDeliveryDays("2026-10-20", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBe(6);
      expect(res?.isPromptDue).toBe(false);
    });

    it("marks past due date as not within 0..5 day prompt window", () => {
      const res = calculateVendorDeliveryDays("2026-10-10", refDate);
      expect(res).not.toBeNull();
      expect(res?.actualDays).toBeLessThan(0);
      expect(res?.isPromptDue).toBe(false);
    });

    it("handles null or invalid dates gracefully", () => {
      expect(calculateVendorDeliveryDays(null, refDate)).toBeNull();
      expect(calculateVendorDeliveryDays(undefined, refDate)).toBeNull();
      expect(calculateVendorDeliveryDays("invalid-date", refDate)).toBeNull();
    });
  });

  describe("buildVendorDeliveryPromptWhatsappMessage", () => {
    it("creates standard WhatsApp message with product name and 1-day-less inquiry", () => {
      const msg = buildVendorDeliveryPromptWhatsappMessage({
        vendorName: "Shree Ganesh Marbles",
        orderNo: "SO-2026-089",
        productName: "Italian Statuario Marble Slab (20mm)",
        vendorDaysText: "4 days",
        formattedDueDate: "19 Oct 2026",
        projectName: "Villa Nirvana",
        customerName: "Rajesh Singhania",
      });

      expect(msg).toContain("Namaste Shree Ganesh Marbles,");
      expect(msg).toContain(
        "Regarding Order #SO-2026-089 for Italian Statuario Marble Slab (20mm):",
      );
      expect(msg).toContain(
        "Kindly share the status of this order, we have got 4 days to deliver it.",
      );
      expect(msg).toContain("• Product: Italian Statuario Marble Slab (20mm)");
      expect(msg).toContain("• Project: Villa Nirvana");
      expect(msg).toContain("• Client: Rajesh Singhania");
      expect(msg).toContain("• Target Delivery: 19 Oct 2026");
      expect(msg).toContain("Please confirm current fabrication and dispatch status");
    });

    it("handles 1 day remaining inquiry message correctly", () => {
      const msg = buildVendorDeliveryPromptWhatsappMessage({
        vendorName: "Apex Stone Works",
        orderNo: "PO-00452",
        productName: "Black Marquina Countertop",
        vendorDaysText: "1 day",
        formattedDueDate: "16 Oct 2026",
      });

      expect(msg).toContain("Namaste Apex Stone Works,");
      expect(msg).toContain("Regarding Order #PO-00452 for Black Marquina Countertop:");
      expect(msg).toContain(
        "Kindly share the status of this order, we have got 1 day to deliver it.",
      );
    });
  });
});
