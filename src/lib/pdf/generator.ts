/**
 * Branded PDF/print renderer.
 *
 * Renders any ERP document into a single professional HTML/PDF layout,
 * reading company identity (name, logo, address, phone, email, website,
 * GSTIN, PAN, bank details, authorized signatory, signature/stamp images,
 * colours) from `BrandingConfig` via `loadBranding()`, which in turn reads
 * the Company Profile module (Settings > Company). Consumers never
 * hard-code branding.
 *
 * Actions:
 *  - `renderDocHtml(doc, brand)` → pure HTML string (used for email body,
 *    hosted preview, and browser print-to-PDF).
 *  - `previewPdf(doc)`  → open in new tab (no auto-print).
 *  - `printPdf(doc)`    → open in new tab and trigger the print dialog.
 *  - `downloadPdf(doc)` → same as `printPdf`; the OS print dialog exposes
 *    "Save as PDF". A true binary PDF generator can slot in later behind
 *    the same signature without touching call sites.
 */
import {
  loadBranding,
  DEFAULT_BRANDING,
  type BrandingConfig,
  STONE_TECH_CIRCULAR_LOGO_DATA_URL,
  STONE_TECH_SIGNATURE_DATA_URL,
} from "@/lib/branding";
import { STONE_TECH_UPI_ID, STONE_TECH_UPI_QR_DATA_URL } from "@/lib/branding/upi-qr-asset";
import { amountToIndianWords } from "@/lib/format/words";

export type DocKind =
  | "quotation"
  | "estimate"
  | "sales_order"
  | "purchase_order"
  | "production_order"
  | "delivery_challan"
  | "dispatch_note"
  | "invoice"
  | "receipt"
  | "packing_list"
  | "qc_report";

export type PdfLine = {
  label: string;
  notes?: string;
  qty?: number | string;
  unit?: string;
  rate?: number | string;
  amount?: number | string;
  hsn?: string;
  image?: string | null;
};
export type PdfMeta = { label: string; value: string | number | null | undefined };

export type PdfParty = {
  name: string;
  address?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  website?: string;
};

export type PdfDoc = {
  kind: DocKind;
  title: string;
  number: string;
  date: string;
  /** Sender party. If omitted, filled from BrandingConfig. */
  from?: PdfParty;
  to: PdfParty;
  meta?: PdfMeta[];
  lines?: PdfLine[];
  totals?: PdfMeta[];
  balanceDue?: number;
  notes?: string;
  terms?: string;
  footer?: string;
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function brandParty(brand: BrandingConfig): PdfParty {
  return {
    name: brand.company_name,
    address: brand.address,
    gstin: brand.gstin,
    email: brand.email,
    phone: brand.phone,
    website: brand.website,
  };
}

function formatDocDate(d: string): string {
  if (!d) return "";
  const parts = d.split("T")[0].split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    const yy = yyyy.length === 4 ? yyyy.slice(2) : yyyy;
    return `${dd}/${mm}/${yy}`;
  }
  return d;
}

export function renderDocHtml(doc: PdfDoc, brand: BrandingConfig = DEFAULT_BRANDING): string {
  const from = doc.from ?? brandParty(brand);
  const deepTurquoise = "#083b43"; // Stone Tech OS signature deep turquoise
  const ink = "#0F172A";
  const muted = "#64748B";
  const border = "#E5E7EB";

  const isQuote = doc.kind === "quotation" || doc.kind === "estimate";
  const isInvoice =
    doc.kind === "invoice" ||
    /invoice/i.test(doc.title || "") ||
    /invoice/i.test(doc.number || "") ||
    /inv[-_\d]/i.test(doc.number || "");

  const titleText = isQuote
    ? "QUOTE"
    : isInvoice
      ? "GST INVOICE"
      : (doc.title || doc.kind || "DOCUMENT").toUpperCase();

  const numberLabel = isQuote ? "# :" : isInvoice ? "Invoice#" : "# :";
  const dateLabel = isQuote ? "Quote Date" : "Date";

  const logoUrl =
    !brand.logo_url ||
    brand.logo_url === "/branding/stone-tech-logo.jpg" ||
    brand.logo_url === "/branding/stone-tech-logo.png" ||
    brand.logo_url.includes("stone-tech-logo")
      ? STONE_TECH_CIRCULAR_LOGO_DATA_URL
      : brand.logo_url;

  const logo = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(brand.company_name)}" style="width:76px;height:76px;object-fit:contain;aspect-ratio:1/1;border-radius:50%;display:block;margin-bottom:8px;" />`
    : `<div style="font-size:20px;font-weight:800;color:${deepTurquoise};letter-spacing:-.01em;margin-bottom:4px;">${esc(brand.company_name)}</div>`;

  const posMeta = doc.meta?.find((m) => m.label.toLowerCase().includes("place of supply"));
  const placeOfSupply =
    posMeta?.value != null && String(posMeta.value).trim() !== ""
      ? String(posMeta.value)
      : (doc.to?.address || "").toLowerCase().includes("gujarat")
        ? "Gujarat (24)"
        : "Maharashtra (27)";

  const dueMeta = doc.meta?.find((m) => m.label.toLowerCase().includes("due date"));
  const dueDate = dueMeta ? String(dueMeta.value) : doc.date;
  const termsText = doc.terms || "Due on Receipt";

  const showHsn = (doc.lines ?? []).some((l) => l.hsn);
  const showPhoto = (doc.lines ?? []).some((l) => Boolean(l.image));

  const rows = (doc.lines ?? [])
    .map(
      (l, i) => `<tr style="border-bottom:1px solid ${border};font-size:10.5px;">
        <td style="padding:8px 4px;color:${muted};text-align:center;vertical-align:top;width:34px">${i + 1}</td>
        ${
          showPhoto
            ? `<td style="padding:6px 4px;text-align:center;vertical-align:top;width:56px">
                ${
                  l.image
                    ? `<img src="${esc(l.image)}" alt="${esc(l.label)}" style="width:44px;height:44px;object-fit:cover;border-radius:4px;border:1px solid ${border};display:block;margin:0 auto;" />`
                    : `<span style="color:${muted}">—</span>`
                }
              </td>`
            : ""
        }
        <td style="padding:8px 10px;text-align:left;vertical-align:top;">
          <div style="font-weight:700;color:${ink};font-size:11px;">${esc(l.label)}</div>
          ${l.notes ? `<div style="font-size:9.5px;color:${muted};margin-top:2px;white-space:pre-wrap;line-height:1.35">${esc(l.notes)}</div>` : ""}
        </td>
        ${showHsn ? `<td style="padding:8px 6px;font-family:monospace;font-size:10px;color:#334155;text-align:center;vertical-align:top;width:75px">${esc(l.hsn ?? "—")}</td>` : ""}
        <td style="padding:8px 8px;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top;width:65px">
          <div>${esc(l.qty ?? "")}</div>
          ${l.unit ? `<div style="font-size:9px;color:${muted};">${esc(l.unit)}</div>` : ""}
        </td>
        <td style="padding:8px 8px;text-align:right;font-variant-numeric:tabular-nums;vertical-align:top;width:80px">${esc(l.rate ?? "")}</td>
        <td style="padding:8px 10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;vertical-align:top;width:95px;color:${ink};">${esc(l.amount ?? "")}</td>
      </tr>`,
    )
    .join("");

  // Total in Words computation - strictly remove any balance or payment lines from invoices
  const totalsToRender = (doc.totals ?? []).filter((t) => {
    const lbl = (t.label || "").toLowerCase().trim();
    // Balance due belongs strictly in customer statements, never in an invoice PDF
    if (lbl.includes("balance")) return false;
    if (isInvoice && (lbl.includes("amount paid") || lbl.includes("paid"))) {
      return false;
    }
    return true;
  });

  const totalMeta =
    totalsToRender.find((t) => t.label.toLowerCase() === "total") ||
    totalsToRender[(totalsToRender.length ?? 1) - 1];
  let totalInWords = "";
  if (totalMeta && totalMeta.value) {
    const rawNum = parseFloat(String(totalMeta.value).replace(/[^0-9.-]/g, ""));
    if (!isNaN(rawNum) && rawNum > 0) {
      totalInWords = amountToIndianWords(rawNum);
    }
  }

  const totalsHtml = totalsToRender
    .map((t, i, arr) => {
      const isTotal = t.label.toLowerCase() === "total" || (arr.length > 0 && i === arr.length - 1);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4.5px 0;${
        isTotal
          ? `border-top:1.5px solid ${deepTurquoise};border-bottom:1.5px solid ${deepTurquoise};margin:6px 0;padding:8px 0;font-weight:800;font-size:13.5px;color:${deepTurquoise};`
          : "color:#475569;font-size:10.5px;"
      }">
        <span style="${isTotal ? "font-weight:800;" : ""}">${esc(t.label)}</span>
        <span style="font-variant-numeric:tabular-nums;${isTotal ? "font-weight:800;" : ""}">${esc(t.value ?? "")}</span>
      </div>`;
    })
    .join("");

  // Payment Details box with Bank of Baroda & UPI QR
  const upiId = brand.upi_id || STONE_TECH_UPI_ID;
  const qrImgSrc = brand.upi_qr_url || STONE_TECH_UPI_QR_DATA_URL;
  const bankName = brand.bank_name || "Bank of Baroda";
  const branchName = brand.bank_branch || "Chandlodiya, Ahmedabad";
  const acNumber = brand.bank_account_number || "53130200000136";
  const ifscCode = brand.bank_ifsc || "BARB0CHAAHM";

  const bankBlock = `
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#334155;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="line-height:1.5;">
          <div style="font-weight:700;color:${deepTurquoise};margin-bottom:3px;letter-spacing:0.02em;">ACCOUNT NAME: ${esc(brand.company_name.toUpperCase())}</div>
          <div style="color:#475569;">BANK: <span style="color:#1e293b;font-weight:600;">${esc(bankName)}</span></div>
          <div style="color:#475569;">BRANCH: <span style="color:#1e293b;font-weight:600;">${esc(branchName)}</span></div>
          <div style="color:#475569;">ACCOUNT NUMBER: <span style="color:#1e293b;font-weight:600;">${esc(acNumber)}</span></div>
          <div style="color:#475569;">IFS CODE: <span style="color:#1e293b;font-weight:600;">${esc(ifscCode)}</span></div>
          ${upiId ? `<div style="margin-top:3px;color:${deepTurquoise};font-weight:700;">UPI ID: ${esc(upiId)}</div>` : ""}
        </div>
        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;">
          <img src="${qrImgSrc}" alt="UPI QR Code" crossorigin="anonymous" style="width:74px;height:74px;object-fit:contain;border:1px solid #cbd5e1;border-radius:4px;padding:2px;background:#fff;display:block;" />
          <div style="font-size:8px;color:${muted};font-weight:600;margin-top:3px;">Scan to pay via UPI / GPay</div>
        </div>
      </div>
    </div>`;

  // Authorized Signatory
  const signatureUrl =
    !brand.signature_url ||
    brand.signature_url === "/signature.jpg" ||
    brand.signature_url === "/signature.png" ||
    brand.signature_url.includes("signature")
      ? STONE_TECH_SIGNATURE_DATA_URL
      : brand.signature_url;

  const isDefaultSignature =
    !brand.signature_url ||
    brand.signature_url === "/signature.jpg" ||
    brand.signature_url === "/signature.png" ||
    brand.signature_url === STONE_TECH_SIGNATURE_DATA_URL ||
    brand.signature_url.includes("signature");

  const signatoryBlock = `
    <div style="margin-top:24px;text-align:right;">
      ${!isDefaultSignature ? `<div style="font-size:10px;font-weight:700;color:${deepTurquoise};text-transform:uppercase;letter-spacing:0.03em;">FOR: ${esc(brand.company_name.toUpperCase())}</div>` : ""}
      <div style="margin:4px 0 2px;display:flex;justify-content:flex-end;">
        <img src="${signatureUrl}" alt="Authorized Signature" style="height:68px;max-width:180px;object-fit:contain;display:block;" />
      </div>
      ${!isDefaultSignature ? `<div style="font-size:10px;font-weight:700;color:#1e293b;">PROPRIETOR</div>` : ""}
      <div style="font-size:9.5px;color:${muted};margin-top:2px;">Authorized Signatory</div>
    </div>`;

  const uniquePhotos = Array.from(
    new Set((doc.lines ?? []).map((l) => l.image).filter((img): img is string => Boolean(img))),
  );
  const galleryBlock =
    uniquePhotos.length > 0
      ? `<div style="margin-top:16px;padding:10px 12px;border:1px solid ${border};border-radius:4px;background:#FAFAFA;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${muted};margin-bottom:8px;font-weight:700">Product &amp; Material Visuals</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${uniquePhotos
              .map(
                (url) =>
                  `<div style="border:1px solid ${border};border-radius:4px;overflow:hidden;background:#fff;padding:2px">
                    <img src="${esc(url)}" alt="Product Photo" style="width:130px;height:100px;object-fit:cover;border-radius:2px;display:block;" />
                  </div>`,
              )
              .join("")}
          </div>
        </div>`
      : "";

  return `<!doctype html><html><head><meta charset="utf-8" />
<base href="${typeof window !== "undefined" && window.location ? window.location.origin : ""}/">
<title>${esc(doc.title)} · ${esc(doc.number)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm 16mm; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:${ink}; margin:0; background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; letter-spacing: -0.01em; }
  .sheet { max-width: 780px; margin: 0 auto; padding: 20px 24px; }
  .toolbar { position: sticky; top:0; background:#f8fafc; border-bottom:1px solid ${border}; padding:8px 24px; display:flex; gap:8px; justify-content:flex-end; }
  .toolbar button { font-family: inherit; font-size:13px; font-weight:500; padding:6px 12px; border-radius:6px; border:1px solid ${border}; background:#fff; cursor:pointer; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; padding-bottom:12px; }
  table { width:100%; border-collapse:collapse; margin-top:10px; font-size:11px; }
  thead th {
    background:${deepTurquoise};
    color:#fff;
    font-size:10px;
    text-transform:uppercase;
    letter-spacing:.04em;
    font-weight:700;
    line-height:12px;
    vertical-align:middle;
    padding:7px 8px 8px;
    box-sizing:border-box;
  }
  .notes { margin-top:10px; font-size:10px; color:#475569; }
  .terms { margin-top:12px; font-size:9.5px; color:#64748b; white-space:pre-line; line-height:1.45; }
  .footer { margin-top:24px; padding-top:10px; border-top:1px solid ${border}; font-size:9.5px; color:${muted}; text-align:center; }
  .footer a { color:${deepTurquoise}; text-decoration:none; font-weight:600; }
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
        <div style="font-size:13px;font-weight:800;color:${deepTurquoise};text-transform:uppercase;letter-spacing:0.02em;">${esc(from.name || brand.company_name)}</div>
        <div style="font-size:10px;color:#475569;line-height:1.45;margin-top:3px;white-space:pre-line;">${esc(from.address || brand.address)}
India</div>
        ${brand.gstin ? `<div style="font-size:10px;font-weight:700;color:#111827;margin-top:3px;">GSTIN ${esc(brand.gstin)}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:700;color:${deepTurquoise};letter-spacing:0.04em;text-transform:uppercase;line-height:1.1;">${titleText}</div>
        <div style="font-size:11px;color:#4b5563;margin-top:5px;font-weight:600;">${numberLabel} ${esc(doc.number)}</div>
        ${!isInvoice ? `<div style="font-size:10px;color:#4b5563;margin-top:2px;">${dateLabel} : ${formatDocDate(doc.date)}</div>` : ""}
        ${!isInvoice ? `<div style="font-size:10px;color:#4b5563;margin-top:2px;">Place Of Supply : ${esc(placeOfSupply)}</div>` : ""}
      </div>
    </header>

    ${
      isQuote
        ? `<div style="border:1px solid #cbd5e1;border-radius:2px;display:grid;grid-template-columns:1fr 1fr;font-size:10px;margin:14px 0 12px;">
            <div style="background:#fafafa;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;padding:5px 10px;font-weight:700;color:#374151;">Bill To</div>
            <div style="background:#fafafa;border-bottom:1px solid #cbd5e1;padding:5px 10px;font-weight:700;color:#374151;">Ship To</div>
            <div style="padding:8px 10px;border-right:1px solid #cbd5e1;">
              <div style="font-weight:700;font-size:11px;color:#0f172a;">${esc(doc.to.name)}</div>
              ${doc.to.address ? `<div style="color:#475569;margin-top:2px;white-space:pre-line;line-height:1.4;">${esc(doc.to.address)}</div>` : ""}
              ${doc.to.gstin ? `<div style="margin-top:4px;font-weight:600;color:#1e293b;">GSTIN ${esc(doc.to.gstin)}</div>` : ""}
            </div>
            <div style="padding:8px 10px;">
              <div style="font-weight:700;font-size:11px;color:#0f172a;">${esc(doc.to.name)}</div>
              ${doc.to.address ? `<div style="color:#475569;margin-top:2px;white-space:pre-line;line-height:1.4;">${esc(doc.to.address)}</div>` : ""}
              ${doc.to.gstin ? `<div style="margin-top:4px;font-weight:600;color:#1e293b;">GSTIN ${esc(doc.to.gstin)}</div>` : ""}
            </div>
          </div>`
        : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:14px 0 10px;font-size:10px;">
            <div>
              <div style="font-size:10px;color:#64748b;margin-bottom:3px;">Bill To</div>
              <div style="font-weight:700;font-size:11px;color:#0f172a;">${esc(doc.to.name)}</div>
              ${doc.to.address ? `<div style="color:#475569;margin-top:2px;white-space:pre-line;line-height:1.4;">${esc(doc.to.address)}</div>` : ""}
              ${doc.to.gstin ? `<div style="margin-top:4px;font-weight:600;color:#1e293b;">GSTIN ${esc(doc.to.gstin)}</div>` : ""}
            </div>
            <div>
              <div style="font-size:10px;color:#64748b;margin-bottom:3px;">Ship To</div>
              <div style="font-weight:700;font-size:11px;color:#0f172a;">${esc(doc.to.name)}</div>
              ${doc.to.address ? `<div style="color:#475569;margin-top:2px;white-space:pre-line;line-height:1.4;">${esc(doc.to.address)}</div>` : ""}
              ${doc.to.gstin ? `<div style="margin-top:4px;font-weight:600;color:#1e293b;">GSTIN ${esc(doc.to.gstin)}</div>` : ""}
            </div>
          </div>
          <div style="font-size:10px;color:#374151;font-weight:600;margin:10px 0 12px;">Place Of Supply: ${esc(placeOfSupply)}</div>`
    }

    ${
      isInvoice
        ? `<div style="background:${deepTurquoise};color:#ffffff;border-radius:2px 2px 0 0;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;padding:7px 14px 8px;box-sizing:border-box;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;line-height:12px;">
            <div style="text-align:center;">Invoice Date</div>
            <div style="text-align:center;">Terms</div>
            <div style="text-align:center;">Due Date</div>
          </div>
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-top:none;border-radius:0 0 2px 2px;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;padding:8px 14px;box-sizing:border-box;font-size:10.5px;color:#0f172a;margin-bottom:14px;line-height:14px;">
            <div style="text-align:center;font-weight:500;">${formatDocDate(doc.date)}</div>
            <div style="text-align:center;">${esc(termsText)}</div>
            <div style="text-align:center;font-weight:500;">${formatDocDate(dueDate)}</div>
          </div>`
        : ""
    }

    ${
      rows
        ? `<table>
            <thead><tr>
              <th style="width:34px;text-align:center;vertical-align:middle;padding:7px 4px 8px;">#</th>
              ${showPhoto ? `<th style="width:52px;text-align:center;vertical-align:middle;padding:7px 4px 8px;">Photo</th>` : ""}
              <th style="text-align:left;vertical-align:middle;padding:7px 10px 8px;">Item &amp; Description</th>
              ${showHsn ? `<th style="width:75px;text-align:center;vertical-align:middle;padding:7px 6px 8px;">HSN/SAC</th>` : ""}
              <th style="width:65px;text-align:right;vertical-align:middle;padding:7px 8px 8px;">Qty</th>
              <th style="width:80px;text-align:right;vertical-align:middle;padding:7px 8px 8px;">Rate</th>
              <th style="width:95px;text-align:right;vertical-align:middle;padding:7px 10px 8px;">Amount</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : ""
    }

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:14px;gap:20px;">
      <div style="flex:1;max-width:440px;">
        ${
          totalInWords
            ? `<div style="font-size:10px;margin-bottom:14px;">
                <span style="color:#64748b;">Total In Words: </span>
                <b style="color:${deepTurquoise};font-weight:700;">${esc(totalInWords)}</b>
              </div>`
            : ""
        }

        ${
          doc.notes
            ? `<div class="notes">
                <div style="font-weight:700;color:#374151;margin-bottom:2px;">Notes</div>
                <div style="white-space:pre-line;">${esc(doc.notes)}</div>
              </div>`
            : ""
        }

        ${
          doc.terms
            ? `<div class="terms">
                <div style="font-weight:700;color:#374151;margin-bottom:2px;font-size:10px;">Terms &amp; Conditions</div>
                <div style="white-space:pre-line;">${esc(doc.terms)}</div>
              </div>`
            : ""
        }

        ${bankBlock}
      </div>

      <div style="width:280px;text-align:right;">
        <div style="display:inline-block;width:100%;font-size:10.5px;">
          ${totalsHtml}
        </div>
        ${signatoryBlock}
      </div>
    </div>

    ${galleryBlock}

    <div class="footer">
      ${esc(doc.footer ?? `${brand.company_name} — System Generated Document`)}
      ${brand.pan ? ` · PAN: ${esc(brand.pan)}` : ""}
      ${brand.website ? ` · <a href="${esc(brand.website)}">${esc(brand.website)}</a>` : ""}
    </div>
  </div>
</body></html>`;
}

/** Render `doc` fully-branded to an HTML string (async, loads branding). */
export async function renderDocHtmlAsync(doc: PdfDoc): Promise<string> {
  const brand = await loadBranding();
  return renderDocHtml(doc, brand);
}

function openInNewTab(html: string, autoPrint: boolean, targetWindow?: Window | null) {
  // NOTE: `noopener` makes window.open() return null, which historically
  // caused Download/Preview PDF to appear "blank" — the write never
  // happened. We deliberately open without noopener so we can populate
  // the new tab, then null out `opener` inside the tab as a safety net.
  const w =
    targetWindow && !targetWindow.closed ? targetWindow : window.open("about:blank", "_blank");
  if (!w) {
    // Popup blocked — fall back to a Blob URL download so the user still
    // gets the document instead of a silent failure.
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
    // Wait for images (logo/signature/QR) to load before triggering print;
    // otherwise the preview renders before the logo comes back and prints
    // a text-only header.
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
    // Hard timeout so a stuck image doesn't block the print dialog forever.
    setTimeout(trigger, 3500);
  }
}

async function getJsPdfConstructor() {
  const jspdfModule = await import("jspdf");
  return (
    jspdfModule.jsPDF ??
    (jspdfModule.default as unknown as { jsPDF?: typeof jspdfModule.jsPDF })?.jsPDF ??
    (jspdfModule.default as unknown as typeof jspdfModule.jsPDF)
  );
}

/**
 * Pure vector fallback generator using jsPDF.
 * Guarantees a 100% valid, uncorrupted binary PDF without relying on DOM/canvas.
 */
async function generateVectorPdfFallback(doc: PdfDoc): Promise<Blob> {
  const brand = await loadBranding().catch(() => DEFAULT_BRANDING);
  const from = doc.from ?? brandParty(brand);
  const JsPdf = await getJsPdfConstructor();
  const pdf = new JsPdf("p", "mm", "a4");

  const cleanAmount = (s: unknown) => String(s ?? "").replace(/₹/g, "Rs. ");

  // Top styling: Clean Zoho Books slate aesthetic
  const isQuote = doc.kind === "quotation" || doc.kind === "estimate";
  const isInvoice = doc.kind === "invoice";
  const titleText = isQuote
    ? "QUOTE"
    : isInvoice
      ? "GST INVOICE"
      : (doc.title || doc.kind || "DOCUMENT").toUpperCase();

  // Company Name (Left)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(17, 24, 39);
  pdf.text((brand.company_name || "STONE TECH").toUpperCase(), 15, 20);

  // Address & GSTIN (Left)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  let compY = 24.5;
  if (brand.address) {
    const addrLines = pdf.splitTextToSize(brand.address, 85);
    pdf.text(addrLines.slice(0, 3), 15, compY);
    compY += Math.min(addrLines.length, 3) * 3.5;
  }
  if (brand.gstin) {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(17, 24, 39);
    pdf.text(`GSTIN ${brand.gstin}`, 15, compY);
  }

  // Document Title & Number (Right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(8, 59, 67); // #083b43 deep turquoise
  pdf.text(titleText, 195, 20, { align: "right" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(75, 85, 99);
  pdf.text(`${isQuote ? "# :" : isInvoice ? "Invoice#" : "# :"} ${doc.number || ""}`, 195, 26, {
    align: "right",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  if (!isInvoice) {
    pdf.text(`${isQuote ? "Quote Date" : "Date"} : ${formatDocDate(doc.date)}`, 195, 30.5, {
      align: "right",
    });
    const posMeta = doc.meta?.find((m) => m.label.toLowerCase().includes("place of supply"));
    const placeOfSupply =
      posMeta?.value != null && String(posMeta.value).trim() !== ""
        ? String(posMeta.value)
        : (doc.to?.address || "").toLowerCase().includes("gujarat")
          ? "Gujarat (24)"
          : "Maharashtra (27)";
    pdf.text(`Place Of Supply : ${placeOfSupply}`, 195, 34.5, {
      align: "right",
    });
  }

  // Divider
  let y = 38;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(15, y, 195, y);

  // FROM Block (Left) & BILL TO Block (Right)
  y = 41;

  // FROM Block
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text("FROM", 15, y);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(from.name || brand.company_name, 15, y + 4.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  let fromY = y + 8.5;
  if (from.address) {
    const addrLines = pdf.splitTextToSize(from.address, 80);
    pdf.text(addrLines, 15, fromY);
    fromY += addrLines.length * 3.5;
  }
  if (from.gstin) {
    pdf.setFont("helvetica", "bold");
    pdf.text("GSTIN: ", 15, fromY);
    pdf.setFont("helvetica", "normal");
    pdf.text(from.gstin, 27, fromY);
    fromY += 3.5;
  }
  if (from.phone || brand.phone) {
    pdf.text(`Phone: ${from.phone || brand.phone}`, 15, fromY);
    fromY += 3.5;
  }
  if (from.email || brand.email) {
    pdf.text(`Email: ${from.email || brand.email}`, 15, fromY);
    fromY += 3.5;
  }
  if (from.website || brand.website) {
    pdf.text(`Web: ${from.website || brand.website}`, 15, fromY);
    fromY += 3.5;
  }

  // BILL TO Block
  let toY = y + 8.5;
  if (doc.to) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("BILL TO", 110, y);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(doc.to.name || "Customer", 110, y + 4.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    if (doc.to.address) {
      const addrLines = pdf.splitTextToSize(doc.to.address, 80);
      pdf.text(addrLines, 110, toY);
      toY += addrLines.length * 3.5;
    }
    if (doc.to.gstin) {
      pdf.setFont("helvetica", "bold");
      pdf.text("GSTIN: ", 110, toY);
      pdf.setFont("helvetica", "normal");
      pdf.text(doc.to.gstin, 122, toY);
      toY += 3.5;
    }
    if (doc.to.phone) {
      pdf.text(`Phone: ${doc.to.phone}`, 110, toY);
      toY += 3.5;
    }
    if (doc.to.email) {
      pdf.text(`Email: ${doc.to.email}`, 110, toY);
      toY += 3.5;
    }
  }

  y = Math.max(fromY, toY) + 4;

  // Metadata items if any
  if (doc.meta && doc.meta.length > 0) {
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(15, y, 180, 10, 1.5, 1.5, "FD");
    let metaX = 20;
    pdf.setFontSize(8);
    for (const m of doc.meta.slice(0, 4)) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${m.label}:`, metaX, y + 6);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(m.value ?? "—"), metaX + 22, y + 6);
      metaX += 42;
    }
    y += 14;
  }

  // Items Table Header - Centered vertically in deep turquoise bar (#083b43)
  const lines = doc.lines ?? [];
  const hasHsnInLines = lines.some((l) => Boolean(l.hsn));

  const headerHeight = 7.5;
  pdf.setFillColor(8, 59, 67); // #083b43 deep turquoise Zoho signature
  pdf.roundedRect(15, y, 180, headerHeight, 0.5, 0.5, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  const textY = y + headerHeight / 2;

  pdf.text("#", 18, textY, { align: "center", baseline: "middle" });
  pdf.text("Item & Description", 24, textY, { baseline: "middle" });
  if (hasHsnInLines) {
    pdf.text("HSN/SAC", 110, textY, { align: "center", baseline: "middle" });
    pdf.text("Qty", 130, textY, { align: "right", baseline: "middle" });
    pdf.text("Unit", 142, textY, { align: "center", baseline: "middle" });
    pdf.text("Rate", 166, textY, { align: "right", baseline: "middle" });
    pdf.text("Amount", 192, textY, { align: "right", baseline: "middle" });
  } else {
    pdf.text("Qty", 125, textY, { align: "right", baseline: "middle" });
    pdf.text("Unit", 138, textY, { align: "center", baseline: "middle" });
    pdf.text("Rate", 166, textY, { align: "right", baseline: "middle" });
    pdf.text("Amount", 192, textY, { align: "right", baseline: "middle" });
  }

  y += headerHeight;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }
    y += 6;
    pdf.text(String(i + 1), 18, y, { align: "center" });
    if (hasHsnInLines) {
      pdf.text(l.label ? l.label.slice(0, 38) : "—", 24, y);
      pdf.text(l.hsn ? String(l.hsn) : "—", 110, y, { align: "center" });
      pdf.text(String(l.qty ?? ""), 130, y, { align: "right" });
      pdf.text(String(l.unit ?? ""), 142, y, { align: "center" });
      pdf.text(cleanAmount(l.rate), 166, y, { align: "right" });
      pdf.text(cleanAmount(l.amount), 192, y, { align: "right" });
    } else {
      pdf.text(l.label ? l.label.slice(0, 45) : "—", 24, y);
      pdf.text(String(l.qty ?? ""), 125, y, { align: "right" });
      pdf.text(String(l.unit ?? ""), 138, y, { align: "center" });
      pdf.text(cleanAmount(l.rate), 166, y, { align: "right" });
      pdf.text(cleanAmount(l.amount), 192, y, { align: "right" });
    }

    if (l.notes) {
      y += 4;
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(l.notes.slice(0, 70), 24, y);
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);
    }

    pdf.setDrawColor(241, 245, 249);
    pdf.line(15, y + 2, 195, y + 2);
  }

  y += 6;
  // Totals - strictly remove any balance or payment lines from invoices
  const totals = (doc.totals ?? []).filter((t) => {
    const lbl = (t.label || "").toLowerCase().trim();
    if (lbl.includes("balance")) return false;
    if (isInvoice && (lbl.includes("amount paid") || lbl.includes("paid"))) {
      return false;
    }
    return true;
  });
  for (let i = 0; i < totals.length; i++) {
    const t = totals[i];
    if (y > 255) {
      pdf.addPage();
      y = 20;
    }
    const isLast = i === totals.length - 1;
    pdf.setFont("helvetica", isLast ? "bold" : "normal");
    pdf.setFontSize(isLast ? 10 : 8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${t.label}:`, 150, y, { align: "right" });
    pdf.text(cleanAmount(t.value), 190, y, { align: "right" });
    y += isLast ? 7 : 5;
  }

  // Total in Words
  const totalMeta =
    totals.find((t) => t.label.toLowerCase() === "total") || totals[(totals.length ?? 1) - 1];
  if (totalMeta && totalMeta.value) {
    const rawNum = parseFloat(String(totalMeta.value).replace(/[^0-9.-]/g, ""));
    if (!isNaN(rawNum) && rawNum > 0) {
      const words = amountToIndianWords(rawNum);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Total In Words:", 15, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(words, 36, y);
      y += 6;
    }
  }

  // Payment Details & Signatory
  y = Math.max(y + 2, 230);
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  const upiId = brand.upi_id || STONE_TECH_UPI_ID;
  const hasBankDetails = brand.bank_name || brand.bank_account_number || upiId;
  if (hasBankDetails) {
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(15, y, 115, 34, 1.5, 1.5, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("BANK & PAYMENT DETAILS", 18, y + 4.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    let bankY = y + 9;
    pdf.text(`A/C Name: ${(brand.company_name || "STONE TECH").toUpperCase()}`, 18, bankY);
    bankY += 3.8;
    pdf.text(`Bank: ${(brand.bank_name || "Bank of Baroda").toUpperCase()}`, 18, bankY);
    bankY += 3.8;
    pdf.text(`Branch: ${(brand.bank_branch || "Chandlodiya, Ahmedabad").toUpperCase()}`, 18, bankY);
    bankY += 3.8;
    pdf.text(`A/C No: ${brand.bank_account_number || "53130200000136"}`, 18, bankY);
    bankY += 3.8;
    pdf.text(`IFS Code: ${brand.bank_ifsc || "BARB0CHAAHM"}`, 18, bankY);
    bankY += 3.8;
    if (upiId) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(13, 148, 136); // teal-600
      pdf.text(`UPI ID: ${upiId}`, 18, bankY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
    }

    try {
      pdf.addImage(STONE_TECH_UPI_QR_DATA_URL, "PNG", 92, y + 4, 23, 23);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("SCAN TO PAY (UPI)", 103.5, y + 30, { align: "center" });
    } catch {
      /* image add fallback */
    }
  }

  // Authorized Signatory
  let sigAdded = false;
  try {
    pdf.addImage(STONE_TECH_SIGNATURE_DATA_URL, "PNG", 148, y + 2, 47, 24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Authorized Signatory", 195, y + 28, { align: "right" });
    sigAdded = true;
  } catch {
    /* fallback to text */
  }

  if (!sigAdded) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(8, 59, 67); // #083b43 deep turquoise
    pdf.text(`FOR: ${(brand.company_name || "STONE TECH").toUpperCase()}`, 195, y + 4.5, {
      align: "right",
    });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("PROPRIETOR", 195, y + 20, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Authorized Signature", 195, y + 25, { align: "right" });
  }

  // Terms & Notes
  if (doc.terms || doc.notes) {
    y += 30;
    if (y < 275) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("TERMS & NOTES", 15, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(71, 85, 105);
      const textContent = [doc.notes, doc.terms].filter(Boolean).join("\n");
      const termLines = pdf.splitTextToSize(textContent, 175);
      pdf.text(termLines.slice(0, 4), 15, y + 4);
    }
  }

  // Centered Footer
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  const footerText = `${brand.company_name} — System Generated Document${brand.pan ? ` · PAN: ${brand.pan}` : ""}${brand.website ? ` · ${brand.website}` : ""}`;
  pdf.text(footerText, 105, 290, { align: "center" });

  return pdf.output("blob");
}

/**
 * Generates an actual binary PDF Blob for the document.
 * Uses jsPDF and html2canvas with graceful fallback.
 * NEVER returns an HTML blob under an application/pdf MIME type.
 */
export async function generatePdfBlob(doc: PdfDoc): Promise<Blob> {
  const html = await renderDocHtmlAsync(doc);
  if (typeof document === "undefined") {
    return generateVectorPdfFallback(doc);
  }

  // Create isolated offscreen iframe to shield html2canvas from host Tailwind v4 CSS
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1200px";
  iframe.style.border = "none";
  iframe.style.backgroundColor = "#ffffff";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      return await generateVectorPdfFallback(doc);
    }

    // Strip out toolbar before writing to avoid any layout shifts or artifacts
    const printHtml = html.replace(/<div class="toolbar no-print">[\s\S]*?<\/div>/, "");

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    const sheetEl = (iframeDoc.querySelector(".sheet") as HTMLElement) || iframeDoc.body;

    // Reset iframe window and body scrolling to guarantee top-left (0,0) alignment
    if (iframe.contentWindow) {
      iframe.contentWindow.scrollTo(0, 0);
    }
    iframeDoc.body.style.margin = "0";
    iframeDoc.body.style.padding = "0";

    // Wait for all images inside sheetEl to finish loading
    const images = Array.from(sheetEl.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => {
        img.crossOrigin = "anonymous";
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(() => resolve(), 2500);
        });
      }),
    );

    // Wait for document fonts if supported
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready.catch(() => {});
    }

    // Brief tick to ensure full layout rendering
    await new Promise((r) => setTimeout(r, 60));

    const html2canvasModule = await import("html2canvas");
    const html2canvas = html2canvasModule.default ?? html2canvasModule;
    const JsPdf = await getJsPdfConstructor();

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(sheetEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });
    } catch {
      // If external images fail CORS, hide them and capture layout
      sheetEl.querySelectorAll("img").forEach((img) => {
        (img as HTMLElement).style.display = "none";
      });
      canvas = await html2canvas(sheetEl, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });
    }

    let imgData: string;
    try {
      imgData = canvas.toDataURL("image/jpeg", 0.95);
    } catch {
      // Canvas was tainted; re-capture with images hidden
      sheetEl.querySelectorAll("img").forEach((img) => {
        (img as HTMLElement).style.display = "none";
      });
      const cleanCanvas = await html2canvas(sheetEl, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });
      imgData = cleanCanvas.toDataURL("image/jpeg", 0.95);
    }

    const pdf = new JsPdf("p", "mm", "a4");
    const pdfWidth = 210;
    const pdfHeight = 297;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const outputBlob = pdf.output("blob");
    if (outputBlob.size > 100) {
      return outputBlob;
    }
    return await generateVectorPdfFallback(doc);
  } catch (err) {
    console.warn("Canvas PDF generation failed, generating clean vector PDF:", err);
    return await generateVectorPdfFallback(doc);
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

/** Open the branded document in a new tab (no print dialog). */
export async function previewPdf(doc: PdfDoc, targetWindow?: Window | null): Promise<void> {
  openInNewTab(await renderDocHtmlAsync(doc), false, targetWindow);
}

/** Open the branded document and trigger the print dialog. */
export async function printPdf(doc: PdfDoc, targetWindow?: Window | null): Promise<void> {
  openInNewTab(await renderDocHtmlAsync(doc), true, targetWindow);
}

/**
 * Download document: downloads the full self-contained PDF file
 * directly without opening a disruptive system print dialog.
 */
export async function downloadPdf(doc: PdfDoc, _targetWindow?: Window | null): Promise<void> {
  try {
    const blob = await generatePdfBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (doc.title || doc.kind || "document").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeNumber = (doc.number || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    a.download = `${safeTitle}_${safeNumber || "doc"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } catch {
    printPdf(doc);
  }
}
