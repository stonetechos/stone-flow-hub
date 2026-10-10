import { describe, expect, it } from "bun:test";
import {
  ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID,
  OrderVendorAssignmentProvider,
} from "./orderVendorAssignment";

describe("OrderVendorAssignmentProvider", () => {
  it("has the expected id and label", () => {
    expect(OrderVendorAssignmentProvider.id).toBe(ORDER_VENDOR_ASSIGNMENT_PROVIDER_ID);
    expect(OrderVendorAssignmentProvider.label).toBe(
      "Order vendor assignment & delivery deadlines",
    );
  });

  it("exports a runnable fetch function", async () => {
    expect(typeof OrderVendorAssignmentProvider.fetch).toBe("function");
  });
});
