/**
 * Pure client-side pagination slice, extracted from the
 * identical inline `rows.slice((page - 1) * pageSize, page * pageSize)`
 * expression previously repeated by the Products, Installation Teams and
 * Message Templates list pages. Kept pure (no React) so it's directly
 * unit-testable under bun:test; the `useListPageState` hook composes it.
 */
export function pageSlice<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.max(1, Math.floor(pageSize) || 1);
  const start = (safePage - 1) * safeSize;
  return rows.slice(start, start + safeSize);
}
