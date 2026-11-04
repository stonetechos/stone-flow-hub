import { describe, expect, test } from "bun:test";
import { sanitizePhonebookNumber } from "@/lib/customers/phonebook-sanitizer";

describe("Phonebook Directory Picker Sanitizer", () => {
  test("formats 10-digit Indian numbers directly", () => {
    expect(sanitizePhonebookNumber("9876543210")).toBe("9876543210");
  });

  test("strips spaces, hyphens, and parentheses", () => {
    expect(sanitizePhonebookNumber("(987) 654-3210")).toBe("9876543210");
    expect(sanitizePhonebookNumber("987 654 3210")).toBe("9876543210");
    expect(sanitizePhonebookNumber("987-654-3210")).toBe("9876543210");
  });

  test("removes Indian +91 or 91 country code prefix", () => {
    expect(sanitizePhonebookNumber("+91 9876543210")).toBe("9876543210");
    expect(sanitizePhonebookNumber("919876543210")).toBe("9876543210");
  });

  test("removes leading 0 prefix", () => {
    expect(sanitizePhonebookNumber("09876543210")).toBe("9876543210");
  });

  test("handles empty string gracefully", () => {
    expect(sanitizePhonebookNumber("")).toBe("");
  });
});
