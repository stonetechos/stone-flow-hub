import { describe, expect, test } from "bun:test";
import {
  parsePhoneWithCountry,
  formatPhoneWithCountry,
  COMMON_COUNTRIES,
} from "./CountryCodeSelect";

describe("CountryCodeSelect & phone utilities", () => {
  test("Malawi (+265) exists in COMMON_COUNTRIES", () => {
    const malawi = COMMON_COUNTRIES.find((c) => c.code === "+265");
    expect(malawi).toBeDefined();
    expect(malawi?.name).toBe("Malawi");
    expect(malawi?.flag).toBe("🇲🇼");
  });

  test("parses international phone with country code e.g. Malawi +265995429998", () => {
    const parsed = parsePhoneWithCountry("+265995429998");
    expect(parsed.countryCode).toBe("+265");
    expect(parsed.localNumber).toBe("995429998");
  });

  test("parses Malawi number without plus e.g. 265995429998", () => {
    const parsed = parsePhoneWithCountry("265995429998");
    expect(parsed.countryCode).toBe("+265");
    expect(parsed.localNumber).toBe("995429998");
  });

  test("parses standard Indian 10-digit number", () => {
    const parsed = parsePhoneWithCountry("9876543210");
    expect(parsed.countryCode).toBe("+91");
    expect(parsed.localNumber).toBe("9876543210");
  });

  test("never misidentifies Indian 94 series (e.g. 9427045020) as Sri Lanka (+94)", () => {
    const parsed = parsePhoneWithCountry("9427045020");
    expect(parsed.countryCode).toBe("+91");
    expect(parsed.localNumber).toBe("9427045020");
  });

  test("never misidentifies Indian 97 series as Qatar (+974) or UAE (+971)", () => {
    const parsed = parsePhoneWithCountry("9727045020");
    expect(parsed.countryCode).toBe("+91");
    expect(parsed.localNumber).toBe("9727045020");
  });

  test("only identifies Sri Lanka when explicit +94 prefix is provided", () => {
    const parsed = parsePhoneWithCountry("+9427045020");
    expect(parsed.countryCode).toBe("+94");
    expect(parsed.localNumber).toBe("27045020");
  });

  test("parses Indian number with +91", () => {
    const parsed = parsePhoneWithCountry("+919876543210");
    expect(parsed.countryCode).toBe("+91");
    expect(parsed.localNumber).toBe("9876543210");
  });

  test("parses US number with +1", () => {
    const parsed = parsePhoneWithCountry("+14155552671");
    expect(parsed.countryCode).toBe("+1");
    expect(parsed.localNumber).toBe("4155552671");
  });

  test("formats +265 with local digits as +265995429998", () => {
    const formatted = formatPhoneWithCountry("+265", "995429998");
    expect(formatted).toBe("+265995429998");
  });

  test("formats +91 with 10 digits as 10 digits without prefix", () => {
    const formatted = formatPhoneWithCountry("+91", "9876543210");
    expect(formatted).toBe("9876543210");
  });

  test("formats empty string safely", () => {
    expect(formatPhoneWithCountry("+265", "")).toBe("");
    expect(formatPhoneWithCountry("+91", "")).toBe("");
    expect(parsePhoneWithCountry("")).toEqual({ countryCode: "+91", localNumber: "" });
  });
});
