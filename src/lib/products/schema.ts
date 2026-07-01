import { z } from "zod";
import { zRequired, zOptional } from "@/lib/zod";
import type { DbEnum } from "@/lib/types";

export const PRODUCT_UNITS: ReadonlyArray<{ value: DbEnum<"product_unit">; label: string }> = [
  { value: "sqft",      label: "sq ft" },
  { value: "sqm",       label: "sq m" },
  { value: "piece",     label: "Piece" },
  { value: "slab",      label: "Slab" },
  { value: "linear_ft", label: "Linear ft" },
  { value: "linear_m",  label: "Linear m" },
  { value: "cbm",       label: "CBM" },
];

export const STONE_TYPES: ReadonlyArray<{ value: DbEnum<"stone_type">; label: string }> = [
  { value: "marble",     label: "Marble" },
  { value: "granite",    label: "Granite" },
  { value: "quartz",     label: "Quartz" },
  { value: "sandstone",  label: "Sandstone" },
  { value: "limestone",  label: "Limestone" },
  { value: "travertine", label: "Travertine" },
  { value: "onyx",       label: "Onyx" },
  { value: "slate",      label: "Slate" },
  { value: "engineered", label: "Engineered" },
  { value: "other",      label: "Other" },
];

export const STONE_FINISHES: ReadonlyArray<{ value: DbEnum<"stone_finish">; label: string }> = [
  { value: "polished",       label: "Polished" },
  { value: "honed",          label: "Honed" },
  { value: "leather",        label: "Leather" },
  { value: "flamed",         label: "Flamed" },
  { value: "brushed",        label: "Brushed" },
  { value: "sandblasted",    label: "Sandblasted" },
  { value: "bush_hammered",  label: "Bush hammered" },
  { value: "antique",        label: "Antique" },
  { value: "other",          label: "Other" },
];

export const productCreateSchema = z.object({
  // Quick Fill
  name: zRequired("Product name"),
  stone_type: z.enum([
    "marble", "granite", "quartz", "sandstone", "limestone",
    "travertine", "onyx", "slate", "engineered", "other",
  ]).default("marble"),

  // More Details
  default_unit: z.enum([
    "sqft", "sqm", "piece", "slab", "linear_ft", "linear_m", "cbm",
  ]).default("sqft"),
  finish: z.enum([
    "polished", "honed", "leather", "flamed", "brushed",
    "sandblasted", "bush_hammered", "antique", "other",
  ]).optional().nullable(),
  category_id: z.string().uuid().nullable().optional(),

  // Advanced
  thickness_mm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().nonnegative().nullable().optional(),
  ),
  origin_country: zOptional(),
  hsn_code: zOptional(),
  description: zOptional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
