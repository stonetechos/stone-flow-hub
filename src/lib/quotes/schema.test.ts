import { describe, expect, it } from "bun:test";
import { quoteItemInputSchema } from "./schema";
import { zHsn } from "@/lib/zod";

describe("zHsn validation", () => {
  it("accepts 4-digit HSN", () => {
    expect(zHsn.parse("6802")).toBe("6802");
  });

  it("accepts 6-digit HSN", () => {
    expect(zHsn.parse("680221")).toBe("680221");
  });

  it("accepts 8-digit HSN", () => {
    expect(zHsn.parse("68022190")).toBe("68022190");
  });

  it("normalizes and trims whitespace", () => {
    expect(zHsn.parse("  68022190  ")).toBe("68022190");
  });

  it("treats empty string as null (optional)", () => {
    expect(zHsn.parse("")).toBeNull();
    expect(zHsn.parse("   ")).toBeNull();
    expect(zHsn.parse(null)).toBeNull();
    expect(zHsn.parse(undefined)).toBeUndefined();
  });

  it("rejects non-digit characters", () => {
    expect(() => zHsn.parse("6802AB")).toThrow();
  });

  it("rejects less than 4 digits when present", () => {
    expect(() => zHsn.parse("680")).toThrow();
  });

  it("rejects more than 8 digits", () => {
    expect(() => zHsn.parse("680221901")).toThrow();
  });
});

describe("quoteItemInputSchema with hsn_sac", () => {
  it("accepts quote item with 4-digit or 8-digit HSN", () => {
    const res4 = quoteItemInputSchema.parse({
      description: "Mint Sandstone",
      quantity: 10,
      unit_price: 120,
      hsn_sac: "6802",
    });
    expect(res4.hsn_sac).toBe("6802");

    const res8 = quoteItemInputSchema.parse({
      description: "Mint Sandstone",
      quantity: 10,
      unit_price: 120,
      hsn_sac: "68022190",
    });
    expect(res8.hsn_sac).toBe("68022190");
  });

  it("accepts quote item with omitted or empty HSN", () => {
    const resEmpty = quoteItemInputSchema.parse({
      description: "Mint Sandstone",
      quantity: 10,
      unit_price: 120,
      hsn_sac: "",
    });
    expect(resEmpty.hsn_sac).toBeNull();

    const resOmitted = quoteItemInputSchema.parse({
      description: "Mint Sandstone",
      quantity: 10,
      unit_price: 120,
    });
    expect(resOmitted.hsn_sac).toBeUndefined();
  });
});
