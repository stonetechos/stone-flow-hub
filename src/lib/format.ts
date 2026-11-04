/** Small formatting helpers shared across the UI. */
export function formatInr(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  const rounded = Math.round(num);
  return "₹" + rounded.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** Relative time — "3m ago", "2h ago", "5d ago". */
export function formatRelative(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const t = d.getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const s = Math.round(abs / 1000);
  if (s < 60) return diff >= 0 ? `${s}s ago` : `in ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return diff >= 0 ? `${m}m ago` : `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return diff >= 0 ? `${h}h ago` : `in ${h}h`;
  const days = Math.round(h / 24);
  if (days < 30) return diff >= 0 ? `${days}d ago` : `in ${days}d`;
  return d.toLocaleDateString();
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString();
}

/** Business date formatting in Indian standard (e.g. "20 Oct 2026"). Avoids MM/DD vs DD/MM ambiguity. */
export function formatDisplayDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  if (typeof iso === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (!Number.isFinite(d.getTime())) return typeof iso === "string" ? iso : "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
