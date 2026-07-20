/**
 * use-table-prefs — per-table UI preferences (density, hidden columns)
 * persisted to localStorage.
 *
 * Keep the prefs tiny and forwards-compatible. Every list page passes a
 * stable `key` (e.g. "customers", "invoices") so users get consistent
 * behaviour across the app.
 */
import { useCallback, useEffect, useState } from "react";

export type Density = "comfortable" | "compact" | "dense";

export interface TablePrefs {
  density: Density;
  hidden: string[];
}

const DEFAULTS: TablePrefs = { density: "comfortable", hidden: [] };

function storageKey(key: string) {
  return `sto:table:${key}`;
}

function read(key: string): TablePrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<TablePrefs>;
    return {
      density: (parsed.density as Density) ?? DEFAULTS.density,
      hidden: Array.isArray(parsed.hidden)
        ? parsed.hidden.filter((x) => typeof x === "string")
        : [],
    };
  } catch {
    return DEFAULTS;
  }
}

export function useTablePrefs(key: string) {
  const [prefs, setPrefs] = useState<TablePrefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(read(key));
  }, [key]);

  const write = useCallback(
    (next: TablePrefs) => {
      setPrefs(next);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey(key), JSON.stringify(next));
        } catch {
          /* ignore quota */
        }
      }
    },
    [key],
  );

  const setDensity = useCallback(
    (density: Density) => write({ ...prefs, density }),
    [prefs, write],
  );

  const toggleColumn = useCallback(
    (column: string) => {
      const hidden = prefs.hidden.includes(column)
        ? prefs.hidden.filter((c) => c !== column)
        : [...prefs.hidden, column];
      write({ ...prefs, hidden });
    },
    [prefs, write],
  );

  const isHidden = useCallback((column: string) => prefs.hidden.includes(column), [prefs.hidden]);

  return { prefs, setDensity, toggleColumn, isHidden };
}

/** Tailwind cell padding by density — apply on `<td>` or `<div role="cell">`. */
export const DENSITY_CELL_CLASS: Record<Density, string> = {
  comfortable: "py-3",
  compact: "py-2",
  dense: "py-1.5",
};

export const DENSITY_HEAD_CLASS: Record<Density, string> = {
  comfortable: "h-10",
  compact: "h-9",
  dense: "h-8",
};
