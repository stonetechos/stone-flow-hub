/**
 * product-prices.ts
 *
 * Dedicated state management and storage for Wall Cladding & Mosaic Catalogue prices.
 * Enables Super Admins to write, attach, and customize prices, MRPs, badges, lead times,
 * and notes directly on the image/card with persistent browser storage and real-time updates.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { upsertSiteSetting, fetchSiteSettings } from "@/lib/site-settings/api";

export interface AttachedProductPrice {
  price: number;
  currency: string; // e.g. "₹", "$", "€", "AED"
  unit: string; // e.g. "sq.ft", "sq.m", "tile", "box", "module"
  mrp?: number; // Optional strike-through MRP
  badge?: string; // Optional tag: "Quarry Direct", "Architect Exclusive", "CNC Sculpted", etc.
  leadTime?: string; // e.g. "In Stock - Ready to Ship", "Made to Order (7-10 Days)"
  notes?: string; // e.g. "Ex-factory Makrana, crating included"
  showOnPdf?: boolean; // Whether to print this price in WhatsApp PDF softcopy (default: true)
  isCustom?: boolean; // Whether overridden by super admin
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_KEY = "st.catalog.wallCladdingPrices";
const EVENT_NAME = "st:catalog-prices-changed";

/**
 * Calculates standard benchmark factory pricing based on category and stone geology.
 */
export function getBenchmarkPrice(
  category: string,
  stoneType: string,
  index: number,
): AttachedProductPrice {
  let basePrice = 450;
  const mrpMultiplier = 1.25;
  let badge = "Quarry Direct";

  const catLower = category.toLowerCase();
  const stoneLower = stoneType.toLowerCase();

  if (catLower.includes("inlay") || catLower.includes("geometric")) {
    basePrice = 1250;
    badge = "Brass & Semi-Precious Inlay";
  } else if (catLower.includes("3d") || catLower.includes("relief")) {
    basePrice = 680;
    badge = "CNC Sculpted Relief";
  } else if (catLower.includes("fluted") || catLower.includes("ribbed")) {
    basePrice = 540;
    badge = "Precision Linear Ribbed";
  } else if (catLower.includes("woven") || catLower.includes("basketweave")) {
    basePrice = 620;
    badge = "Hand-Crafted Parquet";
  } else if (catLower.includes("mosaic") || catLower.includes("pebble")) {
    basePrice = 590;
    badge = "Mesh-Mounted Mosaic";
  } else if (
    catLower.includes("interlock") ||
    catLower.includes("z-panel") ||
    catLower.includes("finger") ||
    catLower.includes("strip") ||
    catLower.includes("ledger")
  ) {
    basePrice = 520;
    badge = "Interlocking Ledger Panel";
  } else if (catLower.includes("ashlar")) {
    basePrice = 480;
    badge = "Coursed Ashlar Masonry";
  } else {
    // Linear Ledger / Split face
    basePrice = 420;
    badge = "Natural Split Cleft";
  }

  // Stone type geology adjustments
  if (stoneLower.includes("marble")) {
    basePrice += 120;
  } else if (stoneLower.includes("quartzite")) {
    basePrice += 80;
  } else if (stoneLower.includes("basalt")) {
    basePrice += 150;
  } else if (stoneLower.includes("travertine")) {
    basePrice += 180;
  } else if (stoneLower.includes("granite")) {
    basePrice += 60;
  }

  // Slight deterministic variance per pattern index
  const jitter = ((index * 37) % 9) * 10 - 40; // -40 to +40
  const finalPrice = Math.max(320, basePrice + jitter);
  const mrp = Math.round((finalPrice * mrpMultiplier) / 10) * 10;

  return {
    price: finalPrice,
    currency: "₹",
    unit: "sq.ft",
    mrp,
    badge,
    leadTime: "In Stock - Ready to Ship",
    notes: "Ex-factory Makrana, crating included. Freight & GST extra.",
    showOnPdf: true,
    isCustom: false,
  };
}

/**
 * Reads all stored custom prices from localStorage.
 */
export function readCustomPrices(): Record<string, AttachedProductPrice> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves full dictionary of custom prices and broadcasts change event.
 */
export function saveAllCustomPrices(
  data: Record<string, AttachedProductPrice>,
  syncRemote = true,
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(EVENT_NAME));
    if (syncRemote) {
      upsertSiteSetting("website_catalog_prices", data).catch((e) =>
        console.warn("[product-prices] remote sync error:", e),
      );
    }
  } catch (e) {
    console.error("Failed to persist catalog prices:", e);
  }
}

export const saveCustomPrices = saveAllCustomPrices;

/**
 * React hook to read, write, and reactively listen to catalog price updates.
 */
export function useAttachedProductPrices() {
  const [customPrices, setCustomPrices] =
    useState<Record<string, AttachedProductPrice>>(readCustomPrices);

  useEffect(() => {
    fetchSiteSettings()
      .then((settings) => {
        if (
          settings.website_catalog_prices &&
          typeof settings.website_catalog_prices === "object" &&
          Object.keys(settings.website_catalog_prices).length > 0
        ) {
          const local = readCustomPrices();
          const remotePrices = settings.website_catalog_prices as unknown as Record<
            string,
            AttachedProductPrice
          >;
          const merged: Record<string, AttachedProductPrice> = {
            ...local,
            ...remotePrices,
          };
          saveCustomPrices(merged, false);
          setCustomPrices(merged);
        }
      })
      .catch(() => {});

    const handler = () => {
      setCustomPrices(readCustomPrices());
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const getPrice = useCallback(
    (id: string, category: string, stoneType: string, index: number): AttachedProductPrice => {
      if (customPrices[id]) {
        return {
          ...getBenchmarkPrice(category, stoneType, index),
          ...customPrices[id],
          isCustom: true,
        };
      }
      return getBenchmarkPrice(category, stoneType, index);
    },
    [customPrices],
  );

  const updatePrice = useCallback(
    (id: string, priceData: Partial<AttachedProductPrice>, userEmail = "super_admin") => {
      const all = readCustomPrices();
      const current = all[id] || {};
      const updated: AttachedProductPrice = Object.assign(
        {
          price: 450,
          currency: "₹",
          unit: "sq.ft",
          showOnPdf: true,
        },
        current,
        priceData,
        {
          isCustom: true,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail,
        },
      );

      all[id] = updated;
      saveAllCustomPrices(all);
      setCustomPrices({ ...all });
    },
    [],
  );

  const resetPrice = useCallback((id: string) => {
    const all = readCustomPrices();
    delete all[id];
    saveAllCustomPrices(all);
    setCustomPrices({ ...all });
  }, []);

  const resetAllPrices = useCallback(() => {
    saveAllCustomPrices({});
    setCustomPrices({});
  }, []);

  const batchAdjust = useCallback((percent: number) => {
    const factor = 1 + percent / 100;
    const all = readCustomPrices();
    const updated: Record<string, AttachedProductPrice> = {};

    for (const [id, item] of Object.entries(all)) {
      updated[id] = {
        ...item,
        price: Math.round(item.price * factor),
        mrp: item.mrp ? Math.round(item.mrp * factor) : undefined,
        updatedAt: new Date().toISOString(),
      };
    }
    saveAllCustomPrices(updated);
    setCustomPrices(updated);
  }, []);

  const exportJson = useCallback((): string => {
    return JSON.stringify(customPrices, null, 2);
  }, [customPrices]);

  const importJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === "object" && parsed !== null) {
        saveAllCustomPrices(parsed);
        setCustomPrices(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    customPrices,
    getPrice,
    updatePrice,
    resetPrice,
    resetAllPrices,
    batchAdjust,
    exportJson,
    importJson,
  };
}
