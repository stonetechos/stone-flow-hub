import { describe, expect, it } from "bun:test";
import {
  isMissingCustomerColumnError,
  normalizeCustomerRow,
  prepareCustomerExternalRef,
  stripMissingCustomerColumns,
} from "./normalize";

describe("Customer normalization helpers", () => {
  it("extracts company_name and contact_person from external_ref when columns are null", () => {
    const raw: {
      id: string;
      name: string;
      company_name?: string | null;
      contact_person?: string | null;
      external_ref?: Record<string, unknown> | null;
    } = {
      id: "cus-1",
      name: "Lokesh Kumawat",
      company_name: null,
      contact_person: null,
      external_ref: {
        company_name: "ABC Developers LLP",
        contact_person: "Ramesh Patel",
      },
    };

    const normalized = normalizeCustomerRow(raw);
    expect(normalized.company_name).toBe("ABC Developers LLP");
    expect(normalized.contact_person).toBe("Ramesh Patel");
  });

  it("preserves dedicated column values if present", () => {
    const raw: {
      id: string;
      name: string;
      company_name?: string | null;
      contact_person?: string | null;
      external_ref?: Record<string, unknown> | null;
    } = {
      id: "cus-2",
      name: "Lokesh Kumawat",
      company_name: "Prestige Stone LLP",
      contact_person: "Vijay Sharma",
      external_ref: {
        company_name: "Old Name",
        contact_person: "Old Person",
      },
    };

    const normalized = normalizeCustomerRow(raw);
    expect(normalized.company_name).toBe("Prestige Stone LLP");
    expect(normalized.contact_person).toBe("Vijay Sharma");
  });

  it("handles null or missing external_ref gracefully", () => {
    const raw: {
      id: string;
      name: string;
      company_name?: string | null;
      contact_person?: string | null;
      external_ref?: Record<string, unknown> | null;
    } = {
      id: "cus-3",
      name: "Individual Client",
      company_name: null,
      contact_person: null,
      external_ref: null,
    };

    const normalized = normalizeCustomerRow(raw);
    expect(normalized.company_name).toBe(null);
    expect(normalized.contact_person).toBe(null);
  });

  it("returns null when passed null or undefined row", () => {
    expect(normalizeCustomerRow(null)).toBe(null);
    expect(normalizeCustomerRow(undefined)).toBe(null);
  });

  it("detects schema cache missing column error messages", () => {
    const err = {
      message: "Could not find the 'company_name' column of 'customers' in the schema cache",
    };
    expect(isMissingCustomerColumnError(err)).toBe(true);
  });

  it("detects postgres 42703 column does not exist error", () => {
    const err = {
      code: "42703",
      message: "column customers.company_name does not exist",
    };
    expect(isMissingCustomerColumnError(err)).toBe(true);
  });

  it("merges company_name and contact_person into existing external_ref", () => {
    const existing = { previous_ref: "REF123", custom_tag: "VIP" };
    const merged = prepareCustomerExternalRef(existing, {
      company_name: "Marvel Granite",
      contact_person: "Ashok",
    });
    expect(merged).toEqual({
      previous_ref: "REF123",
      custom_tag: "VIP",
      company_name: "Marvel Granite",
      contact_person: "Ashok",
    });
  });

  it("strips company_name and contact_person from top-level payload", () => {
    const payload = {
      name: "John Doe",
      company_name: "Doe Enterprises",
      contact_person: "Jane",
      city: "Udaipur",
    };
    const stripped = stripMissingCustomerColumns(payload);
    expect(stripped).toEqual({
      name: "John Doe",
      city: "Udaipur",
    });
    expect("company_name" in stripped).toBe(false);
    expect("contact_person" in stripped).toBe(false);
  });
});
