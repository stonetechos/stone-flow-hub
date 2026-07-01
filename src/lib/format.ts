/** Small formatting helpers shared across the UI. */
export function formatInr(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
