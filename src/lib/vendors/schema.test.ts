import { describe, expect, it } from "bun:test";
import { vendorCreateSchema } from "./schema";
import { normalizeMobile } from "@/lib/zod";

describe("vendorCreateSchema optional mobile", () => {
  it("allows supplier / agency creation without mobile", () => {
    const parsed = vendorCreateSchema.parse({
      company_name: "Makrana Marble Works",
      contact_name: "Mukesh Bhai",
    });

    expect(parsed.company_name).toBe("Makrana Marble Works");
    expect(parsed.contact_name).toBe("Mukesh Bhai");
    expect(parsed.mobile ?? null).toBeNull();
  });

  it("allows supplier / agency creation with empty string mobile", () => {
    const parsed = vendorCreateSchema.parse({
      company_name: "Shree Ram Carting Agency",
      contact_name: "Rajesh Bhai",
      mobile: "",
      partner_category: "transport_partner",
    });

    expect(parsed.company_name).toBe("Shree Ram Carting Agency");
    expect(parsed.contact_name).toBe("Rajesh Bhai");
    expect(parsed.mobile).toBeNull();
    expect(parsed.partner_category).toBe("transport_partner");
  });

  it("allows supplier / agency creation with null mobile", () => {
    const parsed = vendorCreateSchema.parse({
      company_name: "Somnath Stone Art Agency",
      contact_name: "Dinesh Sompura",
      mobile: null,
      partner_category: "artwork_partner",
    });

    expect(parsed.mobile).toBeNull();
  });

  it("validates mobile number when valid number is provided", () => {
    const parsed = vendorCreateSchema.parse({
      company_name: "Kishangarh Granite Hub",
      contact_name: "Pravin Bhai",
      mobile: "9876543210",
    });

    expect(parsed.mobile).toBe("9876543210");
  });

  it("rejects invalid mobile number format when non-empty string is provided", () => {
    const result = vendorCreateSchema.safeParse({
      company_name: "Kishangarh Granite Hub",
      contact_name: "Pravin Bhai",
      mobile: "123", // too short
    });

    expect(result.success).toBe(false);
  });

  it("normalizes empty or null mobile gracefully without crashing", () => {
    expect(normalizeMobile("")).toBe("");
    expect(normalizeMobile(null)).toBe("");
    expect(normalizeMobile(undefined)).toBe("");
    expect(normalizeMobile("+91 98765-43210")).toBe("9876543210");
  });
});
