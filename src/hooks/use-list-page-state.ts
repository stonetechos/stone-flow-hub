/**
 * Shared list-page state for master/CRUD list screens.
 *
 * Before this sprint, Products, Installation Teams and Message Templates each
 * hand-rolled the identical bundle of state: a search box + debounce, page /
 * pageSize with "reset to page 1 when the search changes", the
 * `useTablePrefs` density/column wiring, and the pagination slice. This hook
 * is that bundle, extracted verbatim — it introduces no new behaviour, and
 * every option defaults to what the pages already did.
 *
 * MasterListPage (the config-driven attribute-master primitive) uses the
 * search + table-prefs portion of this hook too; it has no client-side
 * pagination (masters render up to 500 rows in one table), so the pagination
 * fields are simply unused there.
 *
 * Deliberately NOT included: query-key construction, data fetching, dialog
 * open/close state — those genuinely differ per page (deep links, custom
 * dialogs, upsert vs insert) and forcing them through a shared hook would
 * couple pages that have nothing in common beyond layout.
 */
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTablePrefs, type Density, type TablePrefs } from "@/hooks/use-table-prefs";
import { pageSlice } from "@/lib/lists/paginate";

export interface ListPageState {
  /** Raw search input value (bind to DataToolbar's `search`). */
  query: string;
  setQuery: (v: string) => void;
  /** Debounced search value (use in query keys / filtering). */
  debouncedQuery: string;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  /** Changes the page size AND resets to page 1 (the pattern every page used). */
  setPageSize: (s: number) => void;
  /** Slice `rows` down to the current page. */
  paginate: <T>(rows: readonly T[]) => T[];
  /** Ready-to-spread props for `<TablePagination />` given the total row count. */
  paginationProps: (total: number) => {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  // useTablePrefs passthrough
  prefs: TablePrefs;
  setDensity: (d: Density) => void;
  toggleColumn: (key: string) => void;
  isHidden: (key: string) => boolean;
}

export function useListPageState(
  prefsKey: string,
  opts?: {
    /** Search debounce in ms. Defaults to 250 (Products / Teams); Message
     * Templates and MasterListPage pass 200 to preserve their existing feel. */
    debounceMs?: number;
    initialPageSize?: number;
  },
): ListPageState {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, opts?.debounceMs ?? 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(opts?.initialPageSize ?? 25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs(prefsKey);

  // Reset to the first page whenever the (debounced) search term changes —
  // previously duplicated as `useEffect(() => setPage(1), [dq])` on each page.
  useEffect(() => setPage(1), [debouncedQuery]);

  const setPageSize = (s: number) => {
    setPageSizeRaw(s);
    setPage(1);
  };

  return {
    query,
    setQuery,
    debouncedQuery,
    page,
    pageSize,
    setPage,
    setPageSize,
    paginate: (rows) => pageSlice(rows, page, pageSize),
    paginationProps: (total) => ({
      page,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    }),
    prefs,
    setDensity,
    toggleColumn,
    isHidden,
  };
}
