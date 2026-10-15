import { describe, expect, it } from "bun:test";
import {
  vendorPaymentCreateSchema,
  vendorPaymentUpdateSchema,
  VENDOR_PAYMENT_TYPES,
  VENDOR_PAYMENT_METHODS,
} from "./schema";

describe("Vendor Payment Schemas", () => {
  const validVendorId = "123e4567-e89b-12d3-a456-426614174000";

  it("validates valid vendorPaymentCreateSchema", () => {
    const input = {
      vendor_id: validVendorId,
      payment_type: "part" as const,
      amount: 4725,
      currency_code: "INR",
      method: "bank_transfer" as const,
      reference_no: "UTR987654321",
      paid_at: "2026-10-15",
      notes: "Part payment against PO",
    };
    const parsed = vendorPaymentCreateSchema.parse(input);
    expect(parsed.amount).toBe(4725);
    expect(parsed.vendor_id).toBe(validVendorId);
    expect(parsed.payment_type).toBe("part");
  });

  it("fails vendorPaymentCreateSchema when amount is 0 or negative", () => {
    const input = {
      vendor_id: validVendorId,
      payment_type: "part" as const,
      amount: 0,
      paid_at: "2026-10-15",
    };
    expect(() => vendorPaymentCreateSchema.parse(input)).toThrow();
  });

  it("validates vendorPaymentUpdateSchema with modified amount and method", () => {
    const input = {
      vendor_id: validVendorId,
      payment_type: "full" as const,
      amount: 10000,
      currency_code: "INR",
      method: "upi_manual" as const,
      reference_no: "UPI-TRANS-12345",
      paid_at: "2026-10-16",
      notes: "Updated payment details",
    };
    const parsed = vendorPaymentUpdateSchema.parse(input);
    expect(parsed.amount).toBe(10000);
    expect(parsed.payment_type).toBe("full");
    expect(parsed.method).toBe("upi_manual");
  });

  it("supports all declared vendor payment types and methods", () => {
    expect(VENDOR_PAYMENT_TYPES).toContain("advance");
    expect(VENDOR_PAYMENT_TYPES).toContain("part");
    expect(VENDOR_PAYMENT_TYPES).toContain("full");
    expect(VENDOR_PAYMENT_TYPES).toContain("retention");
    expect(VENDOR_PAYMENT_TYPES).toContain("credit_note");

    expect(VENDOR_PAYMENT_METHODS).toContain("bank_transfer");
    expect(VENDOR_PAYMENT_METHODS).toContain("neft");
    expect(VENDOR_PAYMENT_METHODS).toContain("rtgs");
    expect(VENDOR_PAYMENT_METHODS).toContain("imps");
    expect(VENDOR_PAYMENT_METHODS).toContain("upi_manual");
    expect(VENDOR_PAYMENT_METHODS).toContain("cheque");
    expect(VENDOR_PAYMENT_METHODS).toContain("cash");
  });
});
