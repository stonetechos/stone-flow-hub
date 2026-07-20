/**
 * Rolling baseline helpers used by predictors to compare a current value
 * against historical distributions. Pure numeric utilities, no I/O.
 */

/** Median (p50). Returns null when the input is empty. */
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Arbitrary percentile in [0..1]. Returns null when the input is empty. */
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

/** Trimmed mean: drops `trim` fraction from each tail (default 10%). */
export function trimmedMean(values: number[], trim = 0.1): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const drop = Math.floor(sorted.length * trim);
  const slice = sorted.slice(drop, sorted.length - drop);
  const src = slice.length ? slice : sorted;
  return src.reduce((a, b) => a + b, 0) / src.length;
}

/** Coefficient of variation (stdev / mean). Null when mean is 0 / empty. */
export function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return null;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

/** Simple linear slope (least squares) over evenly-spaced samples. */
export function slope(values: number[]): number | null {
  const n = values.length;
  if (n < 2) return null;
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** Days between two ISO/date-like inputs (positive if `to` > `from`). */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / 86_400_000);
}
