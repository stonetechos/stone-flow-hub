/**
 * Estimation Studio — template definitions for the four stone-industry workflows.
 * Each template controls which item categories, cost components and features are
 * visible in the New/Edit Estimate form. The template value is persisted on the
 * `estimates.template` column and never changes after creation.
 */
export type EstimateTemplateKey =
  | "material_supply"
  | "material_install"
  | "custom_articles"
  | "custom_manufacturing";

export type EstimateItemCategoryKey =
  | "material"
  | "manufacturing"
  | "installation"
  | "consumable"
  | "other";

export type CostComponentKind =
  | "adhesives"
  | "chemicals"
  | "sealer"
  | "packing"
  | "freight"
  | "other";

export interface EstimateTemplateConfig {
  key: EstimateTemplateKey;
  label: string;
  tagline: string;
  /** Item categories the wizard offers as tabs. */
  itemCategories: EstimateItemCategoryKey[];
  /** Extra cost buckets shown as a section. */
  costComponents: CostComponentKind[];
  /** WhatsApp / email opening line default. */
  defaultIntro: string;
}

export const ESTIMATE_TEMPLATES: Record<EstimateTemplateKey, EstimateTemplateConfig> = {
  material_supply: {
    key: "material_supply",
    label: "Material Supply",
    tagline: "Supply-only stone slabs, tiles or blocks.",
    itemCategories: ["material"],
    costComponents: ["packing", "freight", "other"],
    defaultIntro: "Please find our supply estimate for the requested natural stone material.",
  },
  material_install: {
    key: "material_install",
    label: "Material + Installation",
    tagline: "Material plus on-site fixing, sealing and finishing.",
    itemCategories: ["material", "installation", "consumable"],
    costComponents: ["adhesives", "chemicals", "sealer", "packing", "freight", "other"],
    defaultIntro:
      "Sharing our estimate covering material supply, installation and on-site consumables.",
  },
  custom_articles: {
    key: "custom_articles",
    label: "Custom Stone Articles",
    tagline: "Made-to-order carvings, medallions, temple articles.",
    itemCategories: ["material", "manufacturing", "consumable"],
    costComponents: ["packing", "freight", "other"],
    defaultIntro: "Please find our estimate for the custom stone article as per your drawing.",
  },
  custom_manufacturing: {
    key: "custom_manufacturing",
    label: "Custom Manufacturing Projects",
    tagline: "Turnkey CNC / waterjet / carved manufacturing scope.",
    itemCategories: ["material", "manufacturing", "installation", "consumable", "other"],
    costComponents: ["adhesives", "chemicals", "sealer", "packing", "freight", "other"],
    defaultIntro:
      "Sharing our project estimate covering material, manufacturing, and installation scope.",
  },
};

export const ESTIMATE_TEMPLATE_LIST: EstimateTemplateConfig[] = Object.values(ESTIMATE_TEMPLATES);

export const COST_COMPONENT_LABEL: Record<CostComponentKind, string> = {
  adhesives: "Adhesives",
  chemicals: "Chemicals",
  sealer: "Sealer",
  packing: "Packing",
  freight: "Freight",
  other: "Other",
};

export const ITEM_CATEGORY_LABEL: Record<EstimateItemCategoryKey, string> = {
  material: "Material",
  manufacturing: "Manufacturing",
  installation: "Installation",
  consumable: "Consumables",
  other: "Other",
};

export type PaymentScheduleKind = "75_25" | "80_20" | "custom";

export const PAYMENT_SCHEDULE_PRESETS: Record<
  PaymentScheduleKind,
  { label: string; rows: Array<{ label: string; pct: number; due_offset_days: number }> }
> = {
  "75_25": {
    label: "75 / 25",
    rows: [
      { label: "Advance (before dispatch)", pct: 75, due_offset_days: 0 },
      { label: "Balance (against delivery)", pct: 25, due_offset_days: 15 },
    ],
  },
  "80_20": {
    label: "80 / 20",
    rows: [
      { label: "Advance (with PO)", pct: 80, due_offset_days: 0 },
      { label: "Balance (against delivery)", pct: 20, due_offset_days: 15 },
    ],
  },
  custom: {
    label: "Custom",
    rows: [{ label: "Advance", pct: 100, due_offset_days: 0 }],
  },
};
