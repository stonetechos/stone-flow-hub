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
  updateVendor,
  deleteVendor,
  type VendorRow,
} from "@/lib/vendors/api";
import {
  listInstallationAgencies,
  createInstallationAgency,
  updateInstallationAgency,
  deleteInstallationAgency,
  decodeAgencyWorkTypes,
  encodeAgencyNotes,
  AGENCY_WORK_TYPES,
  type AgencyWorkType,
  type InstallationAgencyRow,
} from "@/lib/installation-agencies/api";
import {
  listCartingAgencies,
  createCartingAgency,
  updateCartingAgency,
  deleteCartingAgency,
  type CartingAgencyRow,
} from "@/lib/purchase-transportation/api";
import {
  listInstallationTeams,
  updateInstallationTeam,
  deleteInstallationTeam,
  createInstallationTeam,
  type InstallationTeam,
} from "@/lib/installation/teams";
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

export const SUPPLIER_PARTNER_CATEGORIES: AssociatedPartnerCategory[] = [
  "supplying_partner",
  "artwork_partner",
  "chemical_partner",
  "tooling_partner",
];

export function isSupplierCategory(category: AssociatedPartnerCategory): boolean {
  return category !== "transport_partner" && category !== "application_partner";
}

export interface AssociatedPerson {
  id: string;
  sourceType: "vendor" | "installation_agency" | "carting_agency" | "installation_team";
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
  vehicle?: string | null;
  vehicleNo?: string | null;
  capacity?: number | null;
  email?: string | null;
  address?: string | null;
  state?: string | null;
  gstNumber?: string | null;
  notes?: string;
  isActive: boolean;
  linkUrl: string;
  createdAt?: string;
  raw?: unknown;
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
    companyLower.includes("contractor") ||
    notesLower.includes("install") ||
    notesLower.includes("cladding") ||
    notesLower.includes("flooring") ||
    notesLower.includes("contractor")
  ) {
    return "application_partner";
  }

  // 5. Transport check
  if (
    meta.work_types.includes("carting") ||
    meta.work_types.includes("transport") ||
    companyLower.includes("transport") ||
    companyLower.includes("logistics") ||
    companyLower.includes("roadways") ||
    companyLower.includes("freight") ||
    companyLower.includes("carting") ||
    companyLower.includes("pickup") ||
    companyLower.includes("tempo") ||
    notesLower.includes("transport") ||
    notesLower.includes("carting") ||
    notesLower.includes("pickup") ||
    notesLower.includes("freight")
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

  const primary = v.vendor_contacts?.find((c) => c.is_primary) ?? v.vendor_contacts?.[0];

  return {
    id: v.id,
    sourceType: "vendor",
    code: v.vendor_code || "VEN",
    name: v.company_name,
    contactPerson: contact || v.company_name,
    phone,
    email: primary?.email ?? v.email ?? null,
    address: v.address ?? null,
    state: v.state ?? null,
    gstNumber: v.gst_number ?? null,
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
    raw: v,
  };
}

/**
 * Normalizes an installation agency row into an AssociatedPerson representation.
 */
export function installationAgencyToAssociatedPerson(
  agency: InstallationAgencyRow & { skills?: string[] },
): AssociatedPerson {
  const decoded = decodeAgencyWorkTypes(agency.notes);
  const effectiveWorkTypes =
    Array.isArray(agency.work_types) && agency.work_types.length > 0
      ? agency.work_types
      : decoded.workTypes;

  let category: AssociatedPartnerCategory = "application_partner";
  if (
    effectiveWorkTypes.includes("artwork") ||
    agency.agency_type === "artwork" ||
    (agency.name || "").toLowerCase().includes("mural") ||
    (agency.name || "").toLowerCase().includes("carv")
  ) {
    category = "artwork_partner";
  } else if (
    effectiveWorkTypes.includes("carting") ||
    agency.agency_type === "carting" ||
    (agency.name || "").toLowerCase().includes("transport") ||
    (agency.name || "").toLowerCase().includes("carting") ||
    (agency.name || "").toLowerCase().includes("roadways")
  ) {
    category = "transport_partner";
  }
  const config = PARTNER_CATEGORIES[category];

  const skills: string[] = [];
  if (Array.isArray(agency.skills) && agency.skills.length > 0) {
    skills.push(...agency.skills);
  }
  if (category === "transport_partner") {
    if (decoded.vehicleType) skills.push(decoded.vehicleType);
    if (decoded.vehicleNo) skills.push(`Reg #${decoded.vehicleNo}`);
    if (skills.length === 0) skills.push("Carting & Transport");
  } else {
    for (const wt of effectiveWorkTypes) {
      const found = AGENCY_WORK_TYPES.find((a) => a.value === wt);
      const label = found?.label || wt;
      if (!skills.includes(label)) skills.push(label);
    }
    if (skills.length === 0) skills.push("Application & Fixing");
  }

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
    vehicle: agency.vehicle_type || decoded.vehicleType || null,
    vehicleNo: agency.vehicle_no || decoded.vehicleNo || null,
    notes: decoded.cleanNotes || agency.notes || undefined,
    isActive: agency.is_active ?? true,
    linkUrl:
      category === "transport_partner"
        ? "/purchase-transport"
        : `/installation-ledger/${agency.id}`,
    raw: agency,
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
    vehicle: carting.vehicle_type || null,
    vehicleNo: carting.vehicle_no || null,
    notes: carting.notes || undefined,
    isActive: carting.is_active ?? true,
    linkUrl: "/purchase-transport",
    raw: carting,
  };
}

/**
 * Normalizes an installation team row into an AssociatedPerson representation.
 */
export function installationTeamToAssociatedPerson(team: InstallationTeam): AssociatedPerson {
  const config = PARTNER_CATEGORIES.application_partner;
  const skills = team.skills?.length > 0 ? [...team.skills] : ["Site Execution & Cladding"];
  return {
    id: team.id,
    sourceType: "installation_team",
    code: team.team_code || "TEAM",
    name: team.name,
    contactPerson: team.supervisor_name || team.name,
    phone: team.supervisor_phone || "",
    category: "application_partner",
    categoryLabel: config.singular,
    categoryBadgeTone: config.badgeTone,
    dotColor: config.dotColor,
    city: "On-site Team",
    skills,
    vehicle: team.vehicle || null,
    capacity: team.daily_capacity_sqft || null,
    notes: team.notes || undefined,
    isActive: team.is_active ?? true,
    linkUrl: "/installation-teams",
    createdAt: team.created_at,
    raw: team,
  };
}

/**
 * Queries exclusively supplying partners (quarries, stone, artwork, chemicals, tooling),
 * explicitly filtering out transport providers/carting and application agencies.
 */
export async function listSupplyingPartners(query = ""): Promise<AssociatedPerson[]> {
  const vendors = await listVendors(query);
  const partners: AssociatedPerson[] = [];

  for (const v of vendors) {
    const category = detectVendorPartnerCategory(v);
    if (isSupplierCategory(category)) {
      partners.push(vendorToAssociatedPerson(v));
    }
  }

  return partners.sort((a, b) => a.contactPerson.localeCompare(b.contactPerson));
}

/**
 * Queries all people and entities associated with Stone Tech across work and supply.
 */
export async function listWorkAndSupplyDirectory(query = ""): Promise<AssociatedPerson[]> {
  const [vendorsRes, agenciesRes, cartingRes, teamsRes] = await Promise.allSettled([
    listVendors(query),
    listInstallationAgencies(false, query),
    listCartingAgencies(false, query),
    listInstallationTeams(query),
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
      people.push(cartingAgencyToAssociatedPerson(c));
    }
  }

  if (teamsRes.status === "fulfilled" && Array.isArray(teamsRes.value)) {
    for (const t of teamsRes.value) {
      people.push(installationTeamToAssociatedPerson(t));
    }
  }

  // Sort alphabetically by contact person or entity name
  return people.sort((a, b) => a.contactPerson.localeCompare(b.contactPerson));
}

/**
 * Queries all registered Application Partners across vendors, agencies, and teams.
 */
export async function listApplicationPartners(query = ""): Promise<AssociatedPerson[]> {
  const [vendorsRes, agenciesRes, teamsRes] = await Promise.allSettled([
    listVendors(query),
    listInstallationAgencies(false, query),
    listInstallationTeams(query),
  ]);

  const partners: AssociatedPerson[] = [];
  const seenIds = new Set<string>();

  if (vendorsRes.status === "fulfilled" && Array.isArray(vendorsRes.value)) {
    for (const v of vendorsRes.value) {
      const cat = detectVendorPartnerCategory(v);
      if (cat === "application_partner") {
        const p = vendorToAssociatedPerson(v);
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          partners.push(p);
        }
      }
    }
  }

  if (agenciesRes.status === "fulfilled" && Array.isArray(agenciesRes.value)) {
    for (const a of agenciesRes.value) {
      const p = installationAgencyToAssociatedPerson(a);
      if (p.category === "application_partner" && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        partners.push(p);
      }
    }
  }

  if (teamsRes.status === "fulfilled" && Array.isArray(teamsRes.value)) {
    for (const t of teamsRes.value) {
      const p = installationTeamToAssociatedPerson(t);
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        partners.push(p);
      }
    }
  }

  return partners.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Queries all registered Transportation Partners across vendors, carting agencies, and agencies.
 */
export async function listTransportPartners(query = ""): Promise<AssociatedPerson[]> {
  const [vendorsRes, cartingRes, agenciesRes, teamsRes] = await Promise.allSettled([
    listVendors(query),
    listCartingAgencies(false, query),
    listInstallationAgencies(false, query),
    listInstallationTeams(query),
  ]);

  const partners: AssociatedPerson[] = [];
  const seenIds = new Set<string>();

  // 1. Dedicated carting agencies (pure transport & carting)
  if (cartingRes.status === "fulfilled" && Array.isArray(cartingRes.value)) {
    for (const c of cartingRes.value) {
      const p = cartingAgencyToAssociatedPerson(c);
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        partners.push(p);
      }
    }
  }

  // 2. Installation agencies registered with transport / carting capabilities
  if (agenciesRes.status === "fulfilled" && Array.isArray(agenciesRes.value)) {
    for (const a of agenciesRes.value) {
      const p = installationAgencyToAssociatedPerson(a);
      if (p.category === "transport_partner" && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        partners.push(p);
      }
    }
  }

  // 3. Vendors categorized as transport partners
  if (vendorsRes.status === "fulfilled" && Array.isArray(vendorsRes.value)) {
    for (const v of vendorsRes.value) {
      const cat = detectVendorPartnerCategory(v);
      if (cat === "transport_partner") {
        const p = vendorToAssociatedPerson(v);
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          partners.push(p);
        }
      }
    }
  }

  // 4. Any installation teams with carting/transport skills
  if (teamsRes.status === "fulfilled" && Array.isArray(teamsRes.value)) {
    for (const t of teamsRes.value) {
      const isCarting = t.skills?.some(
        (s) => s.toLowerCase().includes("carting") || s.toLowerCase().includes("transport"),
      );
      if (isCarting) {
        const p = installationTeamToAssociatedPerson(t);
        p.category = "transport_partner";
        p.categoryLabel = PARTNER_CATEGORIES.transport_partner.singular;
        p.categoryBadgeTone = PARTNER_CATEGORIES.transport_partner.badgeTone;
        p.dotColor = PARTNER_CATEGORIES.transport_partner.dotColor;
        p.linkUrl = "/purchase-transport";
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          partners.push(p);
        }
      }
    }
  }

  return partners.sort((a, b) => a.name.localeCompare(b.name));
}

export interface EditPartnerInput {
  name: string;
  contactPerson: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  gstNumber?: string | null;
  skills?: string[];
  vehicle?: string | null;
  vehicleNo?: string | null;
  capacity?: number | null;
  dailyRate?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

/**
 * Updates an associated partner across any underlying data source (vendor, agency, carting, team).
 */
export async function updateAssociatedPartner(
  person: AssociatedPerson,
  input: EditPartnerInput,
): Promise<void> {
  const phoneVal = input.phone?.trim() || "";

  if (person.sourceType === "vendor") {
    await updateVendor(person.id, {
      company_name: input.name,
      contact_name: input.contactPerson,
      mobile: phoneVal || null,
      email: input.email ?? null,
      city: input.city ?? null,
      address: input.address ?? null,
      state: input.state ?? null,
      gst_number: input.gstNumber ?? null,
      notes: input.notes ?? null,
      partner_category: person.category,
      work_types: input.skills ?? person.skills,
      products_dealt: [],
    });
  } else if (person.sourceType === "installation_agency") {
    const rawAgency = person.raw as InstallationAgencyRow | undefined;
    const isCarting =
      person.category === "transport_partner" ||
      rawAgency?.agency_type === "carting" ||
      rawAgency?.work_types?.includes("carting");
    const rawWorkTypes = (input.skills as AgencyWorkType[]) || [];
    const workTypes: AgencyWorkType[] =
      rawWorkTypes.length > 0 ? rawWorkTypes : isCarting ? ["carting"] : ["installation"];
    if (isCarting && !workTypes.includes("carting")) {
      workTypes.push("carting");
    }
    const encoded = encodeAgencyNotes(
      input.notes,
      workTypes,
      input.vehicle,
      input.vehicleNo,
      "individual",
    );
    await updateInstallationAgency(person.id, {
      name: input.name,
      contact_person: input.contactPerson || null,
      phone: phoneVal || null,
      vehicle_type: input.vehicle || null,
      vehicle_no: input.vehicleNo || null,
      notes: encoded,
      is_active: input.isActive ?? true,
      work_types: workTypes,
    });
  } else if (person.sourceType === "carting_agency") {
    await updateCartingAgency(person.id, {
      name: input.name,
      contact_person: input.contactPerson || null,
      phone: phoneVal || null,
      vehicle_type: input.vehicle || null,
      notes: input.notes || null,
      is_active: input.isActive ?? true,
    });
  } else if (person.sourceType === "installation_team") {
    await updateInstallationTeam(person.id, {
      name: input.name,
      supervisor_name: input.contactPerson || null,
      supervisor_phone: phoneVal || null,
      vehicle: input.vehicle || null,
      daily_capacity_sqft: input.capacity || null,
      skills: input.skills || [],
      notes: input.notes || null,
    });
  }
}

/**
 * Deletes or removes an associated partner from its respective table.
 */
export async function deleteAssociatedPartner(person: AssociatedPerson): Promise<void> {
  if (person.sourceType === "vendor") {
    await deleteVendor(person.id);
  } else if (person.sourceType === "installation_agency") {
    await deleteInstallationAgency(person.id);
  } else if (person.sourceType === "carting_agency") {
    await deleteCartingAgency(person.id);
  } else if (person.sourceType === "installation_team") {
    await deleteInstallationTeam(person.id);
  }
}

/**
 * Creates a new Application Partner in the system.
 */
export async function createApplicationPartner(input: EditPartnerInput): Promise<AssociatedPerson> {
  const phoneVal = input.phone?.trim() || "";
  const workTypes = (input.skills as AgencyWorkType[]) || ["installation"];
  const encoded = encodeAgencyNotes(
    input.notes,
    workTypes,
    input.vehicle,
    input.vehicleNo,
    "individual",
  );
  const agency = await createInstallationAgency({
    name: input.name.trim(),
    contact_person: input.contactPerson.trim() || null,
    phone: phoneVal || null,
    vehicle_type: input.vehicle || null,
    vehicle_no: input.vehicleNo || null,
    work_types: workTypes,
    notes: encoded,
    is_active: true,
  });
  return installationAgencyToAssociatedPerson(agency);
}

/**
 * Creates a new Transport Partner in the system.
 */
export async function createTransportPartner(input: EditPartnerInput): Promise<AssociatedPerson> {
  const phoneVal = input.phone?.trim() || "";
  const carting = await createCartingAgency({
    name: input.name.trim(),
    contact_person: input.contactPerson.trim() || null,
    phone: phoneVal || null,
    vehicle_type: input.vehicle || null,
    notes: input.notes || null,
    is_active: true,
  });
  return cartingAgencyToAssociatedPerson(carting);
}
