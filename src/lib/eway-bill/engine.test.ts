import { describe, expect, it } from "bun:test";
import {
  isValidEWayBillNo,
  normalizeVehicleNo,
  calculateEWayBillValidity,
  estimateDistanceKm,
  generateStosEWayBillNo,
  generateNicEwayBillJson,
} from "./engine";
import type { EWayBillDetails } from "./types";

describe("E-Way Bill Engine - Validation & Formatting", () => {
  it("validates 12-digit e-way bill number", () => {
    expect(isValidEWayBillNo("181234567890")).toBe(true);
    expect(isValidEWayBillNo("1812 3456 7890")).toBe(true);
    expect(isValidEWayBillNo("1812-3456-7890")).toBe(true);

    expect(isValidEWayBillNo("12345")).toBe(false);
    expect(isValidEWayBillNo("1812345678901")).toBe(false);
    expect(isValidEWayBillNo("18123456789A")).toBe(false);
    expect(isValidEWayBillNo(null)).toBe(false);
  });

  it("normalizes vehicle registration number", () => {
    expect(normalizeVehicleNo("rj27ga1234")).toBe("RJ27-GA-1234");
    expect(normalizeVehicleNo("RJ 27 GA 1234")).toBe("RJ27-GA-1234");
    expect(normalizeVehicleNo("gj01xx9999")).toBe("GJ01-XX-9999");
    expect(normalizeVehicleNo("")).toBe("");
  });

  it("calculates validity according to GST regulations", () => {
    const baseDate = new Date("2026-10-31T10:00:00Z");

    // Regular cargo (1 day per 200 km)
    const shortTrip = calculateEWayBillValidity(50, "R", baseDate);
    expect(shortTrip.daysValid).toBe(1);

    const mediumTrip = calculateEWayBillValidity(250, "R", baseDate);
    expect(mediumTrip.daysValid).toBe(2);

    const longTrip = calculateEWayBillValidity(650, "R", baseDate);
    expect(longTrip.daysValid).toBe(4);

    // Over Dimensional Cargo (1 day per 20 km)
    const odcTrip = calculateEWayBillValidity(35, "O", baseDate);
    expect(odcTrip.daysValid).toBe(2);
  });

  it("estimates distance based on state destination", () => {
    expect(estimateDistanceKm("313001", "08")).toBe(50); // Rajasthan intra-state
    expect(estimateDistanceKm("313001", "24")).toBe(260); // Gujarat
    expect(estimateDistanceKm("313001", "27")).toBe(780); // Maharashtra
    expect(estimateDistanceKm("313001", "07")).toBe(660); // Delhi NCR
  });

  it("generates deterministic 12-digit STOS eway bill numbers", () => {
    const ewb = generateStosEWayBillNo();
    expect(ewb.length).toBe(12);
    expect(/^\d{12}$/.test(ewb)).toBe(true);
  });

  it("generates valid NIC bulk upload JSON structure", () => {
    const details: EWayBillDetails = {
      ewayBillNo: "181234567890",
      ewayBillDate: "2026-10-31T10:00:00Z",
      validUntil: "2026-11-02T23:59:59Z",
      partA: {
        fromGstin: "08AABCS9999Z1Z5",
        fromLegalName: "Stone Tech Architectural Stone Atelier",
        fromAddress1: "Sukher Industrial Area",
        fromPlace: "Udaipur",
        fromPincode: "313001",
        fromStateCode: "08",
        toGstin: "24AAACG1234A1Z9",
        toLegalName: "Gujarat Luxury Villa Project",
        toAddress1: "SG Highway, Bodakdev",
        toPlace: "Ahmedabad",
        toPincode: "380054",
        toStateCode: "24",
        docType: "INV",
        docNo: "INV-2627-000042",
        docDate: "2026-10-31",
        totalTaxableAmount: 150000,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 27000,
        cessAmount: 0,
        totalInvoiceValue: 177000,
        mainHsnCode: "6802",
      },
      partB: {
        transportMode: "1",
        approxDistanceKm: 260,
        transporterName: "Maruti Freight Carriers",
        transportDocNo: "LR-9988",
        vehicleNo: "RJ27-GA-1234",
        vehicleType: "R",
      },
      source: "portal_verified",
      status: "ACTIVE",
    };

    const json = generateNicEwayBillJson(details);
    expect(json.version).toBe("1.0.0421");
    expect(json.billLists.length).toBe(1);

    const bill = json.billLists[0];
    expect(bill.userGstin).toBe("08AABCS9999Z1Z5");
    expect(bill.docNo).toBe("INV-2627-000042");
    expect(bill.toGstin).toBe("24AAACG1234A1Z9");
    expect(bill.totInvValue).toBe(177000);
    expect(bill.vehicleNo).toBe("RJ27-GA-1234");
    expect(bill.itemList[0].hsnCode).toBe(6802);
  });
});
