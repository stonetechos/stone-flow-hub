/** Handlebars-style {{variable}} interpolation. Safe for HTML because we
 * escape angle brackets and quotes by default. Callers can opt out via
 * `interpolate(tpl, vars, { escape: false })` for WhatsApp/SMS.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function interpolate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
  opts: { escape?: boolean } = {},
): string {
  const escape = opts.escape ?? false;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const raw = vars[key];
    const s = raw == null ? "" : String(raw);
    return escape ? esc(s) : s;
  });
}

/** Collect placeholders used inside a template body. */
export function extractPlaceholders(template: string): string[] {
  const set = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    set.add(m[1]);
  }
  return Array.from(set).sort();
}
