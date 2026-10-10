import { describe, expect, test } from "bun:test";
import { parseVoiceCustomer } from "./voice-parser";

describe("parseVoiceCustomer", () => {
  test("extracts name, phone, city, and material from single spoken sentence", () => {
    const res = parseVoiceCustomer(
      "Customer Ramesh Patel from Ahmedabad, mobile 9876543210, looking for Mint Stone",
    );
    expect(res.name).toBe("Ramesh Patel");
    expect(res.mobile).toBe("9876543210");
    expect(res.city).toBe("Ahmedabad");
    expect(res.material_interests).toContain("natural_stone_cladding_tiles");
    expect(res.confidenceFields).toContain("mobile");
    expect(res.rawTranscript).toContain("Ramesh Patel");
  });

  test("extracts firm name and contact person separately", () => {
    const res = parseVoiceCustomer(
      "Add customer from ABC Constructions, contact person Rajesh Gupta, phone 9825123456, architect from Surat",
    );
    expect(res.company_name).toBe("ABC Constructions");
    expect(res.contact_person).toBe("Rajesh Gupta");
    expect(res.mobile).toBe("9825123456");
    expect(res.city).toBe("Surat");
    expect(res.customer_type).toBe("architect");
    expect(res.recommendedReflectionMode).toBe("combined");
  });

  test("handles spaces inside phone number", () => {
    const res = parseVoiceCustomer(
      "New customer Anita Sharma, mobile 98 25 01 23 45, Vadodara, builder",
    );
    expect(res.name).toBe("Anita Sharma");
    expect(res.mobile).toBe("9825012345");
    expect(res.city).toBe("Vadodara");
    expect(res.customer_type).toBe("b2b");
  });

  test("detects multiple stone materials mentioned", () => {
    const res = parseVoiceCustomer(
      "Customer Priya, phone 9123456789, interested in Kadappa and Italian Marble",
    );
    expect(res.mobile).toBe("9123456789");
    expect(res.material_interests).toContain("natural_stone_cladding_tiles");
    expect(res.material_interests).toContain("custom_flooring");
  });
});
