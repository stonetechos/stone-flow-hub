/**
 * Minimal CSV parser / writer used by the bulk-import dialog and reports
 * downloads. Handles quoted fields, escaped quotes, and CRLF line endings.
 * No external dependency to keep the client bundle lean.
 */
export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const src = text.replace(/^\uFEFF/, ""); // strip BOM
  const out: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); out.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* ignore */ }
      else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); out.push(row); }
  const [headerRow, ...dataRows] = out.filter((r) => r.some((c) => c.trim() !== ""));
  const headers = (headerRow ?? []).map((h) => h.trim());
  const rows: CsvRow[] = dataRows.map((r) => {
    const rec: CsvRow = {};
    headers.forEach((h, idx) => { rec[h] = (r[idx] ?? "").trim(); });
    return rec;
  });
  return { headers, rows };
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map(esc).join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
