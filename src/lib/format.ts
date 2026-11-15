function getActiveLang(explicitLang?: string): string {
  if (explicitLang) return explicitLang;
  if (typeof window !== "undefined") {
    return localStorage.getItem("stos-lang") || "en";
  }
  return "en";
}

/** Small formatting helpers shared across the UI. */
export function formatInr(n: number | string | null | undefined, lang?: string): string {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  const rounded = Math.round(num);
  const formatted = "₹" + rounded.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const activeLang = getActiveLang(lang);
  return activeLang ? toIndicDigits(formatted, activeLang) : formatted;
}

/** Relative time — "3m ago", "2h ago", "5d ago" with Indic language support. */
export function formatRelative(iso: string | Date | null | undefined, lang?: string): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const t = d.getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const abs = Math.abs(diff);
  const s = Math.round(abs / 1000);
  const activeLang = getActiveLang(lang);
  const isHi = activeLang === "hi" || activeLang.startsWith("hi");
  const isGu = activeLang === "gu" || activeLang.startsWith("gu");

  if (s < 60) {
    if (isHi) return toIndicDigits(diff >= 0 ? `${s} सेकंड पहले` : `${s} सेकंड में`, activeLang);
    if (isGu) return toIndicDigits(diff >= 0 ? `${s} સેકન્ડ પહેલાં` : `${s} સેકન્ડમાં`, activeLang);
    return diff >= 0 ? `${s}s ago` : `in ${s}s`;
  }
  const m = Math.round(s / 60);
  if (m < 60) {
    if (isHi) return toIndicDigits(diff >= 0 ? `${m} मिनट पहले` : `${m} मिनट में`, activeLang);
    if (isGu) return toIndicDigits(diff >= 0 ? `${m} મિનિટ પહેલાં` : `${m} મિનિટમાં`, activeLang);
    return diff >= 0 ? `${m}m ago` : `in ${m}m`;
  }
  const h = Math.round(m / 60);
  if (h < 24) {
    if (isHi) return toIndicDigits(diff >= 0 ? `${h} घंटे पहले` : `${h} घंटे में`, activeLang);
    if (isGu) return toIndicDigits(diff >= 0 ? `${h} કલાક પહેલાં` : `${h} કલાકમાં`, activeLang);
    return diff >= 0 ? `${h}h ago` : `in ${h}h`;
  }
  const days = Math.round(h / 24);
  if (days < 30) {
    if (isHi) return toIndicDigits(diff >= 0 ? `${days} दिन पहले` : `${days} दिन में`, activeLang);
    if (isGu)
      return toIndicDigits(diff >= 0 ? `${days} દિવસ પહેલાં` : `${days} દિવસમાં`, activeLang);
    return diff >= 0 ? `${days}d ago` : `in ${days}d`;
  }
  return formatDate(d, activeLang);
}

export function formatDate(iso: string | Date | null | undefined, lang?: string): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (!Number.isFinite(d.getTime())) return "—";
  const activeLang = getActiveLang(lang);
  const res = d.toLocaleDateString();
  return activeLang ? toIndicDigits(res, activeLang) : res;
}

/** Business date formatting in Indian standard (e.g. "20 Oct 2026"). Avoids MM/DD vs DD/MM ambiguity. */
export function formatDisplayDate(iso: string | Date | null | undefined, lang?: string): string {
  if (!iso) return "—";
  const activeLang = getActiveLang(lang);
  let res = "";
  if (typeof iso === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const d = new Date(year, month, day);
      res = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  if (!res) {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (!Number.isFinite(d.getTime())) return typeof iso === "string" ? iso : "—";
    res = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return toIndicDigits(res, activeLang);
}

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const GUJARATI_DIGITS = ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"];

/** Converts English digits (0-9) to Devanagari (Hindi) or Gujarati digits based on the selected language. */
export function toIndicDigits(val: string | number | null | undefined, lang?: string): string {
  if (val == null) return "";
  const str = String(val);
  const activeLang = getActiveLang(lang);
  const isHi = activeLang === "hi" || activeLang.startsWith("hi");
  const isGu = activeLang === "gu" || activeLang.startsWith("gu");
  if (!isHi && !isGu) return str;

  const digits = isHi ? DEVANAGARI_DIGITS : GUJARATI_DIGITS;
  return str.replace(/\d/g, (d) => digits[Number(d)] ?? d);
}

/** Formats currency amounts in Indian compact notation (e.g. "20.7 L", "2.1 Cr", "86.4K") with full Hindi & Gujarati locale support. */
export function formatMoneyCompact(n: number, lang?: string): string {
  if (!n || n === 0) {
    return toIndicDigits("0", lang);
  }
  const isHi = lang === "hi" || lang?.startsWith("hi");
  const isGu = lang === "gu" || lang?.startsWith("gu");
  const cr = isHi ? " करोड़" : isGu ? " કરોડ" : " Cr";
  const lakh = isHi ? " लाख" : isGu ? " લાખ" : " L";
  const thousand = isHi ? " हज़ार" : isGu ? " હજાર" : "K";
  let formatted = "";
  if (n >= 1_00_00_000) {
    formatted = (n / 1_00_00_000).toFixed(1) + cr;
  } else if (n >= 1_00_000) {
    formatted = (n / 1_00_000).toFixed(1) + lakh;
  } else if (n >= 1_000) {
    formatted = (n / 1_000).toFixed(1) + thousand;
  } else {
    formatted = n.toLocaleString("en-IN");
  }

  return isHi || isGu ? toIndicDigits(formatted, lang) : formatted;
}
