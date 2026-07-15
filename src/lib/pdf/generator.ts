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
import { loadBranding, DEFAULT_BRANDING, type BrandingConfig } from "@/lib/branding";

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
  qty?: number | string;
  unit?: string;
  rate?: number | string;
  amount?: number | string;
  hsn?: string;
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

export function renderDocHtml(doc: PdfDoc, brand: BrandingConfig = DEFAULT_BRANDING): string {
  const from = doc.from ?? brandParty(brand);
  const accent = brand.primary || "#0F766E";
  const ink = "#0F172A";
  const muted = "#64748B";
  const border = "#E5E7EB";

  const logo = brand.logo_url
    ? `<img src="${esc(brand.logo_url)}" alt="${esc(brand.company_name)}" style="max-height:52px;max-width:180px;object-fit:contain" />`
    : `<div style="font-size:22px;font-weight:800;color:${accent};letter-spacing:-.01em">${esc(brand.company_name)}</div>`;

  const showHsn = (doc.lines ?? []).some((l) => l.hsn);
  const rows = (doc.lines ?? [])
    .map(
      (l, i) => `<tr>
        <td style="padding:8px;border-bottom:1px solid ${border};color:${muted};font-size:11px">${i + 1}</td>
        <td style="padding:8px;border-bottom:1px solid ${border}">${esc(l.label)}</td>
        ${showHsn ? `<td style="padding:8px;border-bottom:1px solid ${border};font-family:monospace;font-size:11px">${esc(l.hsn ?? "")}</td>` : ""}
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right">${esc(l.qty ?? "")}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};color:${muted}">${esc(l.unit ?? "")}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right">${esc(l.rate ?? "")}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;font-variant-numeric:tabular-nums">${esc(l.amount ?? "")}</td>
      </tr>`,
    )
    .join("");

  const meta = (doc.meta ?? [])
    .map(
      (m) =>
        `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
          <span style="color:${muted}">${esc(m.label)}</span>
          <span style="color:${ink}">${esc(m.value ?? "—")}</span>
        </div>`,
    )
    .join("");

  const totals = (doc.totals ?? [])
    .map(
      (t, i, arr) => `<div style="display:flex;justify-content:space-between;padding:5px 0;${
        i === arr.length - 1
          ? `border-top:2px solid ${accent};margin-top:4px;font-weight:700;font-size:14px;color:${ink}`
          : `color:#334155`
      }">
        <span>${esc(t.label)}</span>
        <span style="font-variant-numeric:tabular-nums">${esc(t.value ?? "")}</span>
      </div>`,
    )
    .join("");

  const partyBlock = (p: PdfParty, label: string) => `
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:${muted};margin-bottom:6px">${label}</div>
      <div style="font-weight:700;font-size:14px;color:${ink}">${esc(p.name)}</div>
      ${p.address ? `<div style="font-size:12px;color:#475569;white-space:pre-line;margin-top:2px">${esc(p.address)}</div>` : ""}
      ${p.gstin ? `<div style="font-size:11px;color:${muted};margin-top:4px"><b>GSTIN:</b> ${esc(p.gstin)}</div>` : ""}
      ${p.email ? `<div style="font-size:11px;color:${muted}">${esc(p.email)}</div>` : ""}
      ${p.phone ? `<div style="font-size:11px;color:${muted}">${esc(p.phone)}</div>` : ""}
    </div>`;

  // Payment Details box — only when at least one bank field is set, so a
  // profile that hasn't filled these in yet doesn't show an empty box.
  const hasBankDetails = brand.bank_name || brand.bank_account_number || brand.bank_ifsc || brand.upi_id;
  const bankBlock = hasBankDetails
    ? `<div style="flex:1;min-width:220px;border:1px solid ${border};border-radius:6px;padding:10px 14px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:${muted};margin-bottom:6px">Payment Details</div>
        ${brand.bank_name ? `<div style="font-size:12px"><b>Bank:</b> ${esc(brand.bank_name)}</div>` : ""}
        ${brand.bank_branch ? `<div style="font-size:12px"><b>Branch:</b> ${esc(brand.bank_branch)}</div>` : ""}
        ${brand.bank_account_number ? `<div style="font-size:12px"><b>A/C No:</b> ${esc(brand.bank_account_number)}</div>` : ""}
        ${brand.bank_ifsc ? `<div style="font-size:12px"><b>IFSC:</b> ${esc(brand.bank_ifsc)}</div>` : ""}
        ${brand.upi_id ? `<div style="font-size:12px"><b>UPI:</b> ${esc(brand.upi_id)}</div>` : ""}
      </div>`
    : "";

  // Authorized-signatory sign-off block — only when the profile has a
  // signatory name, signature image, or stamp image to show.
  const hasSignatory = brand.authorized_signatory || brand.signature_url || brand.stamp_url;
  const signatoryBlock = hasSignatory
    ? `<div style="flex:1;min-width:220px;text-align:right">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:${muted};margin-bottom:6px">For ${esc(brand.company_name)}</div>
        <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:10px">
          ${brand.signature_url ? `<img src="${esc(brand.signature_url)}" alt="Signature" style="max-height:44px;max-width:120px;object-fit:contain" />` : ""}
          ${brand.stamp_url ? `<img src="${esc(brand.stamp_url)}" alt="Company stamp" style="max-height:60px;max-width:60px;object-fit:contain" />` : ""}
        </div>
        ${brand.authorized_signatory ? `<div style="font-size:12px;margin-top:4px">${esc(brand.authorized_signatory)}</div>` : ""}
        <div style="font-size:10px;color:${muted}">Authorized Signatory</div>
      </div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(doc.title)} · ${esc(doc.number)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:${ink}; margin:0; background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { max-width: 780px; margin: 0 auto; padding: 24px; }
  .toolbar { position: sticky; top:0; background:#f8fafc; border-bottom:1px solid ${border}; padding:8px 24px; display:flex; gap:8px; justify-content:flex-end; }
  .toolbar button { font: inherit; padding:6px 12px; border-radius:6px; border:1px solid ${border}; background:#fff; cursor:pointer; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:16px; border-bottom:3px solid ${accent}; }
  .doc-title { font-size:22px; margin:0; color:${accent}; letter-spacing:-.01em; font-weight:700; }
  .doc-sub { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:${muted}; margin-top:4px; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:20px 0 16px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; font-size:12px; }
  thead th { text-align:left; padding:8px; background:${accent}; color:#fff; font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
  thead th:last-child, thead th.right { text-align:right; }
  .totals { margin-top:20px; margin-left:auto; width:300px; }
  .notes { margin-top:16px; padding:12px 14px; background:#F8FAFC; border-left:3px solid ${accent}; font-size:12px; color:#334155; }
  .terms { margin-top:14px; font-size:11px; color:${muted}; white-space:pre-line; line-height:1.55; }
  .footer { margin-top:28px; padding-top:12px; border-top:1px solid ${border}; font-size:10px; color:${muted}; text-align:center; }
  .footer a { color:${accent}; text-decoration:none; }
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
        <div class="doc-sub">${esc(brand.tagline || "")}</div>
      </div>
      <div style="text-align:right">
        <div class="doc-title">${esc(doc.title)}</div>
        <div style="font-size:14px;font-weight:600;color:${ink};margin-top:4px">${esc(doc.number)}</div>
        <div class="doc-sub">${esc(doc.date)}</div>
      </div>
    </header>

    <div class="parties">
      ${partyBlock(from, "From")}
      ${partyBlock(doc.to, "Bill To")}
    </div>

    ${meta ? `<div style="border:1px solid ${border};border-radius:6px;padding:10px 14px;margin-bottom:8px">${meta}</div>` : ""}

    ${
      rows
        ? `<table>
            <thead><tr>
              <th style="width:28px">#</th>
              <th>Description</th>
              ${showHsn ? `<th style="width:70px">HSN</th>` : ""}
              <th class="right" style="width:70px">Qty</th>
              <th style="width:60px">Unit</th>
              <th class="right" style="width:90px">Rate</th>
              <th class="right" style="width:110px">Amount</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : ""
    }

    ${totals ? `<div class="totals">${totals}</div>` : ""}

    <div style="display:flex;justify-content:space-between;gap:24px;margin-top:20px;flex-wrap:wrap">
      ${bankBlock}
      ${signatoryBlock}
    </div>

    ${doc.notes ? `<div class="notes"><b>Notes:</b> ${esc(doc.notes)}</div>` : ""}
    ${doc.terms ? `<div class="terms"><b>Terms &amp; Conditions</b>\n${esc(doc.terms)}</div>` : ""}

    <div class="footer">
      ${esc(doc.footer ?? `${brand.company_name} — This is a system-generated document.`)}
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

function openInNewTab(html: string, autoPrint: boolean) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  if (autoPrint) {
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* ignore */
      }
    }, 350);
  }
}

/** Open the branded document in a new tab (no print dialog). */
export async function previewPdf(doc: PdfDoc): Promise<void> {
  openInNewTab(await renderDocHtmlAsync(doc), false);
}

/** Open the branded document and trigger the print dialog. */
export async function printPdf(doc: PdfDoc): Promise<void> {
  openInNewTab(await renderDocHtmlAsync(doc), true);
}

/**
 * Download as PDF: opens the print dialog which offers "Save as PDF"
 * on every modern OS. Kept as a distinct entry point so a future
 * binary-PDF backend can slot in without touching call sites.
 */
export async function downloadPdf(doc: PdfDoc): Promise<void> {
  return printPdf(doc);
}
