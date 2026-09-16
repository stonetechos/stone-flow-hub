import { describe, expect, test } from "bun:test";
import { publicInquiryInputSchema, lookupCustomerInputSchema } from "./public-inquiry.functions";

describe("publicInquiryInputSchema", () => {
  const validPayload = {
    name: "Rajesh Sharma",
    country_code: "+91",
    whatsapp: "9876543210",
    email: "rajesh@example.com",
    city: "Jaipur",
    space_type: "Bungalow / Villa",
    required_date: "2026-10-01",
    selected_products: ["Stone Veneer", "Custom Stone Cladding"],
    plan_description: "Front elevation facade and living room accent wall",
    photos: [
      {
        name: "site_photo_1.jpg",
        dataUrl: "data:image/jpeg;base64,samplebase64data",
        size: 1024,
      },
    ],
  };

  test("successfully parses valid customer inquiry input with country code", () => {
    const result = publicInquiryInputSchema.parse(validPayload);
    expect(result.name).toBe("Rajesh Sharma");
    expect(result.country_code).toBe("+91");
    expect(result.whatsapp).toBe("9876543210");
    expect(result.selected_products).toHaveLength(2);
    expect(result.photos).toHaveLength(1);
    expect(result.required_date).toBe("2026-10-01");
  });

  test("defaults country_code to +91 if omitted", () => {
    const withoutCode = { ...validPayload };
    delete (withoutCode as Record<string, unknown>).country_code;
    const result = publicInquiryInputSchema.parse(withoutCode);
    expect(result.country_code).toBe("+91");
  });

  test("accepts international country codes such as +971 (UAE)", () => {
    const uaePayload = {
      ...validPayload,
      country_code: "+971",
      whatsapp: "501234567",
      city: "Dubai",
    };
    const result = publicInquiryInputSchema.parse(uaePayload);
    expect(result.country_code).toBe("+971");
    expect(result.whatsapp).toBe("501234567");
    expect(result.city).toBe("Dubai");
  });

  test("allows empty email or trims whitespace", () => {
    const withoutEmail = { ...validPayload, email: "" };
    const result = publicInquiryInputSchema.parse(withoutEmail);
    expect(result.email).toBe("");
  });

  test("rejects invalid email address format", () => {
    const invalidEmail = { ...validPayload, email: "invalid-email-string" };
    expect(() => publicInquiryInputSchema.parse(invalidEmail)).toThrow();
  });

  test("rejects names shorter than 2 characters", () => {
    const shortName = { ...validPayload, name: "A" };
    expect(() => publicInquiryInputSchema.parse(shortName)).toThrow(/at least 2 characters/);
  });

  test("rejects WhatsApp numbers shorter than 7 digits", () => {
    const shortPhone = { ...validPayload, whatsapp: "1234" };
    expect(() => publicInquiryInputSchema.parse(shortPhone)).toThrow();
  });

  test("rejects missing required date", () => {
    const missingDate = { ...validPayload, required_date: "" };
    expect(() => publicInquiryInputSchema.parse(missingDate)).toThrow();
  });

  test("rejects more than 10 photos", () => {
    const elevenPhotos = Array.from({ length: 11 }).map((_, i) => ({
      name: `photo_${i}.jpg`,
      dataUrl: "data:image/jpeg;base64,xyz",
    }));

    const excessPhotos = { ...validPayload, photos: elevenPhotos };
    expect(() => publicInquiryInputSchema.parse(excessPhotos)).toThrow(/maximum of 10 photos/);
  });
});

describe("lookupCustomerInputSchema", () => {
  test("validates phone number lookup input", () => {
    const result = lookupCustomerInputSchema.parse({
      country_code: "+91",
      whatsapp: "9876543210",
    });
    expect(result.whatsapp).toBe("9876543210");
    expect(result.country_code).toBe("+91");
  });

  test("rejects very short search numbers", () => {
    expect(() =>
      lookupCustomerInputSchema.parse({
        whatsapp: "123",
      }),
    ).toThrow();
  });
});
