/**
 * Central configuration for all stone-industry master tables. Drives the shared
 * <MasterListPage /> so the 12 master routes reduce to a table name + a few
 * extra columns each.
 */
export type MasterField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "textarea";
  required?: boolean;
  placeholder?: string;
  hint?: string;
};

export type MasterConfig = {
  table:
    | "stone_types"
    | "stone_colours"
    | "surface_finishes"
    | "edge_finishes"
    | "stone_origins"
    | "applications"
    | "thicknesses"
    | "product_families"
    | "manufacturing_stages"
    | "quality_grades"
    | "packaging_types"
    | "uoms"
    | "qc_templates";
  route: string;
  title: string;
  singular: string;
  description: string;
  extraFields: MasterField[];
  // Extra columns to render in the table (besides code + name + status)
  extraColumns: { key: string; label: string }[];
};

const COMMON = {
  code: { key: "code", label: "Code", type: "text" as const, required: true, hint: "Short unique code (e.g. MARBLE-WHITE)" },
  name: { key: "name", label: "Name", type: "text" as const, required: true },
  sort_order: { key: "sort_order", label: "Sort order", type: "number" as const },
  notes: { key: "notes", label: "Notes", type: "textarea" as const },
};

export const MASTER_CONFIGS: MasterConfig[] = [
  {
    table: "stone_types",
    route: "stone-types",
    title: "Stone Types",
    singular: "Stone Type",
    description: "Marble, Granite, Sandstone, Limestone, Quartzite, Onyx…",
    extraFields: [
      { key: "mohs_hardness", label: "Mohs hardness", type: "number" },
      { key: "density_kg_m3", label: "Density (kg/m³)", type: "number" },
      { key: "water_absorption_pct", label: "Water absorption %", type: "number" },
    ],
    extraColumns: [{ key: "mohs_hardness", label: "Mohs" }],
  },
  {
    table: "stone_colours",
    route: "stone-colours",
    title: "Stone Colours",
    singular: "Stone Colour",
    description: "Named colour families used across catalogues and quotes.",
    extraFields: [
      { key: "family", label: "Colour family", type: "text", placeholder: "white / beige / black…" },
      { key: "hex", label: "Hex sample", type: "text", placeholder: "#eeeeee" },
    ],
    extraColumns: [
      { key: "family", label: "Family" },
      { key: "hex", label: "Hex" },
    ],
  },
  {
    table: "surface_finishes",
    route: "surface-finishes",
    title: "Surface Finishes",
    singular: "Surface Finish",
    description: "Polished, Honed, Leather, Flamed, Rockface, Bush Hammer…",
    extraFields: [],
    extraColumns: [],
  },
  {
    table: "edge_finishes",
    route: "edge-finishes",
    title: "Edge Finishes",
    singular: "Edge Finish",
    description: "Bullnose, Bevel, Ogee, Mitre, Chamfer…",
    extraFields: [],
    extraColumns: [],
  },
  {
    table: "stone_origins",
    route: "stone-origins",
    title: "Stone Origins",
    singular: "Stone Origin",
    description: "Quarry region / country of origin.",
    extraFields: [
      { key: "country", label: "Country", type: "text" },
      { key: "region", label: "Region", type: "text" },
    ],
    extraColumns: [
      { key: "country", label: "Country" },
      { key: "region", label: "Region" },
    ],
  },
  {
    table: "applications",
    route: "applications",
    title: "Applications",
    singular: "Application",
    description: "Interior, Exterior, Cladding, Flooring, Countertop, Wet Area…",
    extraFields: [],
    extraColumns: [],
  },
  {
    table: "thicknesses",
    route: "thicknesses",
    title: "Thicknesses",
    singular: "Thickness",
    description: "Standard slab / tile thicknesses in mm.",
    extraFields: [
      { key: "mm", label: "Millimetres", type: "number", required: true },
    ],
    extraColumns: [{ key: "mm", label: "mm" }],
  },
  {
    table: "product_families",
    route: "product-families",
    title: "Product Families",
    singular: "Product Family",
    description: "Mosaic, Interlocking Panel, Veneer, Mural, CNC Artwork, Inlay…",
    extraFields: [],
    extraColumns: [],
  },
  {
    table: "manufacturing_stages",
    route: "manufacturing-stages",
    title: "Manufacturing Stages",
    singular: "Manufacturing Stage",
    description: "Workflow steps auto-seeded onto each production order.",
    extraFields: [
      { key: "default_duration_hours", label: "Default duration (hrs)", type: "number" },
    ],
    extraColumns: [{ key: "default_duration_hours", label: "Hrs" }],
  },
  {
    table: "quality_grades",
    route: "quality-grades",
    title: "Quality Grades",
    singular: "Quality Grade",
    description: "Commercial / Standard / Premium / Export…",
    extraFields: [
      { key: "rank", label: "Rank", type: "number", hint: "Higher = better" },
    ],
    extraColumns: [{ key: "rank", label: "Rank" }],
  },
  {
    table: "packaging_types",
    route: "packaging-types",
    title: "Packaging Types",
    singular: "Packaging Type",
    description: "Wooden crate, Fumigated crate, Pallet, Carton, Bundle…",
    extraFields: [
      { key: "typical_weight_kg", label: "Typical weight (kg)", type: "number" },
    ],
    extraColumns: [{ key: "typical_weight_kg", label: "Weight (kg)" }],
  },
  {
    table: "uoms",
    route: "uoms",
    title: "Units of Measurement",
    singular: "Unit",
    description: "Sqft, Sqm, Piece, Kg, Ton, Linear m…",
    extraFields: [
      { key: "symbol", label: "Symbol", type: "text", required: true },
      { key: "dimension", label: "Dimension", type: "text", placeholder: "area / length / mass / count" },
    ],
    extraColumns: [
      { key: "symbol", label: "Symbol" },
      { key: "dimension", label: "Dimension" },
    ],
  },
  {
    table: "qc_templates",
    route: "qc-templates",
    title: "QC Templates",
    singular: "QC Template",
    description: "Reusable QC checklists (surface, dimension, thickness, edge, colour, crack, packing, dispatch).",
    extraFields: [
      { key: "category", label: "Category", type: "text", required: true, placeholder: "surface / dimension / thickness / edge / colour / crack / packing / dispatch" },
    ],
    extraColumns: [{ key: "category", label: "Category" }],
  },
];

export const COMMON_FIELDS = [COMMON.code, COMMON.name];
export const COMMON_TRAILING_FIELDS = [COMMON.sort_order, COMMON.notes];

export function masterByRoute(route: string): MasterConfig | undefined {
  return MASTER_CONFIGS.find((m) => m.route === route);
}
