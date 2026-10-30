import { describe, expect, it } from "bun:test";
import {
  detectVendorPartnerCategory,
  vendorToAssociatedPerson,
  installationAgencyToAssociatedPerson,
  cartingAgencyToAssociatedPerson,
  PARTNER_CATEGORIES,
} from "./directory";
import type { VendorRow } from "@/lib/vendors/api";
import type { InstallationAgencyRow } from "@/lib/installation-agencies/api";
import type { CartingAgencyRow } from "@/lib/purchase-transportation/api";

describe("Work & Supply Directory - Partner Category Detection", () => {
  it("detects explicit partner_category stored in external_ref", () => {
    const vendor = {
      id: "v-1",
      vendor_code: "V001",
      company_name: "Shiv Marble & Granites",
      external_ref: { partner_category: "chemical_partner" },
    } as unknown as VendorRow;

    expect(detectVendorPartnerCategory(vendor)).toBe("chemical_partner");
  });

  it("detects chemical partner by product name keywords or company name", () => {
    const adhesiveVendor = {
      id: "v-2",
      vendor_code: "V002",
      company_name: "Tenax India Bonding Solutions",
      notes: "Adhesives & sealers",
    } as unknown as VendorRow;

    expect(detectVendorPartnerCategory(adhesiveVendor)).toBe("chemical_partner");

    const sealerVendor = {
      id: "v-3",
      vendor_code: "V003",
      company_name: "Pure Cleaners",
      notes: "Stone sealers & impregnators",
    } as unknown as VendorRow;

    expect(detectVendorPartnerCategory(sealerVendor)).toBe("chemical_partner");
  });

  it("detects artwork partner by mural/carving/handcraft keywords", () => {
    const muralVendor = {
      id: "v-4",
      vendor_code: "V004",
      company_name: "Sompura Temple Art Studio",
      notes: "Handcrafted stone murals and mandir carvings",
    } as unknown as VendorRow;

    expect(detectVendorPartnerCategory(muralVendor)).toBe("artwork_partner");
  });

  it("detects application partner by installation/cladding keywords", () => {
    const installVendor = {
      id: "v-5",
      vendor_code: "V005",
      company_name: "Gujarat Cladding & Flooring Masters",
      notes: "Dry cladding mechanical installation",
    } as unknown as VendorRow;

    expect(detectVendorPartnerCategory(installVendor)).toBe("application_partner");
  });

  it("defaults to supplying_partner for stone quarries and traders", () => {
    const stoneVendor = {
      id: "v-6",
      vendor_code: "V006",
      company_name: "Makrana White Marble Quarry",
      notes: "Pure marble block and slab supply",
    } as unknown as VendorRow;

    expect(detectVendorPartnerCategory(stoneVendor)).toBe("supplying_partner");
  });
});

describe("Work & Supply Directory - Person Normalization", () => {
  it("normalizes a vendor row to AssociatedPerson", () => {
    const vendor = {
      id: "v-10",
      vendor_code: "V010",
      company_name: "Kishangarh Slabs Pvt Ltd",
      contact_person: "Rajesh Sharma",
      mobile_number: "9876543210",
      city: "Kishangarh",
      notes: "Granite slabs",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    } as unknown as VendorRow;

    const person = vendorToAssociatedPerson(vendor);
    expect(person.id).toBe("v-10");
    expect(person.sourceType).toBe("vendor");
    expect(person.name).toBe("Kishangarh Slabs Pvt Ltd");
    expect(person.contactPerson).toBe("Rajesh Sharma");
    expect(person.phone).toBe("9876543210");
    expect(person.category).toBe("supplying_partner");
    expect(person.categoryLabel).toBe(PARTNER_CATEGORIES.supplying_partner.singular);
    expect(person.city).toBe("Kishangarh");
    expect(person.linkUrl).toBe("/vendors/v-10");
  });

  it("normalizes an installation agency row to AssociatedPerson", () => {
    const agency = {
      id: "agency-1",
      code: "AGY-01",
      name: "Apex Stone Cladding Team",
      contact_person: "Vikram Singh",
      phone: "9123456789",
      skills: ["Dry Cladding", "CNC Flooring"],
      daily_rate: 1500,
      lead_time_days: 2,
      is_active: true,
      sort_order: 1,
      notes: null,
    } as unknown as InstallationAgencyRow & { skills?: string[] };

    const person = installationAgencyToAssociatedPerson(agency);
    expect(person.id).toBe("agency-1");
    expect(person.sourceType).toBe("installation_agency");
    expect(person.name).toBe("Apex Stone Cladding Team");
    expect(person.contactPerson).toBe("Vikram Singh");
    expect(person.phone).toBe("9123456789");
    expect(person.category).toBe("application_partner");
    expect(person.categoryLabel).toBe(PARTNER_CATEGORIES.application_partner.singular);
    expect(person.skills).toContain("Dry Cladding");
    expect(person.linkUrl).toBe("/installation-ledger/agency-1");
  });

  it("normalizes a carting agency row to AssociatedPerson", () => {
    const carting = {
      id: "carting-1",
      code: "TRK-01",
      name: "Maruti Freight Carriers",
      contact_person: "Baldev Bhai",
      phone: "9988776655",
      vehicle_type: "14-Wheeler Trailer",
      vehicle_no: "RJ27-GA-1234",
      is_active: true,
      sort_order: 1,
      notes: null,
    } as unknown as CartingAgencyRow & { vehicle_no?: string };

    const person = cartingAgencyToAssociatedPerson(carting);
    expect(person.id).toBe("carting-1");
    expect(person.sourceType).toBe("carting_agency");
    expect(person.name).toBe("Maruti Freight Carriers");
    expect(person.contactPerson).toBe("Baldev Bhai");
    expect(person.phone).toBe("9988776655");
    expect(person.category).toBe("transport_partner");
    expect(person.categoryLabel).toBe(PARTNER_CATEGORIES.transport_partner.singular);
    expect(person.skills).toContain("14-Wheeler Trailer");
    expect(person.skills).toContain("Reg #RJ27-GA-1234");
    expect(person.linkUrl).toBe("/local-carting");
  });
});
