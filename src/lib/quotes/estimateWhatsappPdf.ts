/**
 * Estimate Studio — renders the wall-cladding estimate as a printable
 * document matching Stone Tech's exact WhatsApp message template, and
 * opens a WhatsApp chat pre-filled with that same text so the preparer
 * can attach the saved PDF and hit send themselves.
 *
 * There is no WhatsApp Business API integration in this codebase, and
 * wiring one up is a separate, paid, approval-gated project — per the
 * user's own choice, this instead: (1) opens the document in a new tab
 * with the browser's print dialog so "Save as PDF" produces the file,
 * and (2) opens wa.me with the message text pre-filled, so sending is a
 * one-tap action on the human's side rather than a fully blind auto-send.
 */
import { loadBranding, DEFAULT_BRANDING, type BrandingConfig } from "@/lib/branding";
import { formatInr } from "@/lib/format";
import { normalizeMobile } from "@/lib/zod";

export interface EstimateWhatsappMessageInput {
  greetingName: string;
  wallSizeSummary: string;
  materialSummary: string;
  materialToOrderSummary: string;
  materialAmount: number;
  installationLabourAmount: number;
  adhesivesAmount: number;
  sealerAmount: number;
  sealerApplicationAmount: number;
  totalEstimate: number;
  estimatedDeliveryDate?: string;
  validityDays?: string;
  preparerName: string;
}

/** Builds the exact plain-text message Stone Tech specified. */
export function buildEstimateWhatsappMessage(
  input: EstimateWhatsappMessageInput,
  companyName: string,
): string {
  const deliveryLine = input.estimatedDeliveryDate
    ? `Estimated delivery date is ${input.estimatedDeliveryDate}, and installation will commence shortly after delivery, depending on site readiness.`
    : `Estimated delivery date will be shared shortly, and installation will commence shortly after delivery, depending on site readiness.`;
  const validityLine = input.validityDays
    ? `This estimate is valid for ${input.validityDays} days. Final cost may vary slightly based on actual site conditions.`
    : `Final cost may vary slightly based on actual site conditions.`;

  return [
    `Hi ${input.greetingName},`,
    `Here is the estimate for the project based on the shared details:`,
    `Wall Size: ${input.wallSizeSummary}`,
    `Material: ${input.materialSummary}`,
    `Material to Order: ${input.materialToOrderSummary}`,
    `Material Amount: ${formatInr(input.materialAmount)}`,
    `Installation Labour: ${formatInr(input.installationLabourAmount)}`,
    `Adhesives: ${formatInr(input.adhesivesAmount)}`,
    `Sealer chemical: ${formatInr(input.sealerAmount)}`,
    `Sealer Application: ${formatInr(input.sealerApplicationAmount)}`,
    `Total Estimate: ${formatInr(input.totalEstimate)}`,
    `Notes:`,
    `Scaffolding, if required, will be provided by the customer.`,
    `Transportation charges will be extra and on actuals.`,
    deliveryLine,
    validityLine,
    `Payment Terms: 75% advance and remaining 25% upon completion of work.`,
    `Please confirm if you'd like to proceed or if any modifications are needed.`,
    `Warm regards,`,
    input.preparerName || "[Your Name]",
    companyName,
  ].join("\n");
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEstimateHtml(
  message: string,
  brand: BrandingConfig,
  productImageDataUrls: string[],
): string {
  const accent = brand.primary || "#0F766E";
  const logo = brand.logo_url
    ? `<img src="${esc(brand.logo_url)}" alt="${esc(brand.company_name)}" style="max-height:48px;max-width:170px;object-fit:contain" />`
    : `<div style="font-size:20px;font-weight:800;color:${accent}">${esc(brand.company_name)}</div>`;
  const photos = productImageDataUrls.length
    ? `<div style="margin-top:20px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748B;margin-bottom:8px">Product photo(s) — sent as additional attachment(s)</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${productImageDataUrls
            .map(
              (src) =>
                `<img src="${esc(src)}" style="max-width:220px;max-height:220px;object-fit:cover;border:1px solid #E5E7EB;border-radius:6px" />`,
            )
            .join("")}
        </div>
      </div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>Estimate</title>
<style>
  @page { size: A4; margin: 16mm; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:#0F172A; margin:0; background:#fff; }
  .sheet { max-width: 680px; margin: 0 auto; padding: 24px; }
  .toolbar { position: sticky; top:0; background:#f8fafc; border-bottom:1px solid #E5E7EB; padding:8px 24px; display:flex; gap:8px; justify-content:flex-end; }
  .toolbar button { font: inherit; padding:6px 12px; border-radius:6px; border:1px solid #E5E7EB; background:#fff; cursor:pointer; }
  header { padding-bottom:14px; border-bottom:3px solid ${accent}; margin-bottom:18px; }
  .msg { white-space:pre-wrap; font-size:13.5px; line-height:1.65; color:#1E293B; }
  .footer { margin-top:24px; padding-top:10px; border-top:1px solid #E5E7EB; font-size:10px; color:#64748B; text-align:center; }
</style>
</head><body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <header>${logo}</header>
    <div class="msg">${esc(message)}</div>
    ${photos}
    <div class="footer">${esc(brand.company_name)} — This is a system-generated estimate.</div>
  </div>
</body></html>`;
}

function openInNewTab(html: string, autoPrint: boolean) {
  const w = window.open("about:blank", "_blank");
  if (!w) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  try {
    w.opener = null;
  } catch {
    /* ignore cross-origin */
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  if (autoPrint) {
    const trigger = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* ignore */
      }
    };
    const imgs = Array.from(w.document.images);
    if (imgs.length === 0) {
      setTimeout(trigger, 250);
      return;
    }
    let remaining = imgs.length;
    const done = () => {
      if (--remaining <= 0) setTimeout(trigger, 150);
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
    setTimeout(trigger, 3500);
  }
}

/** Opens the estimate document in a new tab and triggers Print/Save-as-PDF. */
export async function printEstimatePdf(
  message: string,
  productImageDataUrls: string[] = [],
): Promise<void> {
  const brand = await loadBranding().catch(() => DEFAULT_BRANDING);
  openInNewTab(renderEstimateHtml(message, brand, productImageDataUrls), true);
}

/** Opens WhatsApp (web or app) to the customer's number with the message pre-filled. */
export function openWhatsappWithMessage(customerMobile: string, message: string): void {
  const digits = normalizeMobile(customerMobile);
  if (!digits) return;
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  const url = `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}
