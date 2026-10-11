import { z } from "zod";
import { zRequired, zOptional, zMobile, zEmail } from "@/lib/zod";

export const VENDOR_WORK_TYPES = [
  { value: "handcrafter", label: "Handcrafter" },
  { value: "cnc_works", label: "CNC Works" },
  { value: "polishing_work", label: "Polishing Work" },
  { value: "artwork", label: "Artwork" },
] as const;

export type VendorWorkType = (typeof VENDOR_WORK_TYPES)[number]["value"];

export const VENDOR_PRODUCT_OPTIONS = [
  // Slabs & Stone Types
  { value: "italian_marble_slabs", label: "Italian Marble Slabs" },
  { value: "indian_marble_slabs", label: "Indian Marble Slabs" },
  { value: "granite_slabs", label: "Granite Slabs" },
  { value: "limestone_slabs", label: "Limestone Slabs" },
  { value: "cobblestone", label: "Cobblestone" },
  { value: "pebblestone", label: "Pebblestone" },
  { value: "boulders", label: "Boulders" },
  { value: "sculptures", label: "Sculptures" },
  { value: "custom_stone_basins", label: "Custom Stone Basins" },
  { value: "agate_stone_articles", label: "Agate Stone Articles" },
  { value: "waterfall", label: "Waterfall" },
  { value: "fountain", label: "Fountain" },
  { value: "temple_work_handcrafting", label: "Temple Work Handcrafting" },
  // Cladding, Flooring & Special Articles
  { value: "natural_stone_cladding_tiles", label: "Natural Stone Cladding Tiles" },
  { value: "natural_stone_interlocking_panels", label: "Natural Stone Interlocking Panels" },
  { value: "natural_stone_mosaics", label: "Natural Stone Mosaics" },
  { value: "stone_murals", label: "Stone Murals" },
  { value: "inlay_work", label: "Inlay Work" },
  { value: "table_top", label: "Table Top" },
  { value: "custom_stone_cladding", label: "Custom Stone Cladding" },
  { value: "crazy_pattern_in_stone", label: "Crazy Pattern in Stone" },
  { value: "general_flooring", label: "General Flooring" },
  { value: "custom_flooring", label: "Custom Flooring" },
  { value: "stepping_stone", label: "Stepping Stone" },
  { value: "stone_veneer", label: "Stone Veneer" },
  { value: "clay_veneers", label: "Clay Veneers" },
  { value: "pu_panels", label: "PU Panels" },
  { value: "stone_veneer_artwork", label: "Stone Veneer Artwork" },
  { value: "agate_slabs", label: "Agate Slabs" },
] as const;

export type VendorProductOption = (typeof VENDOR_PRODUCT_OPTIONS)[number]["value"];

export function getVendorProductLabel(key: string): string {
  const found = VENDOR_PRODUCT_OPTIONS.find((p) => p.value === key);
  if (found) return found.label;
  if (key === "granite_slabs_slabs") return "Granite Slabs";
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const vendorCreateSchema = z.object({
  // Quick Fill
  company_name: zRequired("Vendor company"),
  contact_name: zRequired("Contact person"),
  mobile: zMobile,

  // Products Dealt In & Capabilities
  products_dealt: z.array(z.string()).default([]),
  work_types: z.array(z.string()).default([]),

  // More Details
  email: zEmail,
  city: zOptional(),

  // Advanced
  address: zOptional(),
  state: zOptional(),
  pincode: zOptional(),
  gst_number: zOptional(),
  payment_terms: zOptional(),
  notes: zOptional(),
});

export type VendorCreateInput = z.infer<typeof vendorCreateSchema>;
