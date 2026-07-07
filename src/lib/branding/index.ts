/** Stone Tech branding — sourced from `app_settings.branding`. */
import { getAppSetting } from "@/lib/app-settings/api";

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

export async function loadBranding(): Promise<BrandingConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (await getAppSetting<any>("branding" as never)) ?? {};
  return { ...DEFAULT_BRANDING, ...v };
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
