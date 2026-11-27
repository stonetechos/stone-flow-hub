import { describe, it, expect } from "bun:test";
import {
  getUnifiedCatalog,
  searchStonemanCatalog,
  KNOWN_DISCONTINUED_PRODUCTS,
} from "./stoneman-catalog-ai";

describe("StoneMan Real-Time Catalogue Sync & AI Engine", () => {
  it("indexes products across wall cladding, stone veneer, glass bricks, and clay veneers", () => {
    const { activeItems } = getUnifiedCatalog();
    expect(activeItems.length).toBeGreaterThan(500);

    // Verify presence of different catalogue categories
    const categories = new Set(activeItems.map((i) => i.category));
    expect(categories.size).toBeGreaterThan(3);
  });

  it("finds active products by stone variety, finish, and application", () => {
    const res = searchStonemanCatalog("sandstone");
    expect(res.isDiscontinuedMatch).toBe(false);
    expect(res.matches.length).toBeGreaterThan(0);
    expect(res.suggestedAnswer).toBeDefined();

    // Verify search by code
    const codeRes = searchStonemanCatalog("ST-WC-001");
    expect(codeRes.matches.length).toBeGreaterThan(0);
    expect(codeRes.matches[0].id).toBe("ST-WC-001");
  });

  it("identifies historical discontinued products and returns the exact required customer statement", () => {
    const res = searchStonemanCatalog("PU panels");
    expect(res.isDiscontinuedMatch).toBe(true);
    expect(res.discontinuedMessage).toBe(
      "We don't deal in this product anymore—we used to! But if you specifically require this only and nothing else works out for you, I'll create a request to the admin about it.",
    );
    expect(res.discontinuedItem).toBeDefined();
    expect(res.discontinuedItem?.name).toContain("PU");
  });

  it("identifies custom products removed from the system and flags them as discontinued", () => {
    // Simulate ST-WC-015 being removed/deleted by admin in the catalogue editor
    const res = searchStonemanCatalog("ST-WC-015", ["ST-WC-015"]);
    expect(res.isDiscontinuedMatch).toBe(true);
    expect(res.discontinuedMessage).toContain(
      "We don't deal in this product anymore—we used to! But if you specifically require this only and nothing else works out for you, I'll create a request to the admin about it.",
    );
    expect(res.discontinuedItem?.id).toBe("ST-WC-015");
  });
});
