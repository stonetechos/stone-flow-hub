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
  adhesivesSummary?: string;
  sealerAmount: number;
  sealerApplicationAmount: number;
  cartingAmount?: number;
  cartingLocation?: string;
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
  const hasInstallation =
    input.installationLabourAmount > 0 ||
    input.adhesivesAmount > 0 ||
    input.sealerAmount > 0 ||
    input.sealerApplicationAmount > 0;

  const deliveryLine = input.estimatedDeliveryDate
    ? hasInstallation
      ? `Estimated delivery date is ${input.estimatedDeliveryDate}, and installation will commence shortly after delivery, depending on site readiness.`
      : `Estimated delivery date is ${input.estimatedDeliveryDate}.`
    : hasInstallation
      ? `Estimated delivery date will be shared shortly, and installation will commence shortly after delivery, depending on site readiness.`
      : `Estimated delivery date will be shared shortly.`;
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
    ...(hasInstallation
      ? [
          `Installation Labour: ${formatInr(input.installationLabourAmount)}`,
          input.adhesivesSummary
            ? `Adhesives: ${formatInr(input.adhesivesAmount)} (${input.adhesivesSummary})`
            : `Adhesives: ${formatInr(input.adhesivesAmount)}`,
          `Sealer chemical: ${formatInr(input.sealerAmount)}`,
          `Sealer Application: ${formatInr(input.sealerApplicationAmount)}`,
        ]
      : []),
    ...(input.cartingAmount && input.cartingAmount > 0
      ? [
          `Local Carting: ${formatInr(input.cartingAmount)}${input.cartingLocation ? ` (${input.cartingLocation})` : ""}`,
        ]
      : []),
    `Total Estimate: ${formatInr(input.totalEstimate)}`,
    `Notes:`,
    ...(hasInstallation ? [`Scaffolding, if required, will be provided by the customer.`] : []),
    ...(input.cartingAmount && input.cartingAmount > 0
      ? []
      : [`Transportation charges will be extra and on actuals.`]),
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
    ? `<img src="${esc(brand.logo_url)}" alt="${esc(brand.company_name)}" style="width:68px;height:68px;object-fit:contain;aspect-ratio:1/1;border-radius:50%;display:block" />`
    : `<div style="font-size:24px;font-weight:800;color:${accent}">${esc(brand.company_name)}</div>`;
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:#0F172A; margin:0; background:#fff; letter-spacing: -0.01em; }
  .sheet { max-width: 680px; margin: 0 auto; padding: 24px; }
  .toolbar { position: sticky; top:0; background:#f8fafc; border-bottom:1px solid #E5E7EB; padding:8px 24px; display:flex; gap:8px; justify-content:flex-end; }
  .toolbar button { font-family: inherit; font-size:13px; font-weight:500; padding:6px 12px; border-radius:6px; border:1px solid #E5E7EB; background:#fff; cursor:pointer; }
  header { display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:14px; border-bottom:3px solid ${accent}; margin-bottom:18px; }
  .brand-tagline { font-family: 'Caveat', cursive, 'Brush Script MT', sans-serif; font-size: 19px; font-weight: 700; color: ${accent}; margin-top: 3px; letter-spacing: 0.01em; line-height: 1.2; }
  .msg { white-space:pre-wrap; font-size:13.5px; line-height:1.65; color:#1E293B; }
  .footer { margin-top:24px; padding-top:10px; border-top:1px solid #E5E7EB; font-size:10px; color:#64748B; text-align:center; }
</style>
</head><body>
  <div class="toolbar no-print">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <header>
      <div>
        ${logo}
        <div class="brand-tagline">${esc(brand.tagline || "ever evolving!")}</div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${accent}">Project Estimate</div>
    </header>
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

import { openWhatsappToContact } from "@/lib/whatsapp";

/** Opens the estimate document in a new tab and triggers Print/Save-as-PDF. */
export async function printEstimatePdf(
  message: string,
  productImageDataUrls: string[] = [],
): Promise<void> {
  const brand = await loadBranding().catch(() => DEFAULT_BRANDING);
  openInNewTab(renderEstimateHtml(message, brand, productImageDataUrls), true);
}

/** Opens WhatsApp (desktop app or web) to the customer's number with the message pre-filled. */
export function openWhatsappWithMessage(customerMobile: string, message: string): void {
  openWhatsappToContact(customerMobile, message);
}

export interface MuralEstimateWhatsappInput {
  greetingName: string;
  sceneDescription?: string;
  wallSizeSummary: string;
  wallSqft: number;
  slabDetails: string;
  baseStoneSourcing?: "stone_tech" | "client_provided";
  slabsCount: number;
  totalSlabSqft: number;
  slabAmount: number;
  slabPricePerSqft: number;
  cncWorkSummary: string;
  cncAmount: number;
  overlayDetails?: {
    stoneType: string;
    thicknessMm: number;
    sourcing: "stone_tech" | "client_provided";
    sqft: number;
    stoneAmount: number;
    stonePricePerSqft: number;
    cncAmount?: number;
    cncSummary?: string;
    pastingAmount?: number;
    totalAmount?: number;
  };
  pastingAmount?: number;
  rubbingAmount: number;
  polishingAmount: number;
  installationLabourAmount: number;
  adhesivesAmount: number;
  adhesivesSummary: string;
  touchUpAmount: number;
  cartingAmount: number;
  cartingLocation?: string;
  totalEstimate: number;
  estimatedDeliveryDate?: string;
  validityDays?: string;
  preparerName: string;
}

export function buildMuralEstimateWhatsappMessage(
  input: MuralEstimateWhatsappInput,
  companyName: string,
): string {
  const deliveryLine = input.estimatedDeliveryDate
    ? `Estimated delivery date is ${input.estimatedDeliveryDate}, with CNC carving and installation commencing upon material readiness.`
    : `Estimated delivery date will be shared upon design approval and site readiness.`;
  const validityLine = input.validityDays
    ? `This estimate is valid for ${input.validityDays} days. Final cost may vary slightly based on actual site conditions.`
    : `Final cost may vary slightly based on actual site conditions.`;

  const lines: Array<string | null> = [
    `Hi ${input.greetingName},`,
    `Here is the estimate for the Stone Mural project based on the shared details:`,
    input.sceneDescription ? `• Artwork Scene & Scope: ${input.sceneDescription}` : null,
    `• Wall Size: ${input.wallSizeSummary} (${input.wallSqft.toFixed(1)} sq ft)`,
    `• Slabs Required: ${input.slabsCount} slab(s) — ${input.slabDetails} (Total: ${input.totalSlabSqft} sq ft)`,
    input.baseStoneSourcing === "client_provided"
      ? `• Base Stone Slabs: Provided by Client (No stone cost; carving & processing only)`
      : `• Base Stone Slabs: ${formatInr(input.slabAmount)} (@ ${formatInr(input.slabPricePerSqft)}/sq ft)`,
    `• Base Stone CNC Work: ${formatInr(input.cncAmount)} (${input.cncWorkSummary})`,
    input.overlayDetails
      ? input.overlayDetails.sourcing === "client_provided"
        ? `• Overlay Stone Piece: ${input.overlayDetails.stoneType} (${input.overlayDetails.thicknessMm}mm, ${input.overlayDetails.sqft.toFixed(1)} sq ft) — Provided by Client`
        : `• Overlay Stone Piece: ${input.overlayDetails.stoneType} (${input.overlayDetails.thicknessMm}mm, ${input.overlayDetails.sqft.toFixed(1)} sq ft) — ${formatInr(input.overlayDetails.stoneAmount)} (@ ${formatInr(input.overlayDetails.stonePricePerSqft)}/sq ft)`
      : null,
    input.overlayDetails?.cncAmount && input.overlayDetails.cncAmount > 0
      ? `• Overlay CNC Carving: ${formatInr(input.overlayDetails.cncAmount)}${input.overlayDetails.cncSummary ? ` (${input.overlayDetails.cncSummary})` : ""}`
      : null,
    input.pastingAmount && input.pastingAmount > 0
      ? `• Overlay Pasting & Bonding Work: ${formatInr(input.pastingAmount)} (Specialized epoxy & artisan fixing)`
      : null,
    input.rubbingAmount > 0 ? `• Surface Rubbing: ${formatInr(input.rubbingAmount)}` : null,
    input.polishingAmount > 0 ? `• Polishing Work: ${formatInr(input.polishingAmount)}` : null,
    input.installationLabourAmount > 0
      ? `• Installation Labour: ${formatInr(input.installationLabourAmount)}`
      : null,
    input.adhesivesAmount > 0
      ? `• Adhesives: ${formatInr(input.adhesivesAmount)} (${input.adhesivesSummary})`
      : null,
    input.touchUpAmount > 0 ? `• Touch Up Work: ${formatInr(input.touchUpAmount)}` : null,
    input.cartingAmount > 0
      ? `• Carting / Freight: ${formatInr(input.cartingAmount)}${input.cartingLocation ? ` (${input.cartingLocation})` : ""}`
      : `• Carting / Freight: To be confirmed with carting agency as per location`,
    `Total Estimate: ${formatInr(input.totalEstimate)}`,
    `Notes:`,
    input.baseStoneSourcing === "client_provided"
      ? `Base stone slabs to be supplied at site/factory by client as per specified dimensions and thickness.`
      : null,
    input.overlayDetails?.sourcing === "client_provided"
      ? `Overlay stone material to be provided by client.`
      : null,
    input.installationLabourAmount > 0
      ? `Scaffolding, if required, will be provided by the customer.`
      : null,
    input.cartingAmount <= 0
      ? `Transportation charges will be extra and on actuals as per delivery location.`
      : null,
    deliveryLine,
    validityLine,
    `Payment Terms: 75% advance and remaining 25% upon completion of work.`,
    `Please confirm if you'd like to proceed or if any modifications are needed.`,
    `Warm regards,`,
    input.preparerName || "[Your Name]",
    companyName,
  ];

  return lines.filter(Boolean).join("\n");
}
