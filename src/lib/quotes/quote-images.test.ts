import { describe, expect, it } from "bun:test";
import { getLineItemImage, NO_IMAGE_SENTINEL, isStoneMaterialItem } from "./quote-images";

describe("getLineItemImage photo resolution & suppression", () => {
  it("returns explicit custom photo assigned to item.id", () => {
    const map = new Map<string, string>();
    map.set("row-1", "https://stonetech.in/custom-image.jpg");
    map.set("mint sandstone", "https://stonetech.in/catalog-mint.jpg");

    const item = {
      id: "row-1",
      description: "Natural Stone Panels - Mint Sandstone",
    };

    const resolved = getLineItemImage(item, map);
    expect(resolved).toBe("https://stonetech.in/custom-image.jpg");
  });

  it("suppresses fallback when item.id is set to NO_IMAGE_SENTINEL", () => {
    const map = new Map<string, string>();
    map.set("row-1", NO_IMAGE_SENTINEL);
    map.set("mint sandstone", "https://stonetech.in/catalog-mint.jpg");

    const item = {
      id: "row-1",
      description: "Natural Stone Panels - Mint Sandstone",
    };

    const resolved = getLineItemImage(item, map);
    expect(resolved).toBeNull();
  });

  it("falls back to description match when item has no explicit override or suppression", () => {
    const map = new Map<string, string>();
    map.set("mint sandstone", "https://stonetech.in/catalog-mint.jpg");

    const item = {
      id: "row-2",
      description: "Natural Stone Panels - Mint Sandstone",
    };

    const resolved = getLineItemImage(item, map);
    expect(resolved).toBe("https://stonetech.in/catalog-mint.jpg");
  });

  it("filters non-stone items accurately in isStoneMaterialItem", () => {
    expect(isStoneMaterialItem({ description: "Natural Stone Interlocking Panels" })).toBe(true);
    expect(isStoneMaterialItem({ description: "Installation Labour" })).toBe(false);
    expect(isStoneMaterialItem({ description: "Adhesive - Standard Cement Based" })).toBe(false);
    expect(isStoneMaterialItem({ description: "Sealer Chemical" })).toBe(false);
    expect(isStoneMaterialItem({ description: "Local Carting & Transportation" })).toBe(false);
  });
});
