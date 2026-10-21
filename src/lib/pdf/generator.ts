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
import { STONE_TECH_UPI_ID, STONE_TECH_UPI_QR_DATA_URL } from "@/lib/branding/upi-qr-asset";

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

export function renderDocHtml(doc: PdfDoc, brand: BrandingConfig = DEFAULT_BRANDING): string {
  const from = doc.from ?? brandParty(brand);
  const accent = brand.primary || "#0F766E";
  const ink = "#0F172A";
  const muted = "#64748B";
  const border = "#E5E7EB";

  const logo = brand.logo_url
    ? `<img src="${esc(brand.logo_url)}" alt="${esc(brand.company_name)}" style="max-height:64px;max-width:220px;object-fit:contain;display:block" />`
    : `<div style="font-size:24px;font-weight:800;color:${accent};letter-spacing:-.01em">${esc(brand.company_name)}</div>`;

  const showHsn = (doc.lines ?? []).some((l) => l.hsn);
  const showPhoto = (doc.lines ?? []).some((l) => Boolean(l.image));
  const rows = (doc.lines ?? [])
    .map(
      (l, i) => `<tr>
        <td style="padding:9px 4px;border-bottom:1px solid ${border};color:${muted};font-size:11px;text-align:center;vertical-align:middle;width:34px">${i + 1}</td>
        ${
          showPhoto
            ? `<td style="padding:6px 4px;border-bottom:1px solid ${border};text-align:center;vertical-align:middle;width:56px">
                ${
                  l.image
                    ? `<img src="${esc(l.image)}" alt="${esc(l.label)}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid ${border};display:block;margin:0 auto;" />`
                    : `<span style="color:${muted}">—</span>`
                }
              </td>`
            : ""
        }
        <td style="padding:9px 12px;border-bottom:1px solid ${border};text-align:left;vertical-align:middle">
          <div style="font-weight:600">${esc(l.label)}</div>
          ${l.notes ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;white-space:pre-wrap;line-height:1.35">${esc(l.notes)}</div>` : ""}
        </td>
        ${showHsn ? `<td style="padding:9px 6px;border-bottom:1px solid ${border};font-family:monospace;font-size:11px;text-align:center;vertical-align:middle;width:75px">${esc(l.hsn ?? "")}</td>` : ""}
        <td style="padding:9px 10px;border-bottom:1px solid ${border};text-align:right;font-variant-numeric:tabular-nums;vertical-align:middle;width:65px">${esc(l.qty ?? "")}</td>
        <td style="padding:9px 6px;border-bottom:1px solid ${border};color:${muted};font-size:11px;text-align:center;vertical-align:middle;width:60px">${esc(l.unit ?? "")}</td>
        <td style="padding:9px 10px;border-bottom:1px solid ${border};text-align:right;font-variant-numeric:tabular-nums;vertical-align:middle;width:90px">${esc(l.rate ?? "")}</td>
        <td style="padding:9px 12px;border-bottom:1px solid ${border};text-align:right;font-weight:600;font-variant-numeric:tabular-nums;vertical-align:middle;width:110px">${esc(l.amount ?? "")}</td>
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

  // Payment Details box — renders on quotations, invoices, and any customer doc
  const upiId = brand.upi_id || STONE_TECH_UPI_ID;
  const qrImgSrc = brand.upi_qr_url || STONE_TECH_UPI_QR_DATA_URL;
  const hasBankDetails = brand.bank_name || brand.bank_account_number || brand.bank_ifsc || upiId;

  const qrAmount = doc.balanceDue ?? 0;
  const scanAmountText =
    qrAmount > 0
      ? `Scan to pay ₹${qrAmount.toLocaleString("en-IN")}`
      : `Scan to pay via UPI / GPay`;

  const bankBlock = hasBankDetails
    ? `<div style="flex:1;min-width:300px;border:1px solid ${border};border-radius:6px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:${muted};margin-bottom:6px;font-weight:700">Bank &amp; Payment Details</div>
          ${brand.bank_name ? `<div style="font-size:12px;margin-bottom:2px"><b>Bank:</b> ${esc(brand.bank_name)}${brand.bank_branch ? ` (${esc(brand.bank_branch)})` : ""}</div>` : ""}
          ${brand.bank_account_number ? `<div style="font-size:12px;margin-bottom:2px"><b>A/C No:</b> ${esc(brand.bank_account_number)}</div>` : ""}
          ${brand.bank_ifsc ? `<div style="font-size:12px;margin-bottom:2px"><b>IFSC:</b> ${esc(brand.bank_ifsc)}</div>` : ""}
          ${upiId ? `<div style="font-size:12px;color:#0d9488;margin-bottom:2px"><b>UPI ID:</b> ${esc(upiId)}</div>` : ""}
        </div>
        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;margin-left:14px">
          <div style="font-size:9.5px;color:${muted};margin-bottom:4px;font-weight:600">${scanAmountText}</div>
          <img src="${qrImgSrc}" alt="UPI QR Code" crossorigin="anonymous" style="width:84px;height:84px;border-radius:6px;border:1px solid ${border};background:#fff;padding:2px;display:block" />
          <div style="font-size:8px;color:${muted};margin-top:3px;font-weight:600">GPay · PhonePe · Paytm</div>
        </div>
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

  const uniquePhotos = Array.from(
    new Set((doc.lines ?? []).map((l) => l.image).filter((img): img is string => Boolean(img))),
  );
  const galleryBlock =
    uniquePhotos.length > 0
      ? `<div style="margin-top:20px;padding:12px 14px;border:1px solid ${border};border-radius:6px;background:#FAFAFA;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:${muted};margin-bottom:10px;font-weight:700">Product &amp; Material Visuals</div>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            ${uniquePhotos
              .map(
                (url) =>
                  `<div style="border:1px solid ${border};border-radius:6px;overflow:hidden;background:#fff;padding:4px">
                    <img src="${esc(url)}" alt="Product Photo" style="width:140px;height:110px;object-fit:cover;border-radius:4px;display:block;" />
                  </div>`,
              )
              .join("")}
          </div>
        </div>`
      : "";

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(doc.title)} · ${esc(doc.number)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:${ink}; margin:0; background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; letter-spacing: -0.01em; }
  .sheet { max-width: 780px; margin: 0 auto; padding: 24px; }
  .toolbar { position: sticky; top:0; background:#f8fafc; border-bottom:1px solid ${border}; padding:8px 24px; display:flex; gap:8px; justify-content:flex-end; }
  .toolbar button { font-family: inherit; font-size:13px; font-weight:500; padding:6px 12px; border-radius:6px; border:1px solid ${border}; background:#fff; cursor:pointer; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding-bottom:16px; border-bottom:3px solid ${accent}; }
  .doc-title { font-size:24px; margin:0; color:${accent}; letter-spacing:-0.02em; font-weight:800; text-transform: uppercase; }
  .doc-sub { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:${muted}; margin-top:4px; }
  .brand-tagline { font-family: 'Caveat', cursive, 'Brush Script MT', sans-serif; font-size: 19px; font-weight: 700; color: ${accent}; margin-top: 3px; letter-spacing: 0.01em; line-height: 1.2; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:20px 0 16px; }
  table { width:100%; border-collapse:separate; border-spacing:0; margin-top:10px; font-size:12px; }
  thead th {
    background:${accent};
    color:#fff;
    font-size:10.5px;
    text-transform:uppercase;
    letter-spacing:.05em;
    font-weight:700;
    line-height:1.2;
    vertical-align:middle;
  }
  thead tr th:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
  thead tr th:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
  .totals { margin-top:20px; margin-left:auto; width:300px; }
  .notes { margin-top:16px; padding:12px 14px; background:#F8FAFC; border-left:3px solid ${accent}; font-size:12px; color:#334155; border-radius: 0 4px 4px 0; }
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
        <div class="brand-tagline">${esc(brand.tagline || "ever evolving!")}</div>
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
              <th style="width:34px;text-align:center;padding:9px 4px;">#</th>
              ${showPhoto ? `<th style="width:56px;text-align:center;padding:9px 4px;">Photo</th>` : ""}
              <th style="text-align:left;padding:9px 12px;">Description</th>
              ${showHsn ? `<th style="width:75px;text-align:center;padding:9px 6px;">HSN</th>` : ""}
              <th style="width:65px;text-align:right;padding:9px 10px;">Qty</th>
              <th style="width:60px;text-align:center;padding:9px 6px;">Unit</th>
              <th style="width:90px;text-align:right;padding:9px 10px;">Rate</th>
              <th style="width:110px;text-align:right;padding:9px 12px;">Amount</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : ""
    }

    ${totals ? `<div class="totals">${totals}</div>` : ""}

    ${galleryBlock}

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

  // Top Accent Bar
  pdf.setFillColor(15, 118, 110); // #0F766E
  pdf.rect(15, 12, 180, 2, "F");

  // Company Name & Tagline (Left)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(15, 118, 110);
  pdf.text(brand.company_name || "STONE TECH", 15, 23);

  if (brand.tagline) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(brand.tagline, 15, 28);
  }

  // Document Title & Number (Right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(15, 118, 110);
  pdf.text((doc.title || doc.kind || "DOCUMENT").toUpperCase(), 195, 22, { align: "right" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.number || "", 195, 27, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(doc.date || "", 195, 32, { align: "right" });

  // Divider
  let y = 35;
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

  // Items Table Header
  const lines = doc.lines ?? [];
  const hasHsnInLines = lines.some((l) => Boolean(l.hsn));

  pdf.setFillColor(15, 118, 110);
  pdf.roundedRect(15, y, 180, 7.5, 1, 1, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text("#", 18, y + 5, { align: "center" });
  pdf.text("Description", 24, y + 5);
  if (hasHsnInLines) {
    pdf.text("HSN", 110, y + 5, { align: "center" });
    pdf.text("Qty", 130, y + 5, { align: "right" });
    pdf.text("Unit", 142, y + 5, { align: "center" });
    pdf.text("Rate", 166, y + 5, { align: "right" });
    pdf.text("Amount", 192, y + 5, { align: "right" });
  } else {
    pdf.text("Qty", 125, y + 5, { align: "right" });
    pdf.text("Unit", 138, y + 5, { align: "center" });
    pdf.text("Rate", 166, y + 5, { align: "right" });
    pdf.text("Amount", 192, y + 5, { align: "right" });
  }

  y += 7.5;
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
  // Totals
  const totals = doc.totals ?? [];
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
    pdf.roundedRect(15, y, 115, 30, 1.5, 1.5, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("PAYMENT DETAILS", 18, y + 4.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    let bankY = y + 9;
    if (brand.bank_name) {
      pdf.text(
        `Bank: ${brand.bank_name}${brand.bank_branch ? ` (${brand.bank_branch})` : ""}`,
        18,
        bankY,
      );
      bankY += 3.8;
    }
    if (brand.bank_account_number) {
      pdf.text(`A/C No: ${brand.bank_account_number}`, 18, bankY);
      bankY += 3.8;
    }
    if (brand.bank_ifsc) {
      pdf.text(`IFSC: ${brand.bank_ifsc}`, 18, bankY);
      bankY += 3.8;
    }
    if (upiId) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(13, 148, 136); // teal-600
      pdf.text(`UPI ID: ${upiId}`, 18, bankY);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
    }

    try {
      pdf.addImage(STONE_TECH_UPI_QR_DATA_URL, "PNG", 92, y + 3, 23, 23);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("SCAN TO PAY (UPI)", 103.5, y + 28, { align: "center" });
    } catch {
      /* image add fallback */
    }
  }

  // Authorized Signatory
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`For ${brand.company_name}`, 195, y + 4.5, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(brand.authorized_signatory || "Authorized Signatory", 195, y + 20, { align: "right" });
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Authorized Signatory", 195, y + 24, { align: "right" });

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

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Remove buttons / toolbars that shouldn't appear in the PDF
    iframeDoc.querySelectorAll(".no-print, .toolbar").forEach((el) => el.remove());

    // Mark all images crossOrigin = anonymous to permit canvas extraction
    iframeDoc.querySelectorAll("img").forEach((img) => {
      img.crossOrigin = "anonymous";
    });

    const html2canvasModule = await import("html2canvas");
    const html2canvas = html2canvasModule.default ?? html2canvasModule;
    const JsPdf = await getJsPdfConstructor();

    const sheetEl = (iframeDoc.querySelector(".sheet") as HTMLElement) || iframeDoc.body;

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(sheetEl, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
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

    while (heightLeft > 0) {
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
