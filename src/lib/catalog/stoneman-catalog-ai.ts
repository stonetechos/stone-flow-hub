/**
 * stoneman-catalog-ai.ts
 *
 * Real-time synchronization and analysis engine for StoneMan AI.
 * Analyzes all product catalogues (Natural Stone Wall Cladding, Ultra-Thin Stone Veneer,
 * Architectural Glass Bricks, Flexible Clay Veneers, Stone Pebbles, and Custom ERP items).
 *
 * Tracks active vs. removed/discontinued products:
 * When a customer asks for a discontinued or removed product:
 * -> Informs them: "We don't deal in this product anymore—we used to! But if you specifically
 *    require this only and nothing else works out for you, I'll create a request to the admin about it."
 * -> Provides conversational intake to capture details step-by-step and create a CRM entry.
 */

import rawWallCladding from "@/data/wall-cladding-catalog.json";
import rawStoneVeneer from "@/data/stone-veneer-catalog.json";
import rawGlassBricks from "@/data/glass-bricks-catalog.json";
import rawFlexibleClay from "@/data/flexible-clay-catalog.json";
import rawStonePebbles from "@/data/stone-pebbles-catalog.json";
import {
  readCustomCatalogItems,
  readDeletedProductIds,
  type CatalogProduct,
} from "./catalog-store";

export interface UnifiedCatalogItem {
  id: string;
  name: string;
  category: string;
  stoneType: string;
  standardSizes: string;
  thickness: string;
  applications: string[];
  finishes: string[];
  image: string;
  price?: number;
  badge?: string;
  isCustom?: boolean;
  isActive: boolean;
  discontinuedReason?: string;
}

/**
 * Historical/discontinued products and materials that Stone Tech previously dealt in
 * or has retired/phased out.
 */
export const KNOWN_DISCONTINUED_PRODUCTS: Array<{
  id: string;
  name: string;
  category: string;
  keywords: string[];
  notes: string;
}> = [
  {
    id: "DISC-PU-001",
    name: "PU Decorative Faux Stone Panels",
    category: "PU Panels (Discontinued)",
    keywords: ["pu panel", "pu panels", "polyurethane", "faux stone", "artificial pu stone"],
    notes:
      "Phased out in favor of 100% natural stone wall cladding, flexible clay veneers, and eco-friendly stone veneers.",
  },
  {
    id: "DISC-PVC-002",
    name: "PVC UV Marble Sheets",
    category: "Synthetic Sheet (Discontinued)",
    keywords: ["pvc marble", "uv marble sheet", "plastic marble", "artificial marble sheet"],
    notes:
      "Discontinued. Stone Tech specializes exclusively in genuine quarried natural stones and architectural veneers.",
  },
  {
    id: "DISC-COMP-003",
    name: "Agglomerated Composite Quartz Tiles",
    category: "Engineered Stone (Discontinued)",
    keywords: ["composite stone", "agglomerate quartz", "engineered marble tiles"],
    notes:
      "Retired line. Replaced by genuine bookmatched Italian marbles, Indian granites, and quartzite.",
  },
  {
    id: "DISC-SAND-004",
    name: "Dholpur Beige Splitface - Old Quarry Batch",
    category: "Stone Wall Cladding (Retired Quarry Seam)",
    keywords: ["old dholpur beige", "dholpur rustic yellow rough", "seam 3 dholpur"],
    notes:
      "Specific seam exhausted. Active quarries provide premium refined Dholpur Buff and Teakwood varieties.",
  },
];

/**
 * Returns all catalogue items across all categories with live deleted-item synchronization.
 */
export function getUnifiedCatalog(customDeletedIds?: string[]): {
  activeItems: UnifiedCatalogItem[];
  discontinuedItems: UnifiedCatalogItem[];
} {
  const deletedIds = new Set(
    customDeletedIds ?? (typeof window !== "undefined" ? readDeletedProductIds() : []),
  );

  const customItems: CatalogProduct[] =
    typeof window !== "undefined" ? readCustomCatalogItems() : [];

  const rawAll: Array<Partial<CatalogProduct> & { id: string; name: string }> = [
    ...(rawWallCladding as unknown as CatalogProduct[]),
    ...(rawStoneVeneer as unknown as CatalogProduct[]),
    ...(rawGlassBricks as unknown as CatalogProduct[]),
    ...(rawFlexibleClay as unknown as CatalogProduct[]),
    ...(rawStonePebbles as unknown as CatalogProduct[]),
    ...customItems,
  ];

  const activeItems: UnifiedCatalogItem[] = [];
  const discontinuedItems: UnifiedCatalogItem[] = [];

  // Register known historical discontinued items
  for (const disc of KNOWN_DISCONTINUED_PRODUCTS) {
    discontinuedItems.push({
      id: disc.id,
      name: disc.name,
      category: disc.category,
      stoneType: "Discontinued / Retired Material",
      standardSizes: "Legacy Custom",
      thickness: "Legacy",
      applications: ["Custom Admin Sourcing Only"],
      finishes: ["Legacy"],
      image: "/stoneman-avatar.png",
      isActive: false,
      discontinuedReason: disc.notes,
    });
  }

  for (const item of rawAll) {
    if (!item.id || !item.name) continue;

    const isDeleted = deletedIds.has(item.id) || item.isActive === false;

    const unified: UnifiedCatalogItem = {
      id: item.id,
      name: item.name,
      category: item.category || "Architectural Natural Stone",
      stoneType: item.stoneType || item.category || "Natural Stone",
      standardSizes: item.standardSizes || "Custom / Standard",
      thickness: item.thickness || "15-25 mm",
      applications: item.applications || ["Wall Cladding", "Elevation"],
      finishes: item.finishes || ["Natural", "Honed"],
      image: item.image || "/branding/stone-tech-og-banner.png",
      price: item.price,
      badge: item.badge,
      isCustom: Boolean(item.isCustomUploaded),
      isActive: !isDeleted,
      discontinuedReason: isDeleted
        ? "This product has been removed from our standard catalogue. Special procurement request can be created for admin review."
        : undefined,
    };

    if (isDeleted) {
      discontinuedItems.push(unified);
    } else {
      activeItems.push(unified);
    }
  }

  return { activeItems, discontinuedItems };
}

export interface CatalogSearchResult {
  query: string;
  isDiscontinuedMatch: boolean;
  discontinuedMessage?: string;
  discontinuedItem?: UnifiedCatalogItem;
  matches: UnifiedCatalogItem[];
  matchedStoneTypes: string[];
  suggestedAnswer?: string;
}

/**
 * Searches the unified catalogue with intelligence:
 * 1. Discontinued product detection with the exact customer message requested.
 * 2. Real-time active product matching with full specifications.
 * 3. Stone variety and finish breakdowns.
 */
export function searchStonemanCatalog(
  query: string,
  customDeletedIds?: string[],
): CatalogSearchResult {
  const cleanQ = (query || "").trim().toLowerCase();
  const { activeItems, discontinuedItems } = getUnifiedCatalog(customDeletedIds);

  if (!cleanQ) {
    return {
      query: "",
      isDiscontinuedMatch: false,
      matches: activeItems.slice(0, 10),
      matchedStoneTypes: [
        "Granite",
        "Marble",
        "Sandstone",
        "Slate",
        "Quartzite",
        "Glass Bricks",
        "Flexible Clay",
        "Stone Veneer",
      ],
    };
  }

  // 1. Check for Discontinued / Removed Product match
  const matchedDiscontinued = discontinuedItems.find((item) => {
    const idMatch = item.id.toLowerCase() === cleanQ || cleanQ.includes(item.id.toLowerCase());
    const nameMatch =
      item.name.toLowerCase().includes(cleanQ) || cleanQ.includes(item.name.toLowerCase());
    const categoryMatch = item.category.toLowerCase().includes(cleanQ);

    // Also check known discontinued keywords
    const keywordMatch = KNOWN_DISCONTINUED_PRODUCTS.some(
      (k) =>
        k.id === item.id && k.keywords.some((kw) => cleanQ.includes(kw) || kw.includes(cleanQ)),
    );

    return idMatch || nameMatch || categoryMatch || keywordMatch;
  });

  if (matchedDiscontinued) {
    return {
      query,
      isDiscontinuedMatch: true,
      discontinuedItem: matchedDiscontinued,
      discontinuedMessage:
        "We don't deal in this product anymore—we used to! But if you specifically require this only and nothing else works out for you, I'll create a request to the admin about it.",
      matches: [],
      matchedStoneTypes: [],
      suggestedAnswer: `We used to supply ${matchedDiscontinued.name}, but it has been removed from our active production lineup. If this specific product is mandatory for your project, let me take your details one by one to create a special procurement request for our admin team.`,
    };
  }

  // 2. Search Active Products
  const terms = cleanQ.split(/\s+/).filter(Boolean);

  const scoredMatches = activeItems
    .map((item) => {
      let score = 0;
      const haystack = [
        item.id,
        item.name,
        item.category,
        item.stoneType,
        item.thickness,
        item.standardSizes,
        ...item.applications,
        ...item.finishes,
      ]
        .join(" ")
        .toLowerCase();

      // Exact phrase match
      if (haystack.includes(cleanQ)) score += 50;

      // Token matches
      for (const t of terms) {
        if (haystack.includes(t)) score += 10;
        if (item.name.toLowerCase().includes(t)) score += 15;
        if (item.id.toLowerCase() === t) score += 40;
        if (item.stoneType.toLowerCase().includes(t)) score += 12;
      }

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  const matchedStoneTypes = Array.from(
    new Set(scoredMatches.map((m) => m.stoneType).filter(Boolean)),
  ).slice(0, 8);

  // Generate an intelligent analytical answer from real catalogue data
  let suggestedAnswer: string | undefined = undefined;
  if (scoredMatches.length > 0) {
    const top = scoredMatches[0];
    const matchCount = scoredMatches.length;
    suggestedAnswer = `Found ${matchCount} verified catalogue ${matchCount === 1 ? "match" : "matches"}. Top recommendation: ${top.name} (${top.id}), crafted in genuine ${top.stoneType} for ${top.applications.slice(0, 2).join(" & ")}. Standard thickness: ${top.thickness}.`;
  }

  return {
    query,
    isDiscontinuedMatch: false,
    matches: scoredMatches.slice(0, 18),
    matchedStoneTypes,
    suggestedAnswer,
  };
}
