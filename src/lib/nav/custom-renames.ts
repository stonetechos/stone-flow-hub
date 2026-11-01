import { useState, useEffect, useCallback } from "react";
import { upsertSiteSetting, fetchSiteSettings } from "@/lib/site-settings/api";

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

export function saveCustomRenames(renames: CustomNavRenames, syncRemote = true): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(RENAMES_KEY, JSON.stringify(renames));
    window.dispatchEvent(new Event("st:nav-renames-changed"));
    if (syncRemote) {
      upsertSiteSetting("sidebar_tab_renames", renames).catch((err) =>
        console.warn("[nav-renames] remote sync error:", err),
      );
    }
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
    // 1. Initial sync with remote site_settings if available
    fetchSiteSettings()
      .then((settings) => {
        if (settings.sidebar_tab_renames && Object.keys(settings.sidebar_tab_renames).length > 0) {
          const local = readCustomRenames();
          const merged = { ...local, ...settings.sidebar_tab_renames };
          saveCustomRenames(merged, false);
          setRenames(merged);
        }
      })
      .catch(() => {});

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
    saveCustomRenames(updated, true);
    setRenames(updated);
  }, []);

  const saveAll = useCallback((newRenames: CustomNavRenames) => {
    saveCustomRenames(newRenames, true);
    setRenames(newRenames);
  }, []);

  const resetAll = useCallback(() => {
    saveCustomRenames({}, true);
    setRenames({});
  }, []);

  const getLabel = useCallback(
    (id: string, fallback: string) => {
      return renames[id] || fallback;
    },
    [renames],
  );

  return { renames, rename, saveAll, resetAll, getLabel };
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
