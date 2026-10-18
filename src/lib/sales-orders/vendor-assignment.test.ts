import { describe, expect, it } from "bun:test";
import {
  parseItemFulfilment,
  parseItemVendorAssignment,
  serializeLiveStockAssignment,
  serializeStockLiftedAssignment,
  serializeItemVendorAssignment,
} from "./vendor-assignment";

describe("sales-orders/vendor-assignment", () => {
  it("parses unassigned / null fulfilment", () => {
    expect(parseItemFulfilment(null)).toEqual({ mode: "unassigned", label: "Unassigned" });
    expect(parseItemFulfilment(undefined)).toEqual({ mode: "unassigned", label: "Unassigned" });
    expect(parseItemFulfilment("")).toEqual({ mode: "unassigned", label: "Unassigned" });
    expect(parseItemVendorAssignment(null)).toBeNull();
  });

  it("parses simple keyword live_stock", () => {
    const res = parseItemFulfilment("live_stock");
    expect(res.mode).toBe("live_stock");
    expect(res.label).toBe("Live Stock (In-House Yard)");
    expect(parseItemVendorAssignment("live_stock")).toBeNull();
  });

  it("parses serialized live stock JSON", () => {
    const json = serializeLiveStockAssignment({ location: "Shed B" });
    const res = parseItemFulfilment(json);
    expect(res.mode).toBe("live_stock");
    expect(res.location).toBe("Shed B");
    expect(parseItemVendorAssignment(json)).toBeNull();
  });

  it("parses serialized stock lifted JSON", () => {
    const json = serializeStockLiftedAssignment({ location: "Yard Gate 1" });
    const res = parseItemFulfilment(json);
    expect(res.mode).toBe("stock_lifted");
    expect(res.location).toBe("Yard Gate 1");
    expect(parseItemVendorAssignment(json)).toBeNull();
  });

  it("parses vendor assignment and ignores live stock in parseItemVendorAssignment", () => {
    const vendorPayload = serializeItemVendorAssignment({
      vendor_id: "vend-123",
      vendor_name: "Makrana Marbles",
      advance_status: "paid",
      production_status: "in_fabrication",
      assigned_at: new Date().toISOString(),
    });

    const parsedFulfilment = parseItemFulfilment(vendorPayload);
    expect(parsedFulfilment.mode).toBe("vendor");
    expect(parsedFulfilment.label).toBe("Makrana Marbles");
    expect(parsedFulfilment.vendorAssignment?.vendor_id).toBe("vend-123");

    const parsedVendor = parseItemVendorAssignment(vendorPayload);
    expect(parsedVendor).not.toBeNull();
    expect(parsedVendor?.vendor_name).toBe("Makrana Marbles");
  });
});
