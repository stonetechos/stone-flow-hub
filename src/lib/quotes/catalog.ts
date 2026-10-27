/**
 * Unified Stone Tech Master Catalog: Stone Products, Adhesives & Sealers.
 *
 * Integrates all Estimate Studio calculators, architectural stone claddings,
 * adhesives, and sealers into a single searchable catalog for quotation
 * line items and delivery challans.
 */

export interface CatalogItem {
  id: string;
  name: string;
  category: "stone_product" | "adhesive" | "sealer" | "labour" | "carting";
  defaultUnit: string;
  defaultPrice?: number;
  hsnCode?: string;
  defaultTaxPct?: number;
  description?: string;
}

export const STONE_PRODUCTS_CATALOG: CatalogItem[] = [
  {
    id: "sp_table_top",
    name: "Table Top",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "6802",
  },
  {
    id: "sp_crazy_pattern",
    name: "Crazy Pattern in Stone",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_custom_flooring",
    name: "Custom Flooring",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_stone_veneer",
    name: "Stone Veneer",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_pu_panels",
    name: "PU Panels",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "3925",
  },
  {
    id: "sp_agate_slabs",
    name: "Agate Slabs",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "7103",
  },
  {
    id: "sp_custom_stone_cladding",
    name: "Custom Stone Cladding",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_general_flooring",
    name: "General Flooring",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_stepping_stone",
    name: "Stepping Stone",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "6802",
  },
  {
    id: "sp_clay_veneers",
    name: "Clay Veneers",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6904",
  },
  {
    id: "sp_stone_veneer_artwork",
    name: "Stone Veneer Artwork",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_temple_work",
    name: "Temple Work Handcrafting",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_interlocking_panels",
    name: "Natural Stone Interlocking Panels",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_stone_murals",
    name: "Stone Murals",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_cladding_tiles",
    name: "Natural Stone Cladding Tiles",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_stone_mosaics",
    name: "Natural Stone Mosaics",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_inlay_work",
    name: "Inlay Work",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6802",
  },
  {
    id: "sp_italian_marble_slabs",
    name: "Italian Marble Slabs",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "2515",
  },
  {
    id: "sp_granite_slabs",
    name: "Granite Slabs",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "2516",
  },
  {
    id: "sp_cobblestone",
    name: "Cobblestone",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "6801",
  },
  {
    id: "sp_boulders",
    name: "Boulders",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "6802",
  },
  {
    id: "sp_custom_stone_basins",
    name: "Custom Stone Basins",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "6802",
  },
  {
    id: "sp_waterfall",
    name: "Waterfall",
    category: "stone_product",
    defaultUnit: "unit",
    hsnCode: "6802",
  },
  {
    id: "sp_indian_marble_slabs",
    name: "Indian Marble Slabs",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "2515",
  },
  {
    id: "sp_limestone_slabs",
    name: "Limestone Slabs",
    category: "stone_product",
    defaultUnit: "sqft",
    hsnCode: "2515",
  },
  {
    id: "sp_pebblestone",
    name: "Pebblestone",
    category: "stone_product",
    defaultUnit: "kg",
    hsnCode: "2517",
  },
  {
    id: "sp_artwork",
    name: "Artwork",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "9703",
  },
  {
    id: "sp_sculptures",
    name: "Sculptures",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "6802",
  },
  {
    id: "sp_agate_stone_articles",
    name: "Agate Stone Articles",
    category: "stone_product",
    defaultUnit: "pcs",
    hsnCode: "7103",
  },
  {
    id: "sp_fountain",
    name: "Fountain",
    category: "stone_product",
    defaultUnit: "unit",
    hsnCode: "6802",
  },
];

export const ADHESIVES_CATALOG: CatalogItem[] = [
  {
    id: "adh_cement_white",
    name: "Standard Cement Based Stone Adhesive White",
    category: "adhesive",
    defaultUnit: "bag",
    defaultPrice: 900,
    hsnCode: "32141000",
    defaultTaxPct: 18,
  },
  {
    id: "adh_cementitious_grey",
    name: "Standard Cementitious Stone Adhesive Grey",
    category: "adhesive",
    defaultUnit: "bag",
    defaultPrice: 800,
    hsnCode: "32141000",
    defaultTaxPct: 18,
  },
  {
    id: "adh_no_limit_grey",
    name: "No-Limit Grey",
    category: "adhesive",
    defaultUnit: "bag",
    defaultPrice: 1650,
    hsnCode: "35069190",
    defaultTaxPct: 18,
  },
  {
    id: "adh_no_limit_white",
    name: "No-Limit White",
    category: "adhesive",
    defaultUnit: "bag",
    defaultPrice: 1650,
    hsnCode: "35069190",
    defaultTaxPct: 18,
  },
  {
    id: "adh_pu_based",
    name: "PU Based Adhesive",
    category: "adhesive",
    defaultUnit: "bucket",
    defaultPrice: 1650,
    hsnCode: "35069190",
    defaultTaxPct: 18,
  },
];

export const SEALERS_CATALOG: CatalogItem[] = [
  {
    id: "seal_water_based",
    name: "Water Based Water Repellent",
    category: "sealer",
    defaultUnit: "ltr",
    defaultPrice: 1700,
    hsnCode: "38249900",
    defaultTaxPct: 18,
  },
  {
    id: "seal_solvent_oil_dust",
    name: "Solvent Based Water Oil and Dust Repellent",
    category: "sealer",
    defaultUnit: "ltr",
    defaultPrice: 2500,
    hsnCode: "38249900",
    defaultTaxPct: 18,
  },
  {
    id: "seal_wetlook",
    name: "Wetlook Sealer",
    category: "sealer",
    defaultUnit: "ltr",
    defaultPrice: 3000,
    hsnCode: "38249900",
    defaultTaxPct: 18,
  },
  {
    id: "seal_back_coat",
    name: "Back Coat",
    category: "sealer",
    defaultUnit: "ltr",
    defaultPrice: 3000,
    hsnCode: "38249900",
    defaultTaxPct: 18,
  },
  {
    id: "seal_film_forming",
    name: "Film Forming Surface Sealers",
    category: "sealer",
    defaultUnit: "ltr",
    defaultPrice: 3000,
    hsnCode: "38249900",
    defaultTaxPct: 18,
  },
  {
    id: "seal_anti_graffiti",
    name: "Anti-Graffiti",
    category: "sealer",
    defaultUnit: "ltr",
    defaultPrice: 5500,
    hsnCode: "38249900",
    defaultTaxPct: 18,
  },
];

export const SERVICES_CATALOG: CatalogItem[] = [
  {
    id: "srv_installation_labour",
    name: "Installation Labour",
    category: "labour",
    defaultUnit: "sqft",
    defaultPrice: 80,
    hsnCode: "9954",
    defaultTaxPct: 18,
  },
  {
    id: "srv_sealer_application_labour",
    name: "Sealer Application Labour",
    category: "labour",
    defaultUnit: "sqft",
    defaultPrice: 10,
    hsnCode: "9954",
    defaultTaxPct: 18,
  },
];

export const CARTING_CATALOG: CatalogItem[] = [
  {
    id: "cart_local_transportation",
    name: "Local Carting & Transportation",
    category: "carting",
    defaultUnit: "trip",
    defaultPrice: 1500,
    hsnCode: "9965",
    defaultTaxPct: 5,
    description: "Local tempo / truck transport from factory or yard to project site",
  },
  {
    id: "cart_site_delivery_freight",
    name: "Site Delivery & Freight",
    category: "carting",
    defaultUnit: "trip",
    defaultPrice: 2000,
    hsnCode: "9965",
    defaultTaxPct: 5,
    description: "Dedicated transport and delivery to customer site",
  },
  {
    id: "cart_unloading_shifting",
    name: "Site Unloading & Shifting Labour",
    category: "carting",
    defaultUnit: "lot",
    defaultPrice: 1000,
    hsnCode: "9965",
    defaultTaxPct: 5,
    description: "Manual unloading and shifting of stone slabs at site",
  },
  {
    id: "cart_on_actuals",
    name: "Carting & Transportation (On Actuals)",
    category: "carting",
    defaultUnit: "trip",
    defaultPrice: 0,
    hsnCode: "9965",
    defaultTaxPct: 5,
    description: "Transportation charges on actual transporter receipt / billed separately",
  },
];

export const MASTER_PRODUCT_CATALOG: CatalogItem[] = [
  ...STONE_PRODUCTS_CATALOG,
  ...ADHESIVES_CATALOG,
  ...SEALERS_CATALOG,
  ...SERVICES_CATALOG,
  ...CARTING_CATALOG,
];

export function findCatalogItemByName(name: string): CatalogItem | undefined {
  const clean = name.trim().toLowerCase();
  return MASTER_PRODUCT_CATALOG.find(
    (item) => item.name.toLowerCase() === clean || item.name.toLowerCase().includes(clean),
  );
}
