/**
 * Work & Supply Partners Directory (STOS).
 *
 * Unifies all people and partner entities associated with Stone Tech for work and supply:
 *  - Supplying Partners (Quarries, marble, granite, sandstone, slabs)
 *  - Artwork Partners (Stone murals, sculptures, inlay work, handcrafting artisans, CNC)
 *  - Application Partners (Site installation teams, fixing masters, cladding applicators)
 *  - Chemical Partners (Adhesive, sealer, impregnator, epoxy, cleaning agencies)
 *  - Transport Partners (Carting, freight, truck logistics, crane operators)
 *  - Machinery & Tooling Partners (Diamond blades, polishing pads, CNC bits)
 */

import {
  listVendors,
  getVendorPhone,
  getVendorContactName,
  extractVendorMetadata,
  type VendorRow,
} from "@/lib/vendors/api";
import {
  listInstallationAgencies,
  AGENCY_WORK_TYPES,
  type InstallationAgencyRow,
} from "@/lib/installation-agencies/api";
import { listCartingAgencies, type CartingAgencyRow } from "@/lib/purchase-transportation/api";
import { getVendorProductLabel } from "@/lib/vendors/schema";

export type AssociatedPartnerCategory =
  | "supplying_partner"
  | "artwork_partner"
  | "application_partner"
  | "chemical_partner"
  | "transport_partner"
  | "tooling_partner";

export interface PartnerCategoryConfig {
  key: AssociatedPartnerCategory;
  value: AssociatedPartnerCategory;
  label: string;
  singular: string;
  shortLabel: string;
  description: string;
  badgeTone: string;
  dotColor: string;
  iconName: string;
  icon: string;
}

export const PARTNER_CATEGORIES: Record<AssociatedPartnerCategory, PartnerCategoryConfig> = {
  supplying_partner: {
    key: "supplying_partner",
    value: "supplying_partner",
    label: "Supplying Partners",
    singular: "Supplying Partner",
    shortLabel: "Suppliers",
    description: "Quarry, stone processing, marble, granite, sandstone, and raw slab suppliers.",
    badgeTone: "bg-emerald-100/90 text-emerald-900 border-emerald-300 font-semibold",
    dotColor: "bg-emerald-600",
    iconName: "Factory",
    icon: "🏛️",
  },
  artwork_partner: {
    key: "artwork_partner",
    value: "artwork_partner",
    label: "Artwork Partners",
    singular: "Artwork Partner",
    shortLabel: "Artwork",
    description: "Stone murals, sculptures, inlay work, carving masters, and CNC artisans.",
    badgeTone: "bg-violet-100/90 text-violet-900 border-violet-300 font-semibold",
    dotColor: "bg-violet-600",
    iconName: "Sparkles",
    icon: "🎨",
  },
  application_partner: {
    key: "application_partner",
    value: "application_partner",
    label: "Application Partners",
    singular: "Application Partner",
    shortLabel: "Application",
    description: "Site installation, fixing masters, dry cladding, flooring, and masonry teams.",
    badgeTone: "bg-blue-100/90 text-blue-900 border-blue-300 font-semibold",
    dotColor: "bg-blue-600",
    iconName: "HardHat",
    icon: "👷",
  },
  chemical_partner: {
    key: "chemical_partner",
    value: "chemical_partner",
    label: "Chemical Partners",
    singular: "Chemical Partner",
    shortLabel: "Chemicals",
    description: "Adhesives, stone sealers, impregnators, epoxies, and stone care agencies.",
    badgeTone: "bg-amber-100/90 text-amber-950 border-amber-300 font-semibold",
    dotColor: "bg-amber-600",
    iconName: "FlaskConical",
    icon: "🧪",
  },
  transport_partner: {
    key: "transport_partner",
    value: "transport_partner",
    label: "Transport Partners",
    singular: "Transport Partner",
    shortLabel: "Transport",
    description: "Carting agencies, truck freight, site delivery, and crane unloading operators.",
    badgeTone: "bg-sky-100/90 text-sky-950 border-sky-300 font-semibold",
    dotColor: "bg-sky-600",
    iconName: "Truck",
    icon: "🚚",
  },
  tooling_partner: {
    key: "tooling_partner",
    value: "tooling_partner",
    label: "Machinery & Tooling Partners",
    singular: "Machinery Partner",
    shortLabel: "Tooling",
    description: "Diamond saw blades, polishing pads, CNC bits, bridge saw, and tooling providers.",
    badgeTone: "bg-slate-100 text-slate-800 border-slate-300 font-semibold",
    dotColor: "bg-slate-600",
    iconName: "Wrench",
    icon: "🔧",
  },
};

export interface AssociatedPerson {
  id: string;
  sourceType: "vendor" | "installation_agency" | "carting_agency";
  code: string;
  name: string; // Company / Entity Name
  contactPerson: string; // Person associated
  phone: string;
  category: AssociatedPartnerCategory;
  categoryLabel: string;
  categoryBadgeTone: string;
  dotColor: string;
  city: string;
  skills: string[];
  notes?: string;
  isActive: boolean;
  linkUrl: string;
  createdAt?: string;
}

/**
 * Detects the partner category for a vendor row using explicit metadata or smart keywords.
 */
export function detectVendorPartnerCategory(vendor: VendorRow): AssociatedPartnerCategory {
  const meta = extractVendorMetadata(vendor);
  const companyLower = (vendor.company_name || "").toLowerCase();
  const contactLower = (getVendorContactName(vendor) || "").toLowerCase();
  const notesLower = (vendor.notes || "").toLowerCase();

  // 1. Explicit partner type if saved in external_ref
  const ext = (vendor.external_ref as Record<string, unknown> | null) ?? {};
  if (typeof ext.partner_category === "string" && ext.partner_category in PARTNER_CATEGORIES) {
    return ext.partner_category as AssociatedPartnerCategory;
  }

  // 2. Chemical / Adhesive / Sealer check
  const hasChemicalProducts = meta.products_dealt.some((p) => {
    const pl = p.toLowerCase();
    return (
      pl.includes("adhesive") ||
      pl.includes("sealer") ||
      pl.includes("chemical") ||
      pl.includes("epoxy") ||
      pl.includes("grout") ||
      pl.includes("impregnat")
    );
  });
  if (
    hasChemicalProducts ||
    meta.work_types.includes("chemicals") ||
    companyLower.includes("adhesive") ||
    companyLower.includes("chemical") ||
    companyLower.includes("sealer") ||
    companyLower.includes("epoxy") ||
    companyLower.includes("tenax") ||
    companyLower.includes("laticrete") ||
    companyLower.includes("ardex") ||
    notesLower.includes("adhesive") ||
    notesLower.includes("sealer") ||
    notesLower.includes("chemical") ||
    notesLower.includes("impregnat")
  ) {
    return "chemical_partner";
  }

  // 3. Artwork & Handcrafters check
  const hasArtworkProducts = meta.products_dealt.some((p) => {
    const pl = p.toLowerCase();
    return (
      pl.includes("mural") ||
      pl.includes("sculpture") ||
      pl.includes("artwork") ||
      pl.includes("inlay") ||
      pl.includes("carv") ||
      pl.includes("temple") ||
      pl.includes("basin")
    );
  });
  if (
    hasArtworkProducts ||
    meta.work_types.includes("artwork") ||
    meta.work_types.includes("handcrafter") ||
    meta.work_types.includes("cnc_works") ||
    companyLower.includes("art") ||
    companyLower.includes("mural") ||
    companyLower.includes("carv") ||
    companyLower.includes("sculpt") ||
    companyLower.includes("handicraft") ||
    companyLower.includes("inlay") ||
    notesLower.includes("mural") ||
    notesLower.includes("carv") ||
    notesLower.includes("sculpt")
  ) {
    return "artwork_partner";
  }

  // 4. Installation & Application check
  if (
    meta.work_types.includes("installation") ||
    meta.work_types.includes("polishing_work") ||
    companyLower.includes("install") ||
    companyLower.includes("fixing") ||
    companyLower.includes("cladding") ||
    companyLower.includes("flooring") ||
    notesLower.includes("install") ||
    notesLower.includes("cladding") ||
    notesLower.includes("flooring")
  ) {
    return "application_partner";
  }

  // 5. Transport check
  if (
    meta.work_types.includes("carting") ||
    companyLower.includes("transport") ||
    companyLower.includes("logistics") ||
    companyLower.includes("roadways") ||
    companyLower.includes("freight")
  ) {
    return "transport_partner";
  }

  // 6. Tooling check
  if (
    companyLower.includes("diamond") ||
    companyLower.includes("blade") ||
    companyLower.includes("tool") ||
    companyLower.includes("abrasive")
  ) {
    return "tooling_partner";
  }

  // Default: Supplying Partner (Stone / Quarry / Slabs)
  return "supplying_partner";
}

/**
 * Normalizes a vendor row into an AssociatedPerson representation.
 */
export function vendorToAssociatedPerson(v: VendorRow): AssociatedPerson {
  const meta = extractVendorMetadata(v);
  const category = detectVendorPartnerCategory(v);
  const config = PARTNER_CATEGORIES[category];
  const phone = (v.mobile_number && v.mobile_number.trim()) || getVendorPhone(v) || "";
  const contact = getVendorContactName(v);

  const skills: string[] = [];
  for (const wt of meta.work_types) {
    if (wt === "handcrafter") skills.push("Handcrafter & Carving");
    else if (wt === "cnc_works") skills.push("CNC Works");
    else if (wt === "polishing_work") skills.push("Polishing Work");
    else if (wt === "artwork") skills.push("Artwork");
    else skills.push(wt);
  }
  for (const pd of meta.products_dealt) {
    const label = getVendorProductLabel(pd);
    if (!skills.includes(label)) skills.push(label);
  }

  return {
    id: v.id,
    sourceType: "vendor",
    code: v.vendor_code || "VEN",
    name: v.company_name,
    contactPerson: contact || v.company_name,
    phone,
    category,
    categoryLabel: config.singular,
    categoryBadgeTone: config.badgeTone,
    dotColor: config.dotColor,
    city: v.city || "—",
    skills,
    notes: v.notes || undefined,
    isActive: v.is_active ?? true,
    linkUrl: `/vendors/${v.id}`,
    createdAt: v.created_at,
  };
}

/**
 * Normalizes an installation agency row into an AssociatedPerson representation.
 */
export function installationAgencyToAssociatedPerson(
  agency: InstallationAgencyRow & { skills?: string[] },
): AssociatedPerson {
  let category: AssociatedPartnerCategory = "application_partner";
  if (agency.work_types?.includes("artwork") || agency.agency_type === "artwork") {
    category = "artwork_partner";
  } else if (agency.work_types?.includes("carting") || agency.agency_type === "carting") {
    category = "transport_partner";
  }
  const config = PARTNER_CATEGORIES[category];

  const skills: string[] = [];
  if (Array.isArray(agency.skills) && agency.skills.length > 0) {
    skills.push(...agency.skills);
  }
  if (Array.isArray(agency.work_types)) {
    for (const wt of agency.work_types) {
      const found = AGENCY_WORK_TYPES.find((a) => a.value === wt);
      const label = found?.label || wt;
      if (!skills.includes(label)) skills.push(label);
    }
  }
  if (skills.length === 0) skills.push("Application & Fixing");

  return {
    id: agency.id,
    sourceType: "installation_agency",
    code: agency.code || "APP",
    name: agency.name,
    contactPerson: agency.contact_person || agency.name,
    phone: agency.phone || "",
    category,
    categoryLabel: config.singular,
    categoryBadgeTone: config.badgeTone,
    dotColor: config.dotColor,
    city: "On-site / Regional",
    skills,
    notes: agency.notes || undefined,
    isActive: agency.is_active ?? true,
    linkUrl: `/installation-ledger/${agency.id}`,
  };
}

/**
 * Normalizes a carting agency row into an AssociatedPerson representation.
 */
export function cartingAgencyToAssociatedPerson(
  carting: CartingAgencyRow & { vehicle_no?: string | null },
): AssociatedPerson {
  const config = PARTNER_CATEGORIES.transport_partner;
  const skills = ["Transport & Carting"];
  if (carting.vehicle_type) skills.push(carting.vehicle_type);
  if (carting.vehicle_no) skills.push(`Reg #${carting.vehicle_no}`);

  return {
    id: carting.id,
    sourceType: "carting_agency",
    code: carting.code || "LOG",
    name: carting.name,
    contactPerson: carting.contact_person || carting.name,
    phone: carting.phone || "",
    category: "transport_partner",
    categoryLabel: config.singular,
    categoryBadgeTone: config.badgeTone,
    dotColor: config.dotColor,
    city: "Transport Hub",
    skills,
    notes: carting.notes || undefined,
    isActive: carting.is_active ?? true,
    linkUrl: "/local-carting",
  };
}

/**
 * Queries all people and entities associated with Stone Tech across work and supply.
 */
export async function listWorkAndSupplyDirectory(query = ""): Promise<AssociatedPerson[]> {
  const [vendorsRes, agenciesRes, cartingRes] = await Promise.allSettled([
    listVendors(query),
    listInstallationAgencies(false, query),
    listCartingAgencies(false),
  ]);

  const people: AssociatedPerson[] = [];

  if (vendorsRes.status === "fulfilled" && Array.isArray(vendorsRes.value)) {
    for (const v of vendorsRes.value) {
      people.push(vendorToAssociatedPerson(v));
    }
  }

  if (agenciesRes.status === "fulfilled" && Array.isArray(agenciesRes.value)) {
    for (const a of agenciesRes.value) {
      people.push(installationAgencyToAssociatedPerson(a));
    }
  }

  if (cartingRes.status === "fulfilled" && Array.isArray(cartingRes.value)) {
    for (const c of cartingRes.value) {
      // If query provided, check if matches carting agency
      if (query) {
        const ql = query.toLowerCase();
        const matches =
          (c.name || "").toLowerCase().includes(ql) ||
          (c.contact_person || "").toLowerCase().includes(ql) ||
          (c.phone || "").includes(query);
        if (!matches) continue;
      }
      people.push(cartingAgencyToAssociatedPerson(c));
    }
  }

  // Sort alphabetically by contact person or entity name
  return people.sort((a, b) => a.contactPerson.localeCompare(b.contactPerson));
}
