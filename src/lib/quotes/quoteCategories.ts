/**
 * Quote Item Categorization & Canonical Hierarchy
 *
 * Enforces the standardized Stone Tech quotation item hierarchy:
 * 1. Products (Stone Cladding, Natural Stone, Slabs, Murals, Mosaics, CNC Carvings)
 * 2. Installation Labour
 * 3. Adhesives & Chemicals (Cementitious Bags, PU Buckets, Epoxies)
 * 4. Surface Sealers & Repellents
 * 5. Sealer Application Labour
 * 6. Transportation & Carting
 */

import {
  wallSqft,
  materialQuantityToOrder,
  ceilWhole,
  isCrazyPatternProduct,
  calculateAdhesiveUnits,
  ADHESIVE_CATALOG,
  SEALER_CATALOG,
  type LengthUnit,
  type AdhesiveCatalogItem,
  type SealerCatalogItem,
} from "./estimateCatalog";
import type { EstimateWall, EstimateProduct, EstimateWorksheet } from "./estimateSchema";

export type QuoteItemCategory =
  | "product"
  | "installation_labour"
  | "adhesive"
  | "sealer"
  | "sealer_labour"
  | "carting";

export const QUOTE_CATEGORY_ORDER: Record<QuoteItemCategory, number> = {
  product: 1,
  installation_labour: 2,
  adhesive: 3,
  sealer: 4,
  sealer_labour: 5,
  carting: 6,
};

export const QUOTE_ITEM_CATEGORY_LABELS: Record<QuoteItemCategory, string> = {
  product: "Stone Cladding Products",
  installation_labour: "Installation Labour",
  adhesive: "Adhesives & Chemicals",
  sealer: "Sealers & Repellents",
  sealer_labour: "Sealer Application Labour",
  carting: "Carting & Transportation",
};

export const QUOTE_ITEM_CATEGORY_BADGE_CLASSES: Record<QuoteItemCategory, string> = {
  product:
    "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-800",
  installation_labour:
    "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800",
  adhesive:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  sealer:
    "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800",
  sealer_labour:
    "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800",
  carting:
    "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-800",
};

// Backwards-compatible aliases
export const QUOTE_CATEGORY_LABELS = QUOTE_ITEM_CATEGORY_LABELS;
export const QUOTE_CATEGORY_BADGE_CLASSES = QUOTE_ITEM_CATEGORY_BADGE_CLASSES;

/**
 * Categorizes a quote line item into one of the 6 canonical categories.
 */
export function categorizeQuoteItem(item: {
  description?: string | null;
  unit?: string | null;
  hsn_sac?: string | null;
}): QuoteItemCategory {
  const desc = (item.description || "").toLowerCase().trim();
  const unit = (item.unit || "").toLowerCase().trim();
  const hsn = (item.hsn_sac || "").trim();

  // 1. Carting & Transportation (always last)
  if (
    desc.includes("carting") ||
    desc.includes("transport") ||
    desc.includes("freight") ||
    desc.includes("delivery") ||
    desc.includes("cartage") ||
    desc.includes("tempo") ||
    desc.includes("pickup from yard") ||
    unit === "trip" ||
    hsn === "9965"
  ) {
    return "carting";
  }

  // 2. Sealer Application Labour (after sealers)
  if (
    (desc.includes("sealer") &&
      (desc.includes("labour") ||
        desc.includes("labor") ||
        desc.includes("application") ||
        desc.includes("applying"))) ||
    desc.includes("sealer application")
  ) {
    return "sealer_labour";
  }

  // 3. Sealers & Chemical Repellents (after adhesives)
  if (
    desc.includes("sealer chemical") ||
    desc.includes("water repellent") ||
    desc.includes("water based water repellent") ||
    desc.includes("dust repellent") ||
    desc.includes("wetlook") ||
    desc.includes("back coat") ||
    desc.includes("film forming") ||
    desc.includes("anti-graffiti") ||
    desc.includes("laticrete") ||
    (desc.includes("sealer") && !desc.includes("labour") && !desc.includes("labor")) ||
    unit === "ltr" ||
    unit === "litre" ||
    unit === "bottle"
  ) {
    return "sealer";
  }

  // 4. Adhesives & Chemicals (Bags / PU Buckets)
  if (
    desc.includes("adhesive") ||
    desc.includes("pu based") ||
    desc.includes("pu-based") ||
    desc.includes("sika ceram") ||
    desc.includes("no-limit") ||
    desc.includes("cementitious") ||
    desc.includes("cement based") ||
    desc.includes("epoxy") ||
    desc.includes("chemicals") ||
    desc.includes("chemical") ||
    unit === "bag" ||
    unit === "bucket"
  ) {
    return "adhesive";
  }

  // 5. Installation Labour (right after stone products)
  if (
    (desc.includes("labour") || desc.includes("labor")) &&
    (desc.includes("install") ||
      desc.includes("cladding") ||
      desc.includes("fixing") ||
      desc.includes("fitting") ||
      desc === "installation labour" ||
      desc === "stone installation labour")
  ) {
    return "installation_labour";
  }

  // 6. Default: Stone Products (at top)
  return "product";
}

/**
 * Sorts quote items categorically into the 6 standard groups while preserving
 * the original relative order within each category.
 */
export function sortQuoteItemsCategorically<
  T extends {
    id: string;
    description?: string | null;
    unit?: string | null;
    hsn_sac?: string | null;
    sort_order?: number | null;
  },
>(items: T[]): T[] {
  const indexed = items.map((item, originalIndex) => ({
    item,
    originalIndex,
    category: categorizeQuoteItem(item),
    rank: QUOTE_CATEGORY_ORDER[categorizeQuoteItem(item)],
  }));

  indexed.sort((a, b) => {
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    const orderA = a.item.sort_order ?? a.originalIndex;
    const orderB = b.item.sort_order ?? b.originalIndex;
    return orderA - orderB;
  });

  return indexed.map((x) => x.item);
}

export interface ProposedConsumableUpdates {
  totalWallSqft: number;
  crazySqft: number;
  standardSqft: number;
  // Proposed item updates: itemId -> patch
  itemPatches: Array<{
    id: string;
    description: string;
    category: QuoteItemCategory;
    currentQuantity: number;
    newQuantity: number;
    unit?: string | null;
  }>;
  // Product updates
  productPatches: Array<{
    id: string;
    wallId: string;
    wallName: string;
    currentQuantity: number;
    newQuantity: number;
    itemDesc?: string;
  }>;
  // Summary for UI display
  summary: {
    labourSqft: number;
    cementAdhesiveBags: number;
    actualCementBagsInQuote?: number;
    cementBreakdownText?: string;
    puAdhesiveBuckets: number;
    sealerBottles: number;
    sealerCoverageSqftPerLtr?: number;
    sealerLabel?: string;
    sealerLabourSqft: number;
  };
  // Recalculated worksheet
  updatedWorksheet: EstimateWorksheet;
}

/**
 * Detects the sealer coverage (sq.ft / litre) and catalog information
 * from a sealer item description or worksheet key.
 */
export function detectSealerCoverage(
  sealerDescription?: string | null,
  worksheetSealerKey?: string | null,
): { coverage: number; label: string; key: string } {
  const d = (sealerDescription || "").toLowerCase().trim();

  if (d) {
    if (d.includes("solvent") || d.includes("oil") || d.includes("dust")) {
      return {
        coverage: 50,
        label: "Solvent Based Water Oil and Dust Repellent",
        key: "solvent_based_oil_dust_repellent",
      };
    }
    if (d.includes("wetlook") || d.includes("wet look")) {
      return {
        coverage: 60,
        label: "Wetlook Sealer",
        key: "wetlook_sealer",
      };
    }
    if (d.includes("film forming")) {
      return {
        coverage: 60,
        label: "Film Forming Surface Sealers",
        key: "film_forming_surface_sealers",
      };
    }
    if (d.includes("back coat") || d.includes("backcoat")) {
      return {
        coverage: 100,
        label: "Back Coat",
        key: "back_coat",
      };
    }
    if (d.includes("anti-graffiti") || d.includes("antigraffiti")) {
      return {
        coverage: 60,
        label: "Anti-Graffiti",
        key: "anti_graffiti",
      };
    }
    if (
      d.includes("water based") ||
      d.includes("water-based") ||
      d.includes("repellent") ||
      d.includes("sealer")
    ) {
      return {
        coverage: 550,
        label: "Water Based Water Repellent",
        key: "water_based_repellent",
      };
    }
  }

  if (worksheetSealerKey) {
    const matched = SEALER_CATALOG.find((s) => s.key === worksheetSealerKey);
    if (matched) {
      return {
        coverage: matched.coverageSqftPerLtr,
        label: matched.label,
        key: matched.key,
      };
    }
  }

  return {
    coverage: 550,
    label: "Water Based Water Repellent",
    key: "water_based_repellent",
  };
}

/**
 * Recalculates all consumable and installation quantities based on the updated walls:
 * - Installation Labour: totalWallSqft
 * - Adhesives: Standard Cementitious (25 sqft/bag; 15 sqft/bag crazy)
 * - PU Based Adhesives: 20 sqft/bucket
 * - Sealers: bottles based on coverageSqftPerLtr (e.g. 550 sqft/ltr)
 * - Sealer Application Labour: totalWallSqft
 * - Wall stone products: wall.sqft + wastage%
 */
export function calculateConsumableUpdates(
  walls: EstimateWall[],
  products: EstimateProduct[],
  existingItems: Array<{
    id: string;
    description?: string | null;
    quantity?: number | null;
    unit?: string | null;
    unit_price?: number | null;
    notes?: string | null;
    hsn_sac?: string | null;
  }>,
  currentWorksheet?: EstimateWorksheet | null,
): ProposedConsumableUpdates {
  const totalWallSqft = Math.round(walls.reduce((sum, w) => sum + (w.sqft || 0), 0) * 100) / 100;

  // Breakdown crazy pattern vs standard
  let crazySqft = 0;
  let standardSqft = 0;

  for (const w of walls) {
    const wallProd = products.find((p) => p.wallId === w.id);
    const isCrazy =
      wallProd && isCrazyPatternProduct(wallProd.materialCategory, wallProd.productName);
    if (isCrazy) {
      crazySqft += w.sqft;
    } else {
      standardSqft += w.sqft;
    }
  }

  // Fallback: check if existing items mention crazy pattern
  if (crazySqft === 0 && existingItems.some((it) => isCrazyPatternProduct(null, it.description))) {
    crazySqft = totalWallSqft;
    standardSqft = 0;
  }
  crazySqft = Math.round(crazySqft * 100) / 100;
  standardSqft = Math.round(standardSqft * 100) / 100;

  const wallBreakdown = { crazySqft, standardSqft };

  const itemPatches: ProposedConsumableUpdates["itemPatches"] = [];
  const productPatches: ProposedConsumableUpdates["productPatches"] = [];

  // 1. Recalculate stone products mapped to walls
  const updatedProducts = products.map((prod) => {
    const wall = walls.find((w) => w.id === prod.wallId);
    if (!wall) return prod;

    const waste = prod.wastagePct ?? 5;
    const newQty =
      prod.priceUnit === "sqft" ? materialQuantityToOrder(wall.sqft, waste) : prod.quantityToOrder;
    const currentQty = prod.quantityToOrder;

    if (newQty !== currentQty) {
      productPatches.push({
        id: prod.id,
        wallId: wall.id,
        wallName: wall.name,
        currentQuantity: currentQty,
        newQuantity: newQty,
        itemDesc: prod.productName,
      });
    }

    return {
      ...prod,
      quantityToOrder: newQty,
      amount: newQty * prod.pricePerUnit,
    };
  });

  // Also check if any existingItems match wall products (e.g. description has wall name or notes has wallId)
  for (let idx = 0; idx < walls.length; idx++) {
    const wall = walls[idx];
    let wallProd = updatedProducts.find((p) => p.wallId === wall.id);
    if (!wallProd && updatedProducts[idx]) {
      wallProd = updatedProducts[idx];
    }
    if (!wallProd) continue;

    const matchedItem = existingItems.find((it) => {
      const d = (it.description || "").toLowerCase();
      const n = (it.notes || "").toLowerCase();
      const wn = wall.name.toLowerCase();
      return (
        d.includes(`(${wn})`) ||
        n.includes(`wall: ${wn}`) ||
        (d.includes(wallProd.productName.toLowerCase()) && walls.length === 1)
      );
    });

    if (matchedItem && Number(matchedItem.quantity) !== wallProd.quantityToOrder) {
      itemPatches.push({
        id: matchedItem.id,
        description: matchedItem.description || "Stone Product",
        category: "product",
        currentQuantity: Number(matchedItem.quantity) || 0,
        newQuantity: wallProd.quantityToOrder,
        unit: matchedItem.unit,
      });
    }
  }

  // 2. Installation Labour
  const labourItem = existingItems.find((it) => categorizeQuoteItem(it) === "installation_labour");
  if (labourItem) {
    const newLabourQty = totalWallSqft;
    if (Number(labourItem.quantity) !== newLabourQty) {
      itemPatches.push({
        id: labourItem.id,
        description: labourItem.description || "Installation Labour",
        category: "installation_labour",
        currentQuantity: Number(labourItem.quantity) || 0,
        newQuantity: newLabourQty,
        unit: labourItem.unit || "sqft",
      });
    }
  }

  // 3. Adhesives & Chemicals
  const adhesiveItems = existingItems.filter((it) => categorizeQuoteItem(it) === "adhesive");
  const isPuItem = (it: { description?: string | null; unit?: string | null }) => {
    const d = (it.description || "").toLowerCase();
    const u = (it.unit || "").toLowerCase();
    return d.includes("pu based") || d.includes("pu-based") || u === "bucket";
  };

  const puItems = adhesiveItems.filter(isPuItem);
  const cementItems = adhesiveItems.filter((it) => !isPuItem(it));

  // PU Based (20 sqft/bucket)
  for (const puItem of puItems) {
    const calculatedPu = ceilWhole(totalWallSqft / 20);
    if (Number(puItem.quantity) !== calculatedPu) {
      itemPatches.push({
        id: puItem.id,
        description: puItem.description || "PU Based Adhesive",
        category: "adhesive",
        currentQuantity: Number(puItem.quantity) || 0,
        newQuantity: calculatedPu,
        unit: puItem.unit || "bucket",
      });
    }
  }

  // Cementitious Stone Adhesives (Standard Grey, White, No-Limit, Sika Ceram, etc.)
  const firstCementDesc = cementItems[0]?.description || "";
  const adhesiveCatalogEntry =
    ADHESIVE_CATALOG.find((c) => firstCementDesc.toLowerCase().includes(c.label.toLowerCase())) ??
    ADHESIVE_CATALOG[1]; // default grey
  const calculatedCementBags = calculateAdhesiveUnits(adhesiveCatalogEntry, wallBreakdown);

  const totalCementBagsInQuote = cementItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0,
  );

  const cementBreakdownText =
    cementItems.length > 1
      ? cementItems
          .map((it) => {
            const d = (it.description || "").toLowerCase();
            const color = d.includes("white")
              ? "White"
              : d.includes("grey")
                ? "Grey"
                : d.includes("pu")
                  ? "PU"
                  : "Bags";
            return `${Number(it.quantity) || 0} ${color}`;
          })
          .join(" + ")
      : undefined;

  // Single-item vs Multi-item (Split / Bifurcated) Adhesives:
  // If there is exactly ONE cement item, keep that item's quantity in sync with calculated total.
  if (cementItems.length === 1) {
    const singleCement = cementItems[0];
    if (Number(singleCement.quantity) !== calculatedCementBags) {
      itemPatches.push({
        id: singleCement.id,
        description: singleCement.description || "Adhesives & Chemicals",
        category: "adhesive",
        currentQuantity: Number(singleCement.quantity) || 0,
        newQuantity: calculatedCementBags,
        unit: singleCement.unit || "bag",
      });
    }
  }
  // When there are MULTIPLE cement items (e.g. user bifurcated into 5 bags White + 8 bags Grey):
  // We NEVER overwrite the individual lines to calculatedCementBags (which would make each 13!).
  // If total bags in quote matches calculatedCementBags (13 === 13), it is in 100% balance.

  // 4. Sealers
  const sealerItem = existingItems.find((it) => categorizeQuoteItem(it) === "sealer");
  const sealerDetection = detectSealerCoverage(
    sealerItem?.description,
    currentWorksheet?.installation?.sealer?.key,
  );
  const sealerCoverage = sealerDetection.coverage;
  const calculatedSealerBottles = ceilWhole(totalWallSqft / sealerCoverage);

  if (sealerItem) {
    if (Number(sealerItem.quantity) !== calculatedSealerBottles) {
      itemPatches.push({
        id: sealerItem.id,
        description: sealerItem.description || "Sealer Chemical",
        category: "sealer",
        currentQuantity: Number(sealerItem.quantity) || 0,
        newQuantity: calculatedSealerBottles,
        unit: sealerItem.unit || "ltr",
      });
    }
  }

  // 5. Sealer Application Labour
  const sealerLabourItem = existingItems.find((it) => categorizeQuoteItem(it) === "sealer_labour");
  if (sealerLabourItem) {
    const newSealerLabourQty = totalWallSqft;
    if (Number(sealerLabourItem.quantity) !== newSealerLabourQty) {
      itemPatches.push({
        id: sealerLabourItem.id,
        description: sealerLabourItem.description || "Sealer Application Labour",
        category: "sealer_labour",
        currentQuantity: Number(sealerLabourItem.quantity) || 0,
        newQuantity: newSealerLabourQty,
        unit: sealerLabourItem.unit || "sqft",
      });
    }
  }

  // Build updated worksheet
  const baseWs: EstimateWorksheet = currentWorksheet ?? {
    version: 1,
    unit: walls[0]?.unit || "ft",
    walls,
    products: updatedProducts,
    installation: {
      labour: {
        ratePerSqft: Number(labourItem?.unit_price) || 80,
        amount: (Number(labourItem?.unit_price) || 80) * totalWallSqft,
      },
      adhesives: [],
      sealer: null,
      sealerLabour: {
        ratePerSqft: Number(sealerLabourItem?.unit_price) || 10,
        amount: (Number(sealerLabourItem?.unit_price) || 10) * totalWallSqft,
      },
    },
    discount: { applied: false, eligible: false, pct: 0, amount: 0 },
    totalWallSqft,
    materialAmount: updatedProducts.reduce((sum, p) => sum + p.amount, 0),
    installationAmount: 0,
    subtotal: 0,
    total: 0,
  };

  const updatedAdhesives = (baseWs.installation?.adhesives || []).map((adh) => {
    const cat = ADHESIVE_CATALOG.find((c) => c.key === adh.key);
    const newUnits = cat
      ? calculateAdhesiveUnits(cat, wallBreakdown)
      : ceilWhole(totalWallSqft / 25);
    return {
      ...adh,
      units: newUnits,
      amount: newUnits * adh.pricePerUnit,
    };
  });

  const updatedSealer = baseWs.installation?.sealer
    ? (() => {
        const cat = SEALER_CATALOG.find((s) => s.key === baseWs.installation.sealer?.key);
        const cov = cat?.coverageSqftPerLtr || sealerCoverage || 550;
        const newBottles = ceilWhole(totalWallSqft / cov);
        return {
          ...baseWs.installation.sealer,
          bottles: newBottles,
          amount: newBottles * baseWs.installation.sealer.pricePerLtr,
        };
      })()
    : null;

  const labourAmount =
    (baseWs.installation?.labour?.ratePerSqft || Number(labourItem?.unit_price) || 80) *
    totalWallSqft;
  const sealerLabourAmount =
    (baseWs.installation?.sealerLabour?.ratePerSqft || Number(sealerLabourItem?.unit_price) || 10) *
    totalWallSqft;
  const adhesivesAmount = updatedAdhesives.reduce((sum, a) => sum + a.amount, 0);
  const sealerAmount = updatedSealer?.amount ?? 0;
  const installationAmount = labourAmount + adhesivesAmount + sealerAmount + sealerLabourAmount;
  const materialAmount = updatedProducts.reduce((sum, p) => sum + p.amount, 0);
  const cartingAmount = baseWs.carting?.amount || 0;
  const subtotal = materialAmount + installationAmount + cartingAmount;

  const updatedWorksheet: EstimateWorksheet = {
    ...baseWs,
    walls,
    products: updatedProducts,
    totalWallSqft,
    installation: {
      ...baseWs.installation,
      labour: {
        ratePerSqft:
          baseWs.installation?.labour?.ratePerSqft || Number(labourItem?.unit_price) || 80,
        amount: labourAmount,
      },
      adhesives: updatedAdhesives,
      sealer: updatedSealer,
      sealerLabour: {
        ratePerSqft:
          baseWs.installation?.sealerLabour?.ratePerSqft ||
          Number(sealerLabourItem?.unit_price) ||
          10,
        amount: sealerLabourAmount,
      },
    },
    materialAmount,
    installationAmount,
    subtotal,
    total: subtotal,
  };

  return {
    totalWallSqft,
    crazySqft,
    standardSqft,
    itemPatches,
    productPatches,
    summary: {
      labourSqft: totalWallSqft,
      cementAdhesiveBags: calculatedCementBags,
      actualCementBagsInQuote: totalCementBagsInQuote,
      cementBreakdownText,
      puAdhesiveBuckets: ceilWhole(totalWallSqft / 20),
      sealerBottles: calculatedSealerBottles,
      sealerCoverageSqftPerLtr: sealerCoverage,
      sealerLabel: `${sealerCoverage} sq.ft coverage/ltr (${sealerDetection.label})`,
      sealerLabourSqft: totalWallSqft,
    },
    updatedWorksheet,
  };
}
