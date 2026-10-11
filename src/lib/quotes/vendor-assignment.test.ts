import { describe, expect, it } from "bun:test";
import { parseQuoteVendorAssignment } from "./vendor-assignment";

describe("parseQuoteVendorAssignment", () => {
  it("correctly identifies unassigned quote", () => {
    const parsed = parseQuoteVendorAssignment({
      id: "q-1",
      valid_until: "2026-10-20",
      workflow_state: null,
    });

    expect(parsed.isAssigned).toBe(false);
    expect(parsed.fulfilmentType).toBe("unassigned");
    expect(parsed.vendorId).toBeNull();
    expect(parsed.vendorName).toBeNull();
    expect(parsed.promisedDeliveryDate).toBe("2026-10-20");
  });

  it("correctly parses in-house stock fulfilment", () => {
    const parsed = parseQuoteVendorAssignment({
      id: "q-dinesh",
      valid_until: "2026-10-20",
      workflow_state: {
        fulfilment_type: "in_stock",
        assigned_vendor_id: "in_house_stock",
        assigned_vendor_name: "In-House Stock",
        stock_location: "Bay A - Warehouse 2",
        promised_delivery_date: "2026-10-15",
      },
    });

    expect(parsed.isAssigned).toBe(true);
    expect(parsed.fulfilmentType).toBe("in_stock");
    expect(parsed.vendorId).toBe("in_house_stock");
    expect(parsed.vendorName).toBe("In-House Stock");
    expect(parsed.stockLocation).toBe("Bay A - Warehouse 2");
    expect(parsed.promisedDeliveryDate).toBe("2026-10-15");
  });

  it("correctly parses vendor outsourcing fulfilment", () => {
    const parsed = parseQuoteVendorAssignment({
      id: "q-vendor",
      valid_until: "2026-10-20",
      workflow_state: {
        fulfilment_type: "vendor",
        assigned_vendor_id: "vnd-123",
        assigned_vendor_name: "Rajasthan Marble Crafts",
        promised_delivery_date: "2026-10-25",
      },
    });

    expect(parsed.isAssigned).toBe(true);
    expect(parsed.fulfilmentType).toBe("vendor");
    expect(parsed.vendorId).toBe("vnd-123");
    expect(parsed.vendorName).toBe("Rajasthan Marble Crafts");
    expect(parsed.stockLocation).toBeNull();
    expect(parsed.promisedDeliveryDate).toBe("2026-10-25");
  });

  it("treats assigned_vendor_id in_house_stock as in_stock even if legacy format", () => {
    const parsed = parseQuoteVendorAssignment({
      id: "q-legacy",
      workflow_state: {
        assigned_vendor_id: "in_house_stock",
        assigned_vendor_name: "In-House Stock",
      },
    });

    expect(parsed.isAssigned).toBe(true);
    expect(parsed.fulfilmentType).toBe("in_stock");
  });
});
