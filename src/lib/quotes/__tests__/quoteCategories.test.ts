import { describe, it, expect } from "bun:test";
import {
  categorizeQuoteItem,
  sortQuoteItemsCategorically,
  calculateConsumableUpdates,
  QUOTE_CATEGORY_ORDER,
} from "../quoteCategories";
import type { EstimateWall, EstimateProduct } from "../estimateSchema";

describe("quoteCategories", () => {
  it("categorizes line items accurately into 6 canonical groups", () => {
    // 1. Products
    expect(
      categorizeQuoteItem({ description: "Teakwood Sandstone Veined Ashlar Modular Cladding" }),
    ).toBe("product");
    expect(categorizeQuoteItem({ description: 'Mint Sandstone RF-SB 2"/1" (Wall 1)' })).toBe(
      "product",
    );
    expect(categorizeQuoteItem({ description: 'Natural Stone Mosaics - 3"x3"' })).toBe("product");

    // 2. Installation Labour
    expect(categorizeQuoteItem({ description: "Installation Labour", unit: "sqft" })).toBe(
      "installation_labour",
    );
    expect(
      categorizeQuoteItem({ description: "Stone Cladding Installation Labour", unit: "sq.ft" }),
    ).toBe("installation_labour");

    // 3. Adhesives & Chemicals
    expect(
      categorizeQuoteItem({
        description: "Adhesive — Standard Cementitious Stone Adhesive Grey",
        unit: "bag",
      }),
    ).toBe("adhesive");
    expect(
      categorizeQuoteItem({ description: "Adhesive — PU Based Adhesive", unit: "bucket" }),
    ).toBe("adhesive");
    expect(categorizeQuoteItem({ description: "Sika Ceram Grey Adhesive", unit: "bag" })).toBe(
      "adhesive",
    );
    expect(categorizeQuoteItem({ description: "No-Limit White Adhesive", unit: "bag" })).toBe(
      "adhesive",
    );

    // 4. Sealers
    expect(
      categorizeQuoteItem({
        description: "Sealer Chemical — Water Based Water Repellent",
        unit: "ltr",
      }),
    ).toBe("sealer");
    expect(categorizeQuoteItem({ description: "Wetlook Sealer Chemical", unit: "ltr" })).toBe(
      "sealer",
    );

    // 5. Sealer Application Labour
    expect(categorizeQuoteItem({ description: "Sealer Application Labour", unit: "sqft" })).toBe(
      "sealer_labour",
    );

    // 6. Carting & Transportation
    expect(
      categorizeQuoteItem({
        description: "Local Carting & Transportation",
        unit: "trip",
        hsn_sac: "9965",
      }),
    ).toBe("carting");
  });

  it("sorts items categorically with products at top and carting at the very end", () => {
    const rawItems = [
      { id: "carting", description: "Local Carting & Transportation", unit: "trip", sort_order: 0 },
      {
        id: "sealer_labour",
        description: "Sealer Application Labour",
        unit: "sqft",
        sort_order: 1,
      },
      {
        id: "adhesive_pu",
        description: "Adhesive — PU Based Adhesive",
        unit: "bucket",
        sort_order: 2,
      },
      { id: "prod_2", description: "Teakwood Sandstone Cladding", unit: "sqft", sort_order: 3 },
      { id: "install_labour", description: "Installation Labour", unit: "sqft", sort_order: 4 },
      {
        id: "sealer",
        description: "Sealer Chemical — Water Based Water Repellent",
        unit: "ltr",
        sort_order: 5,
      },
      {
        id: "adhesive_cement",
        description: "Adhesive — Standard Cementitious Grey",
        unit: "bag",
        sort_order: 6,
      },
      { id: "prod_1", description: "Natural Stone Mosaics", unit: "sqft", sort_order: 7 },
    ];

    const sorted = sortQuoteItemsCategorically(rawItems);
    const sortedIds = sorted.map((it) => it.id);

    // Products first (prod_2 and prod_1 based on relative sort_order), then install_labour, adhesives, sealer, sealer_labour, carting
    expect(sortedIds).toEqual([
      "prod_2",
      "prod_1",
      "install_labour",
      "adhesive_pu",
      "adhesive_cement",
      "sealer",
      "sealer_labour",
      "carting",
    ]);
  });

  it("recalculates quantities dynamically when walls are added or sizes increase", () => {
    const walls: EstimateWall[] = [
      { id: "w1", name: "Wall 1", height: 10, length: 12, unit: "ft", sqft: 120 },
      { id: "w2", name: "Wall 2", height: 10, length: 10, unit: "ft", sqft: 100 },
    ];
    // Total sqft = 220
    const products: EstimateProduct[] = [
      {
        id: "p1",
        wallId: "w1",
        materialCategory: "stone_cladding",
        productName: "Teakwood Sandstone",
        priceUnit: "sqft",
        pricePerUnit: 185,
        wastagePct: 5,
        quantityToOrder: 126, // 120 * 1.05 = 126
        amount: 126 * 185,
      },
    ];

    const existingItems = [
      {
        id: "it_p1",
        description: "Teakwood Sandstone (Wall 1)",
        quantity: 126,
        unit: "sqft",
        unit_price: 185,
      },
      {
        id: "it_labour",
        description: "Installation Labour",
        quantity: 120,
        unit: "sqft",
        unit_price: 80,
      },
      {
        id: "it_adh_cement",
        description: "Adhesive — Standard Cementitious Stone Adhesive Grey",
        quantity: 5,
        unit: "bag",
        unit_price: 800,
      },
      {
        id: "it_adh_pu",
        description: "Adhesive — PU Based Adhesive",
        quantity: 6,
        unit: "bucket",
        unit_price: 1650,
      },
      {
        id: "it_sealer",
        description: "Sealer Chemical — Water Based Water Repellent",
        quantity: 0,
        unit: "ltr",
        unit_price: 1700,
      },
      {
        id: "it_sealer_labour",
        description: "Sealer Application Labour",
        quantity: 120,
        unit: "sqft",
        unit_price: 10,
      },
      {
        id: "it_carting",
        description: "Local Carting & Transportation",
        quantity: 1,
        unit: "trip",
        unit_price: 2500,
      },
    ];

    const result = calculateConsumableUpdates(walls, products, existingItems);
    expect(result.totalWallSqft).toBe(220);

    const labourPatch = result.itemPatches.find((p) => p.id === "it_labour");
    expect(labourPatch?.newQuantity).toBe(220);

    // 220 sqft / 25 = 8.8 -> 9 bags (increased from 5)
    const cementPatch = result.itemPatches.find((p) => p.id === "it_adh_cement");
    expect(cementPatch?.newQuantity).toBe(9);

    // 220 sqft / 20 = 11 buckets (increased from 6)
    const puPatch = result.itemPatches.find((p) => p.id === "it_adh_pu");
    expect(puPatch?.newQuantity).toBe(11);

    // 220 sqft / 550 = 0.4 -> 1 bottle (increased from 0)
    const sealerPatch = result.itemPatches.find((p) => p.id === "it_sealer");
    expect(sealerPatch?.newQuantity).toBe(1);

    // Sealer labour = 220 sqft (increased from 120)
    const sealerLabourPatch = result.itemPatches.find((p) => p.id === "it_sealer_labour");
    expect(sealerLabourPatch?.newQuantity).toBe(220);

    // Summary matches
    expect(result.summary.labourSqft).toBe(220);
    expect(result.summary.cementAdhesiveBags).toBe(9);
    expect(result.summary.puAdhesiveBuckets).toBe(11);
    expect(result.summary.sealerBottles).toBe(1);
    expect(result.summary.sealerLabourSqft).toBe(220);
  });

  it("recalculates quantities dynamically when wall size decreases", () => {
    // Decreased wall 1 from 120 sqft to 80 sqft (e.g. 10x8 ft)
    const walls: EstimateWall[] = [
      { id: "w1", name: "Wall 1", height: 10, length: 8, unit: "ft", sqft: 80 },
    ];
    const products: EstimateProduct[] = [
      {
        id: "p1",
        wallId: "w1",
        materialCategory: "stone_cladding",
        productName: "Teakwood Sandstone",
        priceUnit: "sqft",
        pricePerUnit: 185,
        wastagePct: 5,
        quantityToOrder: 126, // was 126
        amount: 126 * 185,
      },
    ];

    const existingItems = [
      {
        id: "it_p1",
        description: "Teakwood Sandstone (Wall 1)",
        quantity: 126,
        unit: "sqft",
        unit_price: 185,
      },
      {
        id: "it_labour",
        description: "Installation Labour",
        quantity: 120,
        unit: "sqft",
        unit_price: 80,
      },
      {
        id: "it_adh_cement",
        description: "Adhesive — Standard Cementitious Stone Adhesive Grey",
        quantity: 5,
        unit: "bag",
        unit_price: 800,
      },
      {
        id: "it_adh_pu",
        description: "Adhesive — PU Based Adhesive",
        quantity: 6,
        unit: "bucket",
        unit_price: 1650,
      },
      {
        id: "it_sealer",
        description: "Sealer Chemical — Water Based Water Repellent",
        quantity: 2,
        unit: "ltr",
        unit_price: 1700,
      },
      {
        id: "it_sealer_labour",
        description: "Sealer Application Labour",
        quantity: 120,
        unit: "sqft",
        unit_price: 10,
      },
    ];

    const result = calculateConsumableUpdates(walls, products, existingItems);
    expect(result.totalWallSqft).toBe(80);

    // Product quantity decreases from 126 to 84 (80 * 1.05 = 84)
    const prodPatch = result.itemPatches.find((p) => p.id === "it_p1");
    expect(prodPatch?.newQuantity).toBe(84);

    // Labour decreases to 80 sqft
    const labourPatch = result.itemPatches.find((p) => p.id === "it_labour");
    expect(labourPatch?.newQuantity).toBe(80);

    // Adhesives: 80 sqft / 25 = 3.2 -> 4 bags (decreased from 5)
    const cementPatch = result.itemPatches.find((p) => p.id === "it_adh_cement");
    expect(cementPatch?.newQuantity).toBe(4);

    // PU: 80 sqft / 20 = 4 buckets (decreased from 6)
    const puPatch = result.itemPatches.find((p) => p.id === "it_adh_pu");
    expect(puPatch?.newQuantity).toBe(4);

    // Sealer bottles: 80 / 550 = 0.15 -> 1 bottle (decreased from 2)
    const sealerPatch = result.itemPatches.find((p) => p.id === "it_sealer");
    expect(sealerPatch?.newQuantity).toBe(1);

    // Sealer labour decreases to 80 sqft
    const sealerLabourPatch = result.itemPatches.find((p) => p.id === "it_sealer_labour");
    expect(sealerLabourPatch?.newQuantity).toBe(80);
  });
});
