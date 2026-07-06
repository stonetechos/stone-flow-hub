/**
 * Lightweight branded PDF generator. Renders a document into an offscreen
 * iframe and triggers the browser's print dialog — no external dependency,
 * consistent typography across quotation / SO / PO / invoice / packing / QC.
 *
 * For richer server-side PDF rendering, swap `printHtml` with a server fn
 * that uses `pdf-lib` or a headless renderer without changing callers.
 */
export type DocKind =
  | "quotation" | "sales_order" | "purchase_order" | "production_order"
  | "delivery_challan" | "dispatch_note" | "invoice" | "packing_list" | "qc_report";

export type PdfLine = { label: string; qty?: number | string; unit?: string; rate?: number | string; amount?: number | string };
export type PdfMeta = { label: string; value: string | number | null | undefined };

export type PdfDoc = {
  kind: DocKind;
  title: string;
  number: string;
  date: string;
  from: { name: string; address?: string; gstin?: string; email?: string; phone?: string };
  to: { name: string; address?: string; gstin?: string };
  meta?: PdfMeta[];
  lines?: PdfLine[];
  totals?: PdfMeta[];
  notes?: string;
  footer?: string;
};

const BRAND = "Stone Tech OS";
const ACCENT = "#0F766E"; // teal
const INK = "#0F172A";

export function renderDocHtml(doc: PdfDoc): string {
  const rows = (doc.lines ?? [])
    .map(
      (l, i) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(l.label)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${escapeHtml(String(l.qty ?? ""))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB">${escapeHtml(String(l.unit ?? ""))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${escapeHtml(String(l.rate ?? ""))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #E5E7EB;text-align:right">${escapeHtml(String(l.amount ?? ""))}</td>
      </tr>`,
    )
    .join("");

  const meta = (doc.meta ?? [])
    .map((m) => `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#64748B">${escapeHtml(m.label)}</span><span>${escapeHtml(String(m.value ?? "—"))}</span></div>`)
    .join("");

  const totals = (doc.totals ?? [])
    .map((t, i, arr) => `<div style="display:flex;justify-content:space-between;padding:4px 0;${i === arr.length - 1 ? "border-top:1px solid #CBD5E1;font-weight:600;color:" + INK : "color:#334155"}"><span>${escapeHtml(t.label)}</span><span>${escapeHtml(String(t.value ?? ""))}</span></div>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>${escapeHtml(doc.title)} · ${escapeHtml(doc.number)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color:${INK}; margin:0; }
  header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:2px solid ${ACCENT}; }
  h1 { font-size:20px; margin:0; color:${ACCENT}; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:16px 0; }
  .card { border:1px solid #E5E7EB; border-radius:8px; padding:12px; }
  .label { font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#64748B; }
  table { width:100%; border-collapse:collapse; margin-top:8px; font-size:12px; }
  thead th { text-align:left; padding:8px; background:#F1F5F9; font-size:11px; color:#334155; }
  tfoot td { padding:8px; }
  .notes { margin-top:16px; padding:12px; background:#F8FAFC; border-radius:8px; font-size:12px; color:#475569; }
  .footer { margin-top:24px; padding-top:12px; border-top:1px solid #E5E7EB; font-size:11px; color:#64748B; text-align:center; }
</style>
</head><body>
  <header>
    <div>
      <h1>${escapeHtml(doc.title)}</h1>
      <div class="label">${escapeHtml(BRAND)} · Architectural Stone ERP</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:15px;font-weight:600">${escapeHtml(doc.number)}</div>
      <div class="label">${escapeHtml(doc.date)}</div>
    </div>
  </header>

  <div class="grid">
    <div class="card">
      <div class="label">From</div>
      <div style="font-weight:600;margin-top:4px">${escapeHtml(doc.from.name)}</div>
      ${doc.from.address ? `<div style="font-size:12px;color:#475569;white-space:pre-line">${escapeHtml(doc.from.address)}</div>` : ""}
      ${doc.from.gstin ? `<div style="font-size:11px;color:#64748B;margin-top:4px">GSTIN: ${escapeHtml(doc.from.gstin)}</div>` : ""}
    </div>
    <div class="card">
      <div class="label">To</div>
      <div style="font-weight:600;margin-top:4px">${escapeHtml(doc.to.name)}</div>
      ${doc.to.address ? `<div style="font-size:12px;color:#475569;white-space:pre-line">${escapeHtml(doc.to.address)}</div>` : ""}
      ${doc.to.gstin ? `<div style="font-size:11px;color:#64748B;margin-top:4px">GSTIN: ${escapeHtml(doc.to.gstin)}</div>` : ""}
    </div>
  </div>

  ${meta ? `<div class="card" style="margin-bottom:16px">${meta}</div>` : ""}

  ${rows
    ? `<table>
        <thead><tr>
          <th style="width:32px">#</th>
          <th>Description</th>
          <th style="text-align:right;width:70px">Qty</th>
          <th style="width:60px">Unit</th>
          <th style="text-align:right;width:90px">Rate</th>
          <th style="text-align:right;width:100px">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    : ""}

  ${totals ? `<div style="margin-top:16px;margin-left:auto;width:280px">${totals}</div>` : ""}

  ${doc.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(doc.notes)}</div>` : ""}

  <div class="footer">${escapeHtml(doc.footer ?? `${BRAND} — This is a system-generated document.`)}</div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Renders `doc` and opens the browser print dialog (Save-as-PDF). */
export function printPdf(doc: PdfDoc) {
  const html = renderDocHtml(doc);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Give the browser a tick to render before printing.
  setTimeout(() => { try { w.focus(); w.print(); } catch { /* ignore */ } }, 300);
}
