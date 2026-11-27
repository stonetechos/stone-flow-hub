export interface ProductOption {
  id: string;
  name: string;
  tagline: string;
  popular?: boolean;
}

export const MASTER_PRODUCT_OPTIONS: ProductOption[] = [
  // Slabs & Stone Types
  {
    id: "italian_marble_slabs",
    name: "Italian Marble Slabs",
    tagline: "Statuario, Botticino, Grey William & Michaelangelo",
    popular: true,
  },
  {
    id: "indian_marble_slabs",
    name: "Indian Marble Slabs",
    tagline: "Makrana Pure White, Banswara & Morwad",
  },
  {
    id: "limestone_slabs",
    name: "Limestone Slabs",
    tagline: "Kota Blue, Kota Brown, Tandur Yellow & Shahabad",
  },
  {
    id: "granite_slabs",
    name: "Granite Slabs",
    tagline: "Black Galaxy, Tan Brown, Rajasthan Black & Steel Grey",
  },
  {
    id: "sandstone_slabs",
    name: "Sandstone Slabs",
    tagline: "Gwalior Mint, Dholpur Beige, Teakwood & Rainbow",
  },
  // Wall Cladding & Exterior Facades
  {
    id: "natural_stone_wall_cladding",
    name: "Natural Stone Wall Cladding",
    tagline: "275+ Strips, Rockface, Grooved & Fluted Textures",
    popular: true,
  },
  {
    id: "stone_veneers",
    name: "Stone Veneers",
    tagline: "Ultra-Thin 1.5-2.0mm Flexible Sheets, 98+ Slate Shades",
    popular: true,
  },
  {
    id: "translucent_stone_veneers",
    name: "Translucent Stone Veneers",
    tagline: "Backlit Illumination Sheets for Counters, Bars & Ceilings",
  },
  {
    id: "flexible_clay_veneers",
    name: "Flexible Clay Veneers",
    tagline: "Lightweight Zero-Fire Eco Slabs, Earth Tones",
  },
  {
    id: "glass_bricks",
    name: "Glass Bricks & Blocks",
    tagline: "Solid Crystal, Hollow Cloud & Amber Designer Bricks",
  },
  // Craftsmanship & Artistic Stone Works
  {
    id: "cnc_mandir_murals",
    name: "CNC Mandir Murals & Jaali",
    tagline: "3D Carved Radha Krishna, Ganesha, Om & Sacred Geometry",
    popular: true,
  },
  {
    id: "stone_fountains",
    name: "Fountains & Waterfalls",
    tagline: "Tiered Courtyard Fountains & Cascading Sheet Water Walls",
  },
  {
    id: "stone_sculptures",
    name: "Sculptures & Artworks",
    tagline: "Hand-chiseled Artefacts, Deity Idols & Contemporary Art",
  },
  {
    id: "stone_basins",
    name: "Custom Stone Basins & Sinks",
    tagline: "Monolithic Riverstone, Onyx & Marble Handcrafted Washbasins",
  },
  // Landscaping & Paving
  {
    id: "cobblestone_paving",
    name: "Cobblestones & Driveway Sets",
    tagline: "Hand-cut Basalt, Granite & Sandstone Cubes",
  },
  {
    id: "stone_pebbles",
    name: "Stone Pebbles & Boulders",
    tagline: "Polished River Onyx, Snow White, Black & Volcanic Stones",
  },
];

export const matchMasterProduct = (rawName: string): string => {
  const trimmed = rawName.trim().toLowerCase();
  const direct = MASTER_PRODUCT_OPTIONS.find((p) => p.name.toLowerCase() === trimmed);
  if (direct) return direct.name;

  if (trimmed.includes("italian")) {
    return "Italian Marble Slabs";
  }
  if (trimmed.includes("indian") && trimmed.includes("marble")) {
    return "Indian Marble Slabs";
  }
  if (trimmed.includes("limestone")) {
    return "Limestone Slabs";
  }
  if (trimmed.includes("cobble")) {
    return "Cobblestone";
  }
  if (trimmed.includes("pebble")) {
    return "Pebblestone";
  }
  if (trimmed.includes("boulder")) {
    return "Boulders";
  }
  if (trimmed.includes("sculpt")) {
    return "Sculptures";
  }
  if (trimmed.includes("artwork") || trimmed.includes("art piece")) {
    return "Artwork";
  }
  if (trimmed.includes("basin") || trimmed.includes("sink")) {
    return "Custom Stone Basins";
  }
  if (trimmed.includes("waterfall")) {
    return "Waterfall";
  }
  if (trimmed.includes("fountain")) {
    return "Fountain";
  }
  if (trimmed.includes("temple") || trimmed.includes("mandir")) {
    return "Temple Work Handcrafting";
  }
  if (trimmed.includes("clay") || trimmed.includes("fcv")) {
    return "Clay Veneers";
  }
  if (trimmed.includes("glass") || trimmed.includes("brick")) {
    return "Glass Bricks";
  }
  if (trimmed.includes("veneer") || trimmed.includes("slim") || trimmed.includes("sheet")) {
    return "Stone Veneer";
  }
  if (
    trimmed.includes("cladding") ||
    trimmed.includes("elevation") ||
    trimmed.includes("facade") ||
    trimmed.includes("sandstone")
  ) {
    return "Custom Stone Cladding";
  }
  if (trimmed.includes("interlock") || trimmed.includes("ledge") || trimmed.includes("panel")) {
    return "Natural Stone Interlocking Panels";
  }
  if (trimmed.includes("mosaic") || trimmed.includes("brass") || trimmed.includes("waterjet")) {
    return "Natural Stone Mosaics";
  }
  if (trimmed.includes("inlay")) {
    return "Inlay Work";
  }
  if (trimmed.includes("mural") || trimmed.includes("carv") || trimmed.includes("jaali")) {
    return "Stone Murals";
  }
  if (trimmed.includes("crazy")) {
    return "Crazy Pattern in Stone";
  }
  if (trimmed.includes("floor") || trimmed.includes("marble") || trimmed.includes("granite")) {
    return "Custom Flooring";
  }
  if (
    trimmed.includes("table") ||
    trimmed.includes("counter") ||
    trimmed.includes("island") ||
    trimmed.includes("vanity")
  ) {
    return "Table Top";
  }
  if (
    trimmed.includes("pu ") ||
    trimmed.includes("polyurethane") ||
    trimmed.includes("lightweight")
  ) {
    return "PU Panels";
  }
  if (
    trimmed.includes("step") ||
    trimmed.includes("landscape") ||
    trimmed.includes("garden") ||
    trimmed.includes("pathway") ||
    trimmed.includes("paver")
  ) {
    return "Stepping Stone";
  }
  if (
    trimmed.includes("agate") ||
    trimmed.includes("onyx") ||
    trimmed.includes("semi-precious") ||
    trimmed.includes("backlit") ||
    trimmed.includes("gem")
  ) {
    return "Agate Slabs";
  }

  return "Custom Stone Cladding";
};
