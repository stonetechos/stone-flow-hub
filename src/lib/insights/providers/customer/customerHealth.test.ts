import { describe, expect, it } from "bun:test";
import { CUSTOMER_HEALTH_PROVIDER_ID, CustomerHealthProvider } from "./customerHealth";

describe("CustomerHealthProvider", () => {
  it("has the expected id and label", () => {
    expect(CustomerHealthProvider.id).toBe(CUSTOMER_HEALTH_PROVIDER_ID);
    expect(CustomerHealthProvider.label).toBe("Customer health");
  });

  it("exports a runnable fetch function", () => {
    expect(typeof CustomerHealthProvider.fetch).toBe("function");
  });
});

describe("Collection suggestion zero-value suppression", () => {
  const zeroCollectionRegex = /collect\s*(₹|rs\.?)?\s*0(\.00?)?(\s|·|$)/i;

  it("identifies and blocks zero-amount collection labels", () => {
    expect(zeroCollectionRegex.test("Collect ₹0 · Designnbuy Webtoprint")).toBe(true);
    expect(zeroCollectionRegex.test("Collect Rs 0 · Designnbuy")).toBe(true);
    expect(zeroCollectionRegex.test("Collect 0 · Some Customer")).toBe(true);
    expect(zeroCollectionRegex.test("Collect ₹0.00 · Customer")).toBe(true);
    expect(zeroCollectionRegex.test("collect ₹0")).toBe(true);
  });

  it("allows legitimate non-zero collection actions", () => {
    expect(zeroCollectionRegex.test("Collect ₹50,000 · Designnbuy")).toBe(false);
    expect(zeroCollectionRegex.test("Collect ₹1,000 · ACME Corp")).toBe(false);
    expect(zeroCollectionRegex.test("Collect ₹500")).toBe(false);
    expect(zeroCollectionRegex.test("Follow up · Designnbuy Webtoprint")).toBe(false);
    expect(zeroCollectionRegex.test("Review · Designnbuy Webtoprint")).toBe(false);
  });
});
