import { describe, expect, it } from "bun:test";
import {
  ceilWhole,
  DEFAULT_WASTAGE_PCT,
  materialQuantityToOrder,
  wallSqft,
  getDefaultSlabPrice,
  calculateMuralSlabs,
  ADHESIVE_CATALOG,
  CRAZY_PATTERN_ADHESIVE_COVERAGE_SQFT_PER_BAG,
  STANDARD_ADHESIVE_COVERAGE_SQFT_PER_BAG,
  isCrazyPatternProduct,
  calculateAdhesiveUnits,
} from "./estimateCatalog";
import { CARTING_CATALOG, MASTER_PRODUCT_CATALOG } from "./catalog";
import { buildEstimateWhatsappMessage } from "./estimateWhatsappPdf";

describe("estimateCatalog - rounding and wastage calculations", () => {
  describe("ceilWhole", () => {
    it("preserves exact whole numbers", () => {
      expect(ceilWhole(100)).toBe(100);
      expect(ceilWhole(25)).toBe(25);
      expect(ceilWhole(1)).toBe(1);
    });

    it("rounds up fractional amounts, including tiny decimals like 101.0000001 -> 102", () => {
      expect(ceilWhole(101.0000001)).toBe(102);
      expect(ceilWhole(101.1)).toBe(102);
      expect(ceilWhole(101.9)).toBe(102);
      expect(ceilWhole(1.0000001)).toBe(2);
      expect(ceilWhole(1.5)).toBe(2);
      expect(ceilWhole(1.99)).toBe(2);
    });

    it("ignores microscopic float precision jitter (< 1e-12)", () => {
      expect(ceilWhole(100 + 1e-14)).toBe(100);
      expect(ceilWhole(25 - 1e-14)).toBe(25);
    });

    it("handles zero and invalid inputs safely", () => {
      expect(ceilWhole(0)).toBe(0);
      expect(ceilWhole(-5)).toBe(0);
      expect(ceilWhole(NaN)).toBe(0);
      expect(ceilWhole(Infinity)).toBe(0);
    });
  });

  describe("materialQuantityToOrder", () => {
    it("uses default 5% wastage", () => {
      expect(DEFAULT_WASTAGE_PCT).toBe(5);
      // 100 sqft + 5% = 105 sqft
      expect(materialQuantityToOrder(100)).toBe(105);
      // 36 sqft + 5% = 37.8 sqft -> 38 sqft
      expect(materialQuantityToOrder(36)).toBe(38);
    });

    it("rounds up 101.0000001 to 102 when wastage is applied", () => {
      // 96.1904762857 * 1.05 = 101.00000009998... ~ 101.0000001
      const rawSqft = 101.0000001 / 1.05;
      expect(materialQuantityToOrder(rawSqft, 5)).toBe(102);
    });

    it("supports custom wastage percentages (e.g. 0%, 5%, 8%, 10%)", () => {
      // 0% wastage
      expect(materialQuantityToOrder(100, 0)).toBe(100);
      expect(materialQuantityToOrder(100.1, 0)).toBe(101);

      // 5% wastage
      expect(materialQuantityToOrder(100, 5)).toBe(105);

      // 8% wastage: 50 * 1.08 = 54
      expect(materialQuantityToOrder(50, 8)).toBe(54);
      // 50.1 * 1.08 = 54.108 -> 55
      expect(materialQuantityToOrder(50.1, 8)).toBe(55);

      // 10% wastage: 36 * 1.10 = 39.6 -> 40
      expect(materialQuantityToOrder(36, 10)).toBe(40);
    });

    it("returns 0 for zero or non-positive area", () => {
      expect(materialQuantityToOrder(0, 5)).toBe(0);
      expect(materialQuantityToOrder(-10, 5)).toBe(0);
    });
  });

  describe("wallSqft", () => {
    it("calculates wall area correctly across units", () => {
      // 10ft x 10ft = 100 sqft
      expect(wallSqft(10, 10, "ft")).toBeCloseTo(100, 4);
      // 108in x 48in = 9ft x 4ft = 36 sqft
      expect(wallSqft(108, 48, "in")).toBeCloseTo(36, 4);
      // 1m x 1m ~ 10.7639 sqft
      expect(wallSqft(1, 1, "m")).toBeCloseTo(10.7639, 3);
    });
  });

  describe("Stone Murals - getDefaultSlabPrice", () => {
    it("returns 550 for 50 mm Sandstone per business rule", () => {
      expect(getDefaultSlabPrice("Sandstone", 50)).toBe(550);
      expect(getDefaultSlabPrice("Mint Sandstone", 50)).toBe(550);
      expect(getDefaultSlabPrice("Teakwood Sandstone", 50.0)).toBe(550);
    });

    it("returns default price for other stones or thicknesses", () => {
      expect(getDefaultSlabPrice("Marble", 30)).toBe(550);
      expect(getDefaultSlabPrice("Granite", 40)).toBe(550);
    });
  });

  describe("Stone Murals - calculateMuralSlabs", () => {
    it("calculates slabs required for standard grid and area fit", () => {
      // 12ft x 8ft wall = 96 sqft
      // 6ft x 4ft slab = 24 sqft
      // 2 cols x 2 rows = 4 slabs
      const res = calculateMuralSlabs({
        wallHeight: 8,
        wallLength: 12,
        slabHeight: 4,
        slabLength: 6,
        unit: "ft",
      });

      expect(res.wallSqft).toBeCloseTo(96, 2);
      expect(res.slabSqft).toBeCloseTo(24, 2);
      expect(res.slabsRequired).toBe(4);
      expect(res.slabsGrid.cols).toBe(2);
      expect(res.slabsGrid.rows).toBe(2);
      expect(res.totalSlabSqft).toBe(96);
    });

    it("handles fractional grid fits by rounding up slabs per grid", () => {
      // 10ft x 7ft wall = 70 sqft
      // 4ft x 3ft slab = 12 sqft
      // cols = ceil(10/4)=3, rows = ceil(7/3)=3 -> 9 slabs (or rotated: cols=ceil(10/3)=4, rows=ceil(7/4)=2 -> 8 slabs)
      const res = calculateMuralSlabs({
        wallHeight: 7,
        wallLength: 10,
        slabHeight: 3,
        slabLength: 4,
        unit: "ft",
      });

      expect(res.slabsRequired).toBe(8); // best grid 4x2 = 8
      expect(res.totalSlabSqft).toBe(96); // 8 * 12
    });

    it("supports manual slab override count", () => {
      const res = calculateMuralSlabs({
        wallHeight: 8,
        wallLength: 12,
        slabHeight: 4,
        slabLength: 6,
        unit: "ft",
        slabsCountOverride: 5,
      });

      expect(res.slabsRequired).toBe(5);
      expect(res.totalSlabSqft).toBe(120); // 5 * 24
    });

    it("handles zero or empty values safely", () => {
      const res = calculateMuralSlabs({
        wallHeight: 0,
        wallLength: 0,
        slabHeight: 0,
        slabLength: 0,
        unit: "ft",
      });
      expect(res.slabsRequired).toBe(0);
      expect(res.totalSlabSqft).toBe(0);
    });
  });

  describe("Crazy Pattern in Stone - Adhesive Coverage (15 sq ft / bag)", () => {
    it("defines the business coverage constants correctly", () => {
      expect(CRAZY_PATTERN_ADHESIVE_COVERAGE_SQFT_PER_BAG).toBe(15);
      expect(STANDARD_ADHESIVE_COVERAGE_SQFT_PER_BAG).toBe(25);
    });

    it("detects crazy pattern from materialCategory or productName", () => {
      expect(isCrazyPatternProduct("crazy_pattern_in_stone", "")).toBe(true);
      expect(isCrazyPatternProduct("crazy_pattern", "")).toBe(true);
      expect(isCrazyPatternProduct("", "Crazy Pattern in Stone")).toBe(true);
      expect(isCrazyPatternProduct("sandstone", 'Mint Crazy Pattern 2"')).toBe(true);
      expect(isCrazyPatternProduct("natural_stone_cladding_tiles", "Regular Tiles")).toBe(false);
      expect(isCrazyPatternProduct("", "")).toBe(false);
      expect(isCrazyPatternProduct(null, null)).toBe(false);
    });

    it("calculates 6 bags for 80 sq ft crazy pattern (80 / 15 = 5.33 -> 6 bags)", () => {
      const greyAdhesive = ADHESIVE_CATALOG.find((a) => a.key === "standard_cementitious_grey")!;
      expect(greyAdhesive).toBeDefined();

      // For 80 sq ft crazy pattern:
      const crazyBags = calculateAdhesiveUnits(greyAdhesive, { crazySqft: 80, standardSqft: 0 });
      expect(crazyBags).toBe(6);

      // Contrast with standard stone on 80 sq ft (80 / 25 = 3.2 -> 4 bags):
      const standardBags = calculateAdhesiveUnits(greyAdhesive, { crazySqft: 0, standardSqft: 80 });
      expect(standardBags).toBe(4);
    });

    it("calculates exact multiples and ceiling fractional amounts correctly", () => {
      const whiteAdhesive = ADHESIVE_CATALOG.find((a) => a.key === "standard_cement_white")!;

      // 15 sqft -> exactly 1 bag
      expect(calculateAdhesiveUnits(whiteAdhesive, { crazySqft: 15, standardSqft: 0 })).toBe(1);

      // 15.1 sqft -> 2 bags
      expect(calculateAdhesiveUnits(whiteAdhesive, { crazySqft: 15.1, standardSqft: 0 })).toBe(2);

      // 30 sqft -> exactly 2 bags
      expect(calculateAdhesiveUnits(whiteAdhesive, { crazySqft: 30, standardSqft: 0 })).toBe(2);

      // 45 sqft -> exactly 3 bags
      expect(calculateAdhesiveUnits(whiteAdhesive, { crazySqft: 45, standardSqft: 0 })).toBe(3);

      // 100 sqft -> 100 / 15 = 6.666 -> 7 bags
      expect(calculateAdhesiveUnits(whiteAdhesive, { crazySqft: 100, standardSqft: 0 })).toBe(7);
    });

    it("handles mixed walls (e.g. 50 sq ft crazy pattern + 50 sq ft standard tiles)", () => {
      const greyAdhesive = ADHESIVE_CATALOG.find((a) => a.key === "standard_cementitious_grey")!;

      // 50 / 15 (= 3.333...) + 50 / 25 (= 2) = 5.333... -> 6 bags
      const mixedBags = calculateAdhesiveUnits(greyAdhesive, { crazySqft: 50, standardSqft: 50 });
      expect(mixedBags).toBe(6);
    });

    it("handles bucket adhesives (PU based) using its per-bucket coverage", () => {
      const puAdhesive = ADHESIVE_CATALOG.find((a) => a.key === "pu_based")!;
      // 80 sqft / 20 = 4 buckets
      expect(calculateAdhesiveUnits(puAdhesive, { crazySqft: 80, standardSqft: 0 })).toBe(4);
    });

    it("returns 0 for zero or empty sqft", () => {
      const greyAdhesive = ADHESIVE_CATALOG.find((a) => a.key === "standard_cementitious_grey")!;
      expect(calculateAdhesiveUnits(greyAdhesive, { crazySqft: 0, standardSqft: 0 })).toBe(0);
    });
  });

  describe("CARTING_CATALOG & master product catalog integration", () => {
    it("exports standard carting items with SAC 9965 and 5% GST", () => {
      expect(CARTING_CATALOG.length).toBeGreaterThanOrEqual(4);
      const localCarting = CARTING_CATALOG.find((c) => c.id === "cart_local_transportation");
      expect(localCarting).toBeDefined();
      expect(localCarting?.name).toBe("Local Carting & Transportation");
      expect(localCarting?.category).toBe("carting");
      expect(localCarting?.hsnCode).toBe("9965");
      expect(localCarting?.defaultUnit).toBe("trip");
      expect(localCarting?.defaultTaxPct).toBe(5);
      expect(localCarting?.defaultPrice).toBe(1500);
    });

    it("includes all carting items in MASTER_PRODUCT_CATALOG", () => {
      const cartingInMaster = MASTER_PRODUCT_CATALOG.filter((p) => p.category === "carting");
      expect(cartingInMaster.length).toBe(CARTING_CATALOG.length);
      expect(cartingInMaster.some((p) => p.id === "cart_local_transportation")).toBe(true);
      expect(cartingInMaster.some((p) => p.id === "cart_site_delivery_freight")).toBe(true);
      expect(cartingInMaster.some((p) => p.id === "cart_unloading_shifting")).toBe(true);
      expect(cartingInMaster.some((p) => p.id === "cart_on_actuals")).toBe(true);
    });
  });

  describe("buildEstimateWhatsappMessage with optional carting", () => {
    it("includes Local Carting line and suppresses on-actuals fallback when carting amount is provided", () => {
      const msg = buildEstimateWhatsappMessage(
        {
          greetingName: "Rajesh",
          wallSizeSummary: "Wall 1: 10ft x 10ft = 100 sq ft",
          materialSummary: "Mint Sandstone Crazy Pattern",
          materialToOrderSummary: "105 sq ft (including 5% wastage)",
          materialAmount: 12000,
          installationLabourAmount: 4500,
          adhesivesAmount: 2400,
          sealerAmount: 1800,
          sealerApplicationAmount: 1000,
          cartingAmount: 1500,
          cartingLocation: "From yard to Bodakdev site",
          totalEstimate: 23200,
          preparerName: "Stone Tech Sales",
        },
        "Stone Tech",
      );

      expect(msg).toContain("Local Carting: ₹1,500 (From yard to Bodakdev site)");
      expect(msg).not.toContain("Transportation charges will be extra and on actuals.");
    });

    it("falls back to on-actuals transport note when carting amount is not provided", () => {
      const msg = buildEstimateWhatsappMessage(
        {
          greetingName: "Rajesh",
          wallSizeSummary: "Wall 1: 10ft x 10ft = 100 sq ft",
          materialSummary: "Mint Sandstone Crazy Pattern",
          materialToOrderSummary: "105 sq ft (including 5% wastage)",
          materialAmount: 12000,
          installationLabourAmount: 4500,
          adhesivesAmount: 2400,
          sealerAmount: 1800,
          sealerApplicationAmount: 1000,
          totalEstimate: 21700,
          preparerName: "Stone Tech Sales",
        },
        "Stone Tech",
      );

      expect(msg).not.toContain("Local Carting:");
      expect(msg).toContain("Transportation charges will be extra and on actuals.");
    });

    it("omits installation lines and scaffolding note when Deal Scope is Supply Only (installation amounts are 0)", () => {
      const msg = buildEstimateWhatsappMessage(
        {
          greetingName: "Vikram",
          wallSizeSummary: "Wall 1: 9ft x 8ft = 72 sq ft",
          materialSummary: "Custom Stone Cladding - Mint Grove",
          materialToOrderSummary: "76 sq ft (including 5% wastage)",
          materialAmount: 21280,
          installationLabourAmount: 0,
          adhesivesAmount: 0,
          sealerAmount: 0,
          sealerApplicationAmount: 0,
          totalEstimate: 21280,
          preparerName: "Stone Tech Sales",
        },
        "Stone Tech",
      );

      expect(msg).toContain("Material Amount: ₹21,280");
      expect(msg).not.toContain("Installation Labour:");
      expect(msg).not.toContain("Adhesives:");
      expect(msg).not.toContain("Sealer chemical:");
      expect(msg).not.toContain("Sealer Application:");
      expect(msg).not.toContain("Scaffolding, if required, will be provided by the customer.");
      expect(msg).not.toContain("installation will commence shortly after delivery");
      expect(msg).toContain("Total Estimate: ₹21,280");
    });
  });
});
