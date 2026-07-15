/**
 * Stone Tech branding — the "our own company" identity shown on every
 * generated document (lib/pdf/generator.ts), the dispatch print view,
 * installation certificates, and outbound email (emailShell below).
 *
 * Previously sourced from `app_settings.branding`, a loose JSON blob with
 * no admin UI and no structured columns. Now sourced from the Company
 * Profile module's `company_profiles` table (lib/company/api.ts) — the
 * single source of truth a Settings > Company admin can actually edit.
 * `BrandingConfig` is kept as a superset of the old shape so every
 * existing consumer (`brand.company_name`, `brand.gstin`, `brand.address`,
 * ...) keeps working unchanged; only this loader function changed.
 */
import { getActiveCompanyProfile } from "@/lib/company/api";

export interface BrandingConfig {
  company_name: string;
  tagline: string;
  primary: string;
  accent: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  website: string;
  // Added when Company Profile became the source of truth — optional so
  // any caller still destructuring only the original fields is unaffected.
  legal_business_name?: string;
  trade_name?: string;
  mobile?: string;
  pan?: string;
  cin?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  upi_id?: string;
  authorized_signatory?: string;
  signature_url?: string;
  stamp_url?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  company_name: "Stone Tech",
  tagline: "Natural Stone Excellence",
  primary: "#0d9488", // teal-600
  accent: "#334155",  // granite slate-700
  logo_url: "",
  address: "",
  phone: "",
  email: "",
  gstin: "",
  website: "",
};

function joinAddress(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim() !== "").join(", ");
}

export async function loadBranding(): Promise<BrandingConfig> {
  const c = await getActiveCompanyProfile().catch(() => null);
  if (!c) return DEFAULT_BRANDING;

  const address = [
    joinAddress([c.address_line1, c.address_line2]),
    joinAddress([c.city, c.state, c.pincode]),
    c.country && c.country !== "India" ? c.country : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ...DEFAULT_BRANDING,
    company_name: c.company_name || DEFAULT_BRANDING.company_name,
    logo_url: c.logo_url ?? "",
    address,
    phone: c.phone ?? "",
    email: c.email ?? "",
    gstin: c.gstin ?? "",
    website: c.website ?? "",
    legal_business_name: c.legal_business_name ?? undefined,
    trade_name: c.trade_name ?? undefined,
    mobile: c.mobile ?? undefined,
    pan: c.pan ?? undefined,
    cin: c.cin ?? undefined,
    bank_name: c.bank_name ?? undefined,
    bank_branch: c.bank_branch ?? undefined,
    bank_account_number: c.bank_account_number ?? undefined,
    bank_ifsc: c.bank_ifsc ?? undefined,
    upi_id: c.upi_id ?? undefined,
    authorized_signatory: c.authorized_signatory ?? undefined,
    signature_url: c.signature_url ?? undefined,
    stamp_url: c.stamp_url ?? undefined,
  };
}

export function emailShell(bodyHtml: string, brand: BrandingConfig): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="padding:20px 28px;background:linear-gradient(135deg,${brand.primary} 0%,${brand.accent} 100%);color:#fff">
    <div style="font-size:20px;font-weight:700;letter-spacing:.2px">${escape(brand.company_name)}</div>
    <div style="font-size:12px;opacity:.85;margin-top:2px">${escape(brand.tagline)}</div>
  </div>
  <div style="padding:24px 28px;font-size:14px;line-height:1.55">${bodyHtml}</div>
  <div style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">
    ${escape(brand.address)}${brand.phone ? ` · ${escape(brand.phone)}` : ""}${brand.email ? ` · ${escape(brand.email)}` : ""}
    ${brand.gstin ? `<div>GSTIN: ${escape(brand.gstin)}</div>` : ""}
    ${brand.website ? `<div><a href="${escape(brand.website)}" style="color:${brand.primary}">${escape(brand.website)}</a></div>` : ""}
  </div>
</div></body></html>`;
}

function escape(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
