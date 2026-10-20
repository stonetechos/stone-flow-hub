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
        <td style="padding:8px;border-bottom:1px solid ${border};color:${muted};font-size:11px;vertical-align:middle">${i + 1}</td>
        ${
          showPhoto
            ? `<td style="padding:6px;border-bottom:1px solid ${border};text-align:center;vertical-align:middle;width:56px">
                ${
                  l.image
                    ? `<img src="${esc(l.image)}" alt="${esc(l.label)}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid ${border};display:block;margin:0 auto;" />`
                    : `<span style="color:${muted}">—</span>`
                }
              </td>`
            : ""
        }
        <td style="padding:8px;border-bottom:1px solid ${border};vertical-align:middle">
          <div style="font-weight:600">${esc(l.label)}</div>
          ${l.notes ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;white-space:pre-wrap;line-height:1.35">${esc(l.notes)}</div>` : ""}
        </td>
        ${showHsn ? `<td style="padding:8px;border-bottom:1px solid ${border};font-family:monospace;font-size:11px;vertical-align:middle">${esc(l.hsn ?? "")}</td>` : ""}
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;vertical-align:middle">${esc(l.qty ?? "")}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};color:${muted};vertical-align:middle">${esc(l.unit ?? "")}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;vertical-align:middle">${esc(l.rate ?? "")}</td>
        <td style="padding:8px;border-bottom:1px solid ${border};text-align:right;font-variant-numeric:tabular-nums;vertical-align:middle">${esc(l.amount ?? "")}</td>
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
  const hasBankDetails =
    brand.bank_name || brand.bank_account_number || brand.bank_ifsc || brand.upi_id;
  const qrAmount = doc.balanceDue ?? 0;
  const qrString = brand.upi_id
    ? `upi://pay?pa=${brand.upi_id}&pn=${encodeURIComponent(brand.company_name)}&am=${qrAmount}&cu=INR`
    : "";
  const qrImg =
    qrString && qrAmount > 0
      ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrString)}" alt="UPI QR Code" crossorigin="anonymous" style="margin-top:8px;border-radius:4px;border:1px solid ${border}" />`
      : "";

  const bankBlock = hasBankDetails
    ? `<div style="flex:1;min-width:220px;border:1px solid ${border};border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:${muted};margin-bottom:6px">Payment Details</div>
          ${brand.bank_name ? `<div style="font-size:12px"><b>Bank:</b> ${esc(brand.bank_name)}</div>` : ""}
          ${brand.bank_branch ? `<div style="font-size:12px"><b>Branch:</b> ${esc(brand.bank_branch)}</div>` : ""}
          ${brand.bank_account_number ? `<div style="font-size:12px"><b>A/C No:</b> ${esc(brand.bank_account_number)}</div>` : ""}
          ${brand.bank_ifsc ? `<div style="font-size:12px"><b>IFSC:</b> ${esc(brand.bank_ifsc)}</div>` : ""}
          ${brand.upi_id ? `<div style="font-size:12px"><b>UPI:</b> ${esc(brand.upi_id)}</div>` : ""}
        </div>
        ${
          qrImg
            ? `<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end">
            <div style="font-size:10px;color:${muted};margin-bottom:4px;font-weight:600">Scan to pay ${doc.balanceDue ? "₹" + doc.balanceDue : ""}</div>
            ${qrImg}
        </div>`
            : ""
        }
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
  table { width:100%; border-collapse:collapse; margin-top:8px; font-size:12px; }
  thead th { text-align:left; padding:8px 10px; background:${accent}; color:#fff; font-size:11px; text-transform:uppercase; letter-spacing:.06em; font-weight:700; }
  thead th:last-child, thead th.right { text-align:right; }
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
              <th style="width:28px">#</th>
              ${showPhoto ? `<th style="width:56px;text-align:center">Photo</th>` : ""}
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
  const JsPdf = await getJsPdfConstructor();
  const pdf = new JsPdf("p", "mm", "a4");

  // Document Title & Accent Bar
  pdf.setFillColor(15, 118, 110); // #0F766E
  pdf.rect(15, 12, 180, 2, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(15, 118, 110);
  pdf.text((doc.title || doc.kind || "DOCUMENT").toUpperCase(), 15, 22);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.number || "", 195, 20, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(doc.date || "", 195, 25, { align: "right" });

  // Divider
  let y = 32;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(15, y, 195, y);

  // Parties (From / To)
  y = 38;
  if (doc.from) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("FROM", 15, y);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(doc.from.name || "", 15, y + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    let fromY = y + 9;
    if (doc.from.address) {
      const addrLines = pdf.splitTextToSize(doc.from.address, 80);
      pdf.text(addrLines, 15, fromY);
      fromY += addrLines.length * 4;
    }
    if (doc.from.gstin) {
      pdf.text(`GSTIN: ${doc.from.gstin}`, 15, fromY);
      fromY += 4;
    }
    if (doc.from.phone) {
      pdf.text(`Phone: ${doc.from.phone}`, 15, fromY);
    }
  }

  if (doc.to) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("BILL TO", 110, y);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(doc.to.name || "", 110, y + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    let toY = y + 9;
    if (doc.to.address) {
      const addrLines = pdf.splitTextToSize(doc.to.address, 80);
      pdf.text(addrLines, 110, toY);
      toY += addrLines.length * 4;
    }
    if (doc.to.gstin) {
      pdf.text(`GSTIN: ${doc.to.gstin}`, 110, toY);
      toY += 4;
    }
    if (doc.to.phone) {
      pdf.text(`Phone: ${doc.to.phone}`, 110, toY);
    }
  }

  y = 65;

  // Metadata items if any
  if (doc.meta && doc.meta.length > 0) {
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(15, y, 180, 12, 1.5, 1.5, "FD");
    let metaX = 20;
    pdf.setFontSize(8);
    for (const m of doc.meta.slice(0, 4)) {
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${m.label}:`, metaX, y + 7);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(m.value ?? "—"), metaX + 22, y + 7);
      metaX += 42;
    }
    y += 16;
  }

  // Items Table Header
  pdf.setFillColor(15, 118, 110);
  pdf.rect(15, y, 180, 7.5, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text("#", 18, y + 5);
  pdf.text("Description", 26, y + 5);
  pdf.text("Qty", 125, y + 5, { align: "right" });
  pdf.text("Unit", 131, y + 5);
  pdf.text("Rate", 160, y + 5, { align: "right" });
  pdf.text("Amount", 190, y + 5, { align: "right" });

  y += 7.5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);

  const lines = doc.lines ?? [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (y > 265) {
      pdf.addPage();
      y = 20;
    }
    y += 6;
    pdf.text(String(i + 1), 18, y);
    pdf.text(l.label ? l.label.slice(0, 45) : "—", 26, y);
    pdf.text(String(l.qty ?? ""), 125, y, { align: "right" });
    pdf.text(String(l.unit ?? ""), 131, y);
    pdf.text(String(l.rate ?? ""), 160, y, { align: "right" });
    pdf.text(String(l.amount ?? ""), 190, y, { align: "right" });

    if (l.notes) {
      y += 4;
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(l.notes.slice(0, 70), 26, y);
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
    if (y > 275) {
      pdf.addPage();
      y = 20;
    }
    const isLast = i === totals.length - 1;
    pdf.setFont("helvetica", isLast ? "bold" : "normal");
    pdf.setFontSize(isLast ? 10 : 8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${t.label}:`, 150, y, { align: "right" });
    pdf.text(String(t.value ?? ""), 190, y, { align: "right" });
    y += isLast ? 7 : 5;
  }

  // Footer / Terms
  if (doc.terms || doc.notes) {
    if (y > 255) {
      pdf.addPage();
      y = 20;
    }
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("TERMS & NOTES", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    const textContent = [doc.notes, doc.terms].filter(Boolean).join("\n");
    const termLines = pdf.splitTextToSize(textContent, 175);
    pdf.text(termLines.slice(0, 10), 15, y + 4);
  }

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

  // Create temporary offscreen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // Standard A4 width at 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.innerHTML = html;
  document.body.appendChild(container);

  // Remove buttons / toolbars that shouldn't appear in the PDF
  container.querySelectorAll(".no-print, .toolbar").forEach((el) => el.remove());

  // Mark all images crossOrigin = anonymous to permit canvas extraction
  container.querySelectorAll("img").forEach((img) => {
    img.crossOrigin = "anonymous";
  });

  try {
    const html2canvasModule = await import("html2canvas");
    const html2canvas = html2canvasModule.default ?? html2canvasModule;
    const JsPdf = await getJsPdfConstructor();

    const sheetEl = (container.querySelector(".sheet") as HTMLElement) || container;

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
    if (container.parentNode) {
      container.parentNode.removeChild(container);
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
