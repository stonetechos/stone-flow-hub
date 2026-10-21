import { describe, expect, it } from "bun:test";
import {
  getFinancialYearCode,
  formatInvoiceNumber,
  parseInvoiceNumber,
  calculateNextInvoiceNumber,
  canHardDeleteInvoice,
} from "./numbering";

describe("Invoice Financial Year & Numbering", () => {
  it("calculates Indian Financial Year code correctly across months", () => {
    // April 2026 -> FY 2026-27 -> 2627
    expect(getFinancialYearCode("2026-04-01")).toBe("2627");
    // October 2026 -> FY 2026-27 -> 2627
    expect(getFinancialYearCode("2026-10-22")).toBe("2627");
    // January 2027 -> FY 2026-27 -> 2627
    expect(getFinancialYearCode("2027-01-01")).toBe("2627");
    // March 31, 2027 -> FY 2026-27 -> 2627
    expect(getFinancialYearCode("2027-03-31")).toBe("2627");

    // April 1, 2027 -> FY 2027-28 -> 2728
    expect(getFinancialYearCode("2027-04-01")).toBe("2728");
    // January 2028 -> FY 2027-28 -> 2728
    expect(getFinancialYearCode("2028-01-15")).toBe("2728");
    // April 1, 2028 -> FY 2028-29 -> 2829
    expect(getFinancialYearCode("2028-04-01")).toBe("2829");
  });

  it("formats invoice number with 4-digit zero padding", () => {
    expect(formatInvoiceNumber("2627", 5)).toBe("INV-2627-0005");
    expect(formatInvoiceNumber("2728", 1)).toBe("INV-2728-0001");
    expect(formatInvoiceNumber("2627", 42)).toBe("INV-2627-0042");
    expect(formatInvoiceNumber("2627", 1000)).toBe("INV-2627-1000");
  });

  it("parses both FY format and legacy format invoice numbers", () => {
    const fy = parseInvoiceNumber("INV-2627-0005");
    expect(fy.isFyFormat).toBe(true);
    expect(fy.fyCode).toBe("2627");
    expect(fy.sequenceNumber).toBe(5);

    const legacy = parseInvoiceNumber("INV-000004");
    expect(legacy.isFyFormat).toBe(false);
    expect(legacy.sequenceNumber).toBe(4);
  });

  it("defaults next invoice in FY 2627 to INV-2627-0005 per user mandate", () => {
    // When no INV-2627-* invoices exist yet (or only legacy invoices 1-4)
    const existing = ["INV-000001", "INV-000002", "INV-000003", "INV-000004"];
    const next = calculateNextInvoiceNumber(existing, "2026-10-22");
    expect(next).toBe("INV-2627-0005");
  });

  it("increments sequentially when INV-2627-0005 exists", () => {
    const existing = ["INV-2627-0005"];
    const next = calculateNextInvoiceNumber(existing, "2026-10-22");
    expect(next).toBe("INV-2627-0006");
  });

  it("rewinds sequence number when the latest invoice is deleted", () => {
    // Scenario 1: User creates INV-2627-0005, then deletes it
    // Existing list before delete:
    const withFive = ["INV-2627-0005"];
    expect(calculateNextInvoiceNumber(withFive, "2026-10-22")).toBe("INV-2627-0006");

    // After user deletes INV-2627-0005:
    const afterDelete = [] as string[];
    expect(calculateNextInvoiceNumber(afterDelete, "2026-10-22")).toBe("INV-2627-0005");
  });

  it("starts at INV-2728-0001 for financial year 2027-28", () => {
    const existing = ["INV-2627-0005", "INV-2627-0006"];
    // In FY 27-28 (e.g. April 2027):
    const next = calculateNextInvoiceNumber(existing, "2027-04-15");
    expect(next).toBe("INV-2728-0001");
  });

  it("classifies latest invoice as hard-deletable and middle invoice as void-only", () => {
    const currentInvoices = ["INV-2627-0001", "INV-2627-0002", "INV-2627-0003"];

    // Deleting INV-2627-0003 (latest):
    const checkLatest = canHardDeleteInvoice("INV-2627-0003", currentInvoices);
    expect(checkLatest.canDelete).toBe(true);
    expect(checkLatest.higherInvoicesExist).toBe(false);

    // Deleting INV-2627-0002 (middle):
    const checkMiddle = canHardDeleteInvoice("INV-2627-0002", currentInvoices);
    expect(checkMiddle.canDelete).toBe(false);
    expect(checkMiddle.higherInvoicesExist).toBe(true);
  });
});
