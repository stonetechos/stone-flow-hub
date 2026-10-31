import { useState, useEffect, useCallback } from "react";

const RENAMES_KEY = "st.nav.customRenames";
const SIDEBAR_WIDTH_KEY = "st.sidebar.width";
export const DEFAULT_SIDEBAR_WIDTH = 270;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 480;

export interface CustomNavRenames {
  [id: string]: string; // item.id or group.id -> custom label
}

export function readCustomRenames(): CustomNavRenames {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(RENAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomRenames(renames: CustomNavRenames): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(RENAMES_KEY, JSON.stringify(renames));
    window.dispatchEvent(new Event("st:nav-renames-changed"));
  } catch {
    /* ignore */
  }
}

export function readSidebarWidth(): number {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_SIDEBAR_WIDTH;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = Number(raw);
    if (parsed && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) return parsed;
  } catch {
    /* ignore */
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

export function saveSidebarWidth(width: number): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(width)));
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
    window.dispatchEvent(new Event("st:sidebar-width-changed"));
  } catch {
    /* ignore */
  }
}

export function useCustomNavRenames() {
  const [renames, setRenames] = useState<CustomNavRenames>(readCustomRenames);

  useEffect(() => {
    const handler = () => setRenames(readCustomRenames());
    window.addEventListener("st:nav-renames-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("st:nav-renames-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const rename = useCallback((id: string, newName: string | null) => {
    const current = readCustomRenames();
    const updated = { ...current };
    if (!newName || !newName.trim()) {
      delete updated[id];
    } else {
      updated[id] = newName.trim();
    }
    saveCustomRenames(updated);
    setRenames(updated);
  }, []);

  const resetAll = useCallback(() => {
    saveCustomRenames({});
    setRenames({});
  }, []);

  const getLabel = useCallback(
    (id: string, fallback: string) => {
      return renames[id] || fallback;
    },
    [renames],
  );

  return { renames, rename, resetAll, getLabel };
}

export function useSidebarWidth() {
  const [width, setWidth] = useState<number>(readSidebarWidth);

  useEffect(() => {
    const handler = () => setWidth(readSidebarWidth());
    window.addEventListener("st:sidebar-width-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("st:sidebar-width-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const updateWidth = useCallback((newWidth: number) => {
    saveSidebarWidth(newWidth);
    setWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, Math.round(newWidth))));
  }, []);

  const resetWidth = useCallback(() => {
    updateWidth(DEFAULT_SIDEBAR_WIDTH);
  }, [updateWidth]);

  return { width, updateWidth, resetWidth };
}
