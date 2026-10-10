/**
 * Voice Customer Parser for Store Employees (One-Tap Assistant).
 *
 * Extracts customer attributes, contact person, company name, phone, city,
 * customer type, material interests, and requirements from natural spoken speech
 * in English, Hindi, Gujarati, or mixed Indian business vernacular.
 */
import type { CustomerCreateInput } from "./schema";
import type { DbEnum } from "@/lib/types";

export interface ParsedVoiceCustomer {
  name: string;
  contact_person: string | null;
  company_name: string | null;
  mobile: string;
  email: string | null;
  city: string | null;
  customer_type: CustomerCreateInput["customer_type"];
  material_interests: DbEnum<"material_interest">[];
  notes: string | null;
  rawUtterance: string;
  rawTranscript: string;
  recommendedReflectionMode: "smart" | "firm" | "contact" | "combined" | "custom";
  confidenceFields: string[];
}

const MATERIAL_MAP: Record<string, DbEnum<"material_interest">> = {
  sandstone: "natural_stone_cladding_tiles",
  mint: "natural_stone_cladding_tiles",
  teak: "natural_stone_cladding_tiles",
  teakwood: "natural_stone_cladding_tiles",
  dholpur: "natural_stone_cladding_tiles",
  limestone: "natural_stone_cladding_tiles",
  kadappa: "natural_stone_cladding_tiles",
  cuddapah: "natural_stone_cladding_tiles",
  kota: "general_flooring",
  shahabad: "general_flooring",
  tandur: "general_flooring",
  granite: "general_flooring",
  black: "general_flooring",
  "black galaxy": "general_flooring",
  "r-black": "general_flooring",
  marble: "general_flooring",
  "italian marble": "custom_flooring",
  makrana: "custom_flooring",
  statuario: "custom_flooring",
  quartz: "table_top",
  slate: "natural_stone_cladding_tiles",
  travertine: "custom_stone_cladding",
  onyx: "inlay_work",
  inlay: "inlay_work",
  cladding: "natural_stone_cladding_tiles",
  tiles: "natural_stone_cladding_tiles",
  panels: "natural_stone_interlocking_panels",
  mosaics: "natural_stone_mosaics",
  murals: "stone_murals",
  mural: "stone_murals",
  flooring: "general_flooring",
  veneer: "stone_veneer",
  "clay veneer": "clay_veneers",
  "pu panels": "pu_panels",
  agate: "agate_slabs",
  "table top": "table_top",
  tabletop: "table_top",
  "stepping stone": "stepping_stone",
  "stepping stones": "stepping_stone",
};

const CITY_LIST = [
  "ahmedabad",
  "surat",
  "vadodara",
  "baroda",
  "rajkot",
  "gandhinagar",
  "bhavnagar",
  "jamnagar",
  "morbi",
  "mumbai",
  "pune",
  "delhi",
  "noida",
  "gurgaon",
  "gurugram",
  "jaipur",
  "udaipur",
  "kishangarh",
  "bangalore",
  "bengaluru",
  "hyderabad",
  "chennai",
  "kolkata",
  "indore",
  "bhopal",
];

const CUSTOMER_TYPE_MAP: Record<string, CustomerCreateInput["customer_type"]> = {
  architect: "architect",
  architecture: "architect",
  builder: "b2b",
  developer: "b2b",
  contractor: "contractor",
  thekedar: "contractor",
  interior: "interior_designer",
  designer: "interior_designer",
  "interior designer": "interior_designer",
  company: "b2b",
  corporate: "b2b",
  firm: "b2b",
  wholesaler: "b2b",
  dealer: "b2b",
  retailer: "b2b",
  trader: "b2b",
  government: "b2b",
  walkin: "walk_in",
  "walk in": "walk_in",
  "walk-in": "walk_in",
  individual: "walk_in",
  homeowner: "walk_in",
  client: "walk_in",
};

export function parseVoiceCustomer(utterance: string): ParsedVoiceCustomer {
  const clean = utterance.trim();
  const lower = clean.toLowerCase();
  const confidenceFields: string[] = [];

  // 1. Mobile Number extraction (10 contiguous or space-separated digits)
  let mobile = "";
  // Check for 10-digit pattern (optionally starting with +91 or 0)
  const phoneRegex = /(?:\+91[\s-]?)?(?:0)?([6-9]\d{9}|[6-9](?:\s?\d){9})/g;
  const phoneMatch = phoneRegex.exec(clean);
  if (phoneMatch?.[1]) {
    mobile = phoneMatch[1].replace(/\s+/g, "");
    confidenceFields.push("mobile");
  } else {
    // Look for any consecutive sequence of 10 digits
    const genericDigits = clean.replace(/\D/g, "");
    if (genericDigits.length === 10) {
      mobile = genericDigits;
      confidenceFields.push("mobile");
    } else if (genericDigits.length > 10) {
      // Pick the last 10 digits if prepended with country code 91
      mobile = genericDigits.slice(-10);
      confidenceFields.push("mobile");
    }
  }

  // 2. Email extraction
  let email: string | null = null;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
  const emailMatch = emailRegex.exec(clean);
  if (emailMatch?.[0]) {
    email = emailMatch[0].toLowerCase();
    confidenceFields.push("email");
  }

  // 3. City extraction
  let city: string | null = null;
  for (const c of CITY_LIST) {
    const cityPattern = new RegExp(`\\b(?:from|in|at|city|near|thi|ma|wali)?\\s*${c}\\b`, "i");
    if (cityPattern.test(lower)) {
      city = c.charAt(0).toUpperCase() + c.slice(1);
      if (city === "Baroda") city = "Vadodara";
      if (city === "Gurugram") city = "Gurgaon";
      if (city === "Bengaluru") city = "Bangalore";
      confidenceFields.push("city");
      break;
    }
  }

  // 4. Customer Type extraction
  let customerType: CustomerCreateInput["customer_type"] = "walk_in";
  for (const [key, typeVal] of Object.entries(CUSTOMER_TYPE_MAP)) {
    const typeRegex = new RegExp(`\\b${key}\\b`, "i");
    if (typeRegex.test(lower)) {
      customerType = typeVal;
      confidenceFields.push("customer_type");
      break;
    }
  }

  // 5. Material Interests extraction
  const materials: DbEnum<"material_interest">[] = [];
  for (const [key, matEnum] of Object.entries(MATERIAL_MAP)) {
    if (lower.includes(key)) {
      if (!materials.includes(matEnum)) {
        materials.push(matEnum);
      }
    }
  }
  if (materials.length > 0) {
    confidenceFields.push("material_interests");
  }

  // 6. Contact Person & Company Name Extraction
  let contactPerson: string | null = null;
  let companyName: string | null = null;

  // Patterns for explicit contact person: "contact person Ramesh", "contact Ramesh Patel", "talking to Rajesh"
  const contactRegex =
    /(?:contact(?:\s+person)?|point of contact|poc|representative|talking to|milna hai|bhai|person)\s*[:=-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i;
  const contactMatch = contactRegex.exec(clean);
  if (contactMatch?.[1]) {
    const rawContact = contactMatch[1].trim();
    if (rawContact.length > 2 && !CITY_LIST.includes(rawContact.toLowerCase())) {
      contactPerson = rawContact;
      confidenceFields.push("contact_person");
    }
  }

  // Patterns for Company / Firm: "company ABC", "firm XYZ", "M/s ABC", "from ABC Constructions", "... Pvt Ltd", "... LLP"
  const firmRegex =
    /(?:company|firm|agency|builder firm|office|m\/s|m\/s\.)\s*[:=-]?\s*([A-Za-z0-9&.\s]+?)(?:,|\.|\bphone|\bmobile|\bcontact|\bfrom|\bcity|$)/i;
  const firmMatch = firmRegex.exec(clean);
  if (firmMatch?.[1]) {
    const rawFirm = firmMatch[1].trim();
    if (rawFirm.length > 2) {
      companyName = rawFirm;
      confidenceFields.push("company_name");
    }
  }

  // If no explicit firm pattern was matched, look for business markers like "Constructions", "Infra", "Developers", "Pvt Ltd", "LLP", "Associates", "Enterprises", "Studio", "Designs"
  if (!companyName) {
    const businessSuffixRegex =
      /(?:(?:add|new|register)\s+customer\s+)?(?:from\s+)?([A-Za-z0-9&.\s]{2,30}?\s+(?:constructions?|developers?|infra|builders?|pvt\s+ltd|ltd|llp|associates?|enterprises?|interiors?|architects?|designs?|corporation|group))\b/i;
    const suffixMatch = businessSuffixRegex.exec(clean);
    if (suffixMatch?.[1]) {
      let raw = suffixMatch[1].trim();
      raw = raw.replace(/^(?:add|new|register)\s+customer\s+(?:from\s+)?/i, "");
      raw = raw.replace(/^from\s+/i, "");
      if (raw.length > 2) {
        companyName = raw;
        confidenceFields.push("company_name");
      }
    }
  }

  // Generic Customer Name: "Customer Ramesh Patel", "Add customer Rajesh", "New customer Kiran"
  let primaryName = "";
  const nameRegex =
    /(?:customer|client|grahak|naya customer|new customer|add customer|register)\s+(?:from\s+)?([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i;
  const nameMatch = nameRegex.exec(clean);
  if (nameMatch?.[1]) {
    let raw = nameMatch[1].trim();
    // Strip trailing stopwords that might have leaked into the 2nd/3rd word
    raw = raw.replace(
      /\s+(?:from|mobile|phone|contact|looking|in|with|city|at|for|near|hai)$/i,
      "",
    );
    if (raw && !CITY_LIST.includes(raw.toLowerCase())) {
      primaryName = raw;
      confidenceFields.push("name");
    }
  }

  // Disambiguation
  if (!contactPerson && primaryName && companyName && primaryName !== companyName) {
    contactPerson = primaryName;
  } else if (!primaryName && contactPerson) {
    primaryName = contactPerson;
  } else if (!primaryName && companyName) {
    primaryName = companyName;
  }

  // If still no primary name, look at first 2-3 words of the sentence
  if (!primaryName && clean.length > 0) {
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 1) {
      const candidate = words.slice(0, 2).join(" ");
      if (!/^(add|new|create|listen|phone|mobile|please|hello|hi)$/i.test(candidate)) {
        primaryName = candidate;
      }
    }
  }

  // Formulate notes with raw utterance for traceability
  const notes = `Voice auto-filled: "${clean}"`;

  let recommendedReflectionMode: "smart" | "firm" | "contact" | "combined" | "custom" = "smart";
  if (companyName && contactPerson) {
    recommendedReflectionMode = "combined";
  } else if (companyName) {
    recommendedReflectionMode = "firm";
  } else if (contactPerson) {
    recommendedReflectionMode = "contact";
  }

  return {
    name: primaryName || (companyName ?? contactPerson ?? ""),
    contact_person: contactPerson,
    company_name: companyName,
    mobile,
    email,
    city,
    customer_type: customerType,
    material_interests: materials,
    notes,
    rawUtterance: clean,
    rawTranscript: clean,
    recommendedReflectionMode,
    confidenceFields,
  };
}
