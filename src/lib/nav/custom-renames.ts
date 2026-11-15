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
    const parsed = raw ? (JSON.parse(raw) as CustomNavRenames) : {};
    let hasChanges = false;
    const cleaned: CustomNavRenames = {};
    for (const [id, val] of Object.entries(parsed)) {
      // Auto-purge any accidental Indic system translations (e.g. Gujarati or Hindi)
      // that leaked into custom tab renames (e.g. "RFQ (દર પૂછપરછ)", "વેબસાઇટ લીડ્સ અને CRM")
      if (typeof val === "string" && /[\u0900-\u097F\u0A80-\u0AFF]/.test(val)) {
        hasChanges = true;
        continue;
      }
      cleaned[id] = val;
    }
    if (hasChanges) {
      window.localStorage.setItem(RENAMES_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
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
    // Never persist renames containing Indic characters
    const cleaned: CustomNavRenames = {};
    for (const [k, v] of Object.entries(renames)) {
      if (typeof v === "string" && !/[\u0900-\u097F\u0A80-\u0AFF]/.test(v)) {
        cleaned[k] = v;
      }
    }
    window.localStorage.setItem(RENAMES_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new Event("st:nav-renames-changed"));
    if (syncRemote) {
      if (immediateRemote) {
        void flushRemoteSync(cleaned);
      } else {
        scheduleRemoteSync(cleaned, 400);
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
    (id: string, fallback: string, defaultEnglishLabel?: string) => {
      const custom = renames[id];
      if (!custom) return fallback;

      const isIndicFallback = /[\u0900-\u097F\u0A80-\u0AFF]/.test(fallback);
      const isCustomIndic = /[\u0900-\u097F\u0A80-\u0AFF]/.test(custom);
      const isCustomPureAscii = /^[\x20-\x7E\s\-_.,/()&]+$/.test(custom);

      // If active language is Indic (Hindi/Gujarati) and custom rename is still pure English ASCII,
      // yield to the localized fallback so the language toggle takes effect across all tabs
      if (isIndicFallback && isCustomPureAscii) {
        return fallback;
      }

      // If active language is English and custom rename contains Indic (Hindi/Gujarati) characters,
      // yield to the English fallback so the English toggle never displays Gujarati or Hindi
      if (!isIndicFallback && isCustomIndic) {
        return defaultEnglishLabel || fallback;
      }

      if (
        defaultEnglishLabel &&
        custom.trim().toLowerCase() === defaultEnglishLabel.trim().toLowerCase()
      ) {
        return fallback;
      }
      return custom;
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
