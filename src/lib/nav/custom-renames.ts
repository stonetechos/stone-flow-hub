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

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRemoteSync(renames: CustomNavRenames, delay = 400) {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    upsertSiteSetting("sidebar_tab_renames", renames).catch((err) =>
      console.warn("[nav-renames] remote sync error:", err),
    );
  }, delay);
}

export function flushRemoteSync(renames: CustomNavRenames) {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  return upsertSiteSetting("sidebar_tab_renames", renames).catch((err) =>
    console.warn("[nav-renames] remote sync error:", err),
  );
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

export function saveCustomRenames(
  renames: CustomNavRenames,
  syncRemote = true,
  immediateRemote = false,
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(RENAMES_KEY, JSON.stringify(renames));
    window.dispatchEvent(new Event("st:nav-renames-changed"));
    if (syncRemote) {
      if (immediateRemote) {
        void flushRemoteSync(renames);
      } else {
        scheduleRemoteSync(renames, 400);
      }
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
    let isMounted = true;
    // 1. Initial sync with remote site_settings if available
    fetchSiteSettings()
      .then((settings) => {
        if (!isMounted) return;
        if (settings.sidebar_tab_renames && Object.keys(settings.sidebar_tab_renames).length > 0) {
          const local = readCustomRenames();
          // Local edits take precedence over remote settings so local progress is preserved
          const merged = { ...settings.sidebar_tab_renames, ...local };
          saveCustomRenames(merged, false);
          setRenames(merged);
        }
      })
      .catch(() => {});

    const handler = () => setRenames(readCustomRenames());
    window.addEventListener("st:nav-renames-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      isMounted = false;
      window.removeEventListener("st:nav-renames-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const rename = useCallback((id: string, newName: string | null) => {
    const current = readCustomRenames();
    const updated = { ...current };
    if (newName === null || newName === undefined) {
      delete updated[id];
    } else {
      // Avoid leading whitespace only, preserve spaces while typing
      const trimmedStart = newName.replace(/^\s+/, "");
      if (!trimmedStart) {
        delete updated[id];
      } else {
        updated[id] = trimmedStart;
      }
    }
    saveCustomRenames(updated, true, false);
    setRenames(updated);
  }, []);

  const saveAll = useCallback((newRenames: CustomNavRenames) => {
    const cleaned: CustomNavRenames = {};
    for (const [k, v] of Object.entries(newRenames)) {
      const trimmed = (v || "").trim();
      if (trimmed) {
        cleaned[k] = trimmed;
      }
    }
    saveCustomRenames(cleaned, true, true);
    setRenames(cleaned);
  }, []);

  const resetAll = useCallback(() => {
    saveCustomRenames({}, true, true);
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
