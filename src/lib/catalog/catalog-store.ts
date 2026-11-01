/**
 * catalog-store.ts
 *
 * Centralized store for Stone Tech's Website Product Catalogue & Pricing.
 * Synchronizes website catalog items and attached prices between:
 *  1. Public visitor display (Landing page & softcopy PDF)
 *  2. Central ERP Database (products & site_settings tables)
 *  3. Quotes, Estimates, Sales Orders & Inventory across the entire software
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import rawCatalogData from "@/data/wall-cladding-catalog.json";
import {
  type AttachedProductPrice,
  getBenchmarkPrice,
  readCustomPrices,
  saveCustomPrices,
} from "./product-prices";
import { fetchSiteSettings, upsertSiteSetting } from "@/lib/site-settings/api";
import { syncWebsiteProductToErpServerFn } from "@/lib/products/products.functions";

export const OFFICIAL_PRODUCT_CATEGORIES = [
  "Stone Wall Cladding",
  "Stone Wall Mural Artwork",
  "Artwork",
  "Stone Inlay",
  "Stone Article",
  "Ladscaping Product",
  "PU Panels",
  "Stone Veneer",
] as const;

export type OfficialProductCategory = (typeof OFFICIAL_PRODUCT_CATEGORIES)[number];

export interface CatalogProduct {
  id: string; // ST-WC-001, etc.
  index: number;
  name: string;
  slug: string;
  image: string;
  category: string;
  stoneType: string;
  standardSizes: string;
  thickness: string;
  applications: string[];
  finishes: string[];
  price?: number;
  currency?: string;
  unit?: string;
  mrp?: number;
  badge?: string;
  leadTime?: string;
  notes?: string;
  isActive?: boolean;
  isCustomUploaded?: boolean;
}

const ITEMS_STORAGE_KEY = "st.catalog.customItems";
const ORDER_STORAGE_KEY = "st.catalog.order";
export const ITEMS_EVENT_NAME = "st:catalog-items-changed";
export const ORDER_EVENT_NAME = "st:catalog-order-changed";

export function readCatalogOrder(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCatalogOrder(order: string[], syncRemote = true): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    window.dispatchEvent(new Event(ORDER_EVENT_NAME));
    if (syncRemote) {
      upsertSiteSetting("website_catalog_order", order).catch((e) =>
        console.warn("[catalog-store] remote order sync error:", e),
      );
    }
  } catch {
    /* ignore */
  }
}

export function readCustomCatalogItems(): CatalogProduct[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ITEMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomCatalogItems(items: CatalogProduct[], syncRemote = true): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(ITEMS_EVENT_NAME));
    if (syncRemote) {
      upsertSiteSetting("website_catalog_items", items).catch((e) =>
        console.warn("[catalog-store] remote items sync error:", e),
      );
    }
  } catch {
    /* ignore */
  }
}

export function useWebsiteCatalog() {
  const [customItems, setCustomItems] = useState<CatalogProduct[]>(readCustomCatalogItems);
  const [customPrices, setCustomPrices] =
    useState<Record<string, AttachedProductPrice>>(readCustomPrices);
  const [customOrder, setCustomOrder] = useState<string[]>(readCatalogOrder);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial load & remote sync with site_settings
  useEffect(() => {
    fetchSiteSettings()
      .then((settings) => {
        if (
          settings.website_catalog_items &&
          Array.isArray(settings.website_catalog_items) &&
          settings.website_catalog_items.length > 0
        ) {
          saveCustomCatalogItems(
            settings.website_catalog_items as unknown as CatalogProduct[],
            false,
          );
          setCustomItems(settings.website_catalog_items as unknown as CatalogProduct[]);
        }
        if (
          settings.website_catalog_prices &&
          typeof settings.website_catalog_prices === "object"
        ) {
          saveCustomPrices(
            settings.website_catalog_prices as unknown as Record<string, AttachedProductPrice>,
            false,
          );
          setCustomPrices(
            settings.website_catalog_prices as unknown as Record<string, AttachedProductPrice>,
          );
        }
        if (
          settings.website_catalog_order &&
          Array.isArray(settings.website_catalog_order) &&
          settings.website_catalog_order.length > 0
        ) {
          saveCatalogOrder(settings.website_catalog_order as string[], false);
          setCustomOrder(settings.website_catalog_order as string[]);
        }
      })
      .catch(() => {});

    const onItemsChanged = () => setCustomItems(readCustomCatalogItems());
    const onPricesChanged = () => setCustomPrices(readCustomPrices());
    const onOrderChanged = () => setCustomOrder(readCatalogOrder());

    window.addEventListener(ITEMS_EVENT_NAME, onItemsChanged);
    window.addEventListener("st:catalog-prices-changed", onPricesChanged);
    window.addEventListener(ORDER_EVENT_NAME, onOrderChanged);
    window.addEventListener("storage", onItemsChanged);
    window.addEventListener("storage", onOrderChanged);

    return () => {
      window.removeEventListener(ITEMS_EVENT_NAME, onItemsChanged);
      window.removeEventListener("st:catalog-prices-changed", onPricesChanged);
      window.removeEventListener(ORDER_EVENT_NAME, onOrderChanged);
      window.removeEventListener("storage", onItemsChanged);
      window.removeEventListener("storage", onOrderChanged);
    };
  }, []);

  // Merge default 150 items with any custom items/modifications and apply custom sequence/drag order
  const allProducts = useMemo<CatalogProduct[]>(() => {
    const defaultList = rawCatalogData as CatalogProduct[];
    const map = new Map<string, CatalogProduct>();

    // 1. Add base catalog items
    for (const item of defaultList) {
      map.set(item.id, { ...item, isActive: true });
    }

    // 2. Overlay / add custom items from backend
    for (const custom of customItems) {
      map.set(custom.id, { ...(map.get(custom.id) || {}), ...custom });
    }

    const items = Array.from(map.values());

    // If a custom drag-and-drop order is set, sort accordingly
    if (customOrder && customOrder.length > 0) {
      const orderMap = new Map<string, number>();
      customOrder.forEach((id, idx) => orderMap.set(id, idx));

      return items.sort((a, b) => {
        const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 10000 + (a.index || 999);
        const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 10000 + (b.index || 999);
        return orderA - orderB;
      });
    }

    return items.sort((a, b) => (a.index || 999) - (b.index || 999));
  }, [customItems, customOrder]);

  // Extract all categories dynamically prioritizing official category set
  const categories = useMemo(() => {
    const list: string[] = [...OFFICIAL_PRODUCT_CATEGORIES];
    for (const p of allProducts) {
      if (p.category && p.category.trim() && !list.includes(p.category.trim())) {
        list.push(p.category.trim());
      }
    }
    return list;
  }, [allProducts]);

  // Helper to get active attached price
  const getProductPrice = useCallback(
    (product: CatalogProduct): AttachedProductPrice => {
      if (customPrices[product.id]) {
        return customPrices[product.id];
      }
      return getBenchmarkPrice(product.category, product.stoneType, product.index || 1);
    },
    [customPrices],
  );

  // Update a product's name, price, or details with software-wide propagation
  const updateProduct = useCallback(
    async (
      id: string,
      updates: Partial<CatalogProduct> & {
        price?: number;
        unit?: string;
        mrp?: number;
        badge?: string;
      },
    ) => {
      setIsSyncing(true);
      try {
        // 1. Update items list
        const currentItems = readCustomCatalogItems();
        const baseItem = allProducts.find((p) => p.id === id);
        if (!baseItem) throw new Error(`Product ${id} not found`);

        const mergedItem: CatalogProduct = {
          ...baseItem,
          ...updates,
          id,
        };

        const existingIdx = currentItems.findIndex((x) => x.id === id);
        let updatedItems: CatalogProduct[];
        if (existingIdx >= 0) {
          updatedItems = [...currentItems];
          updatedItems[existingIdx] = mergedItem;
        } else {
          updatedItems = [...currentItems, mergedItem];
        }

        saveCustomCatalogItems(updatedItems, true);
        setCustomItems(updatedItems);

        // 2. If price was passed, update price registry
        if (typeof updates.price === "number") {
          const currentPrices = readCustomPrices();
          const basePrice = getProductPrice(baseItem);
          const newPriceObj: AttachedProductPrice = {
            ...basePrice,
            price: updates.price,
            unit: updates.unit || basePrice.unit,
            mrp: updates.mrp !== undefined ? updates.mrp : basePrice.mrp,
            badge: updates.badge || basePrice.badge,
            isCustom: true,
            updatedAt: new Date().toISOString(),
          };
          const nextPrices = { ...currentPrices, [id]: newPriceObj };
          saveCustomPrices(nextPrices, true);
          setCustomPrices(nextPrices);
        }

        // 3. Central software sync: Push update to Supabase products table
        const finalPrice =
          typeof updates.price === "number" ? updates.price : getProductPrice(mergedItem).price;
        await syncWebsiteProductToErpServerFn({
          data: {
            id: mergedItem.id,
            name: mergedItem.name,
            price: finalPrice,
            unit: updates.unit || getProductPrice(mergedItem).unit,
            mrp: updates.mrp || getProductPrice(mergedItem).mrp,
            category: mergedItem.category,
            stoneType: mergedItem.stoneType,
            description: `${mergedItem.name} — ${mergedItem.stoneType} (${mergedItem.category})`,
            thickness: mergedItem.thickness,
            image: mergedItem.image,
          },
        });

        // 4. Update site_settings for landing page
        await upsertSiteSetting("website_catalog_items", updatedItems);

        return { success: true };
      } finally {
        setIsSyncing(false);
      }
    },
    [allProducts, getProductPrice],
  );

  // Add a newly uploaded product
  const addProduct = useCallback(
    async (
      newProd: Omit<CatalogProduct, "id" | "index"> & {
        price: number;
        unit?: string;
        mrp?: number;
      },
    ) => {
      setIsSyncing(true);
      try {
        const nextIndex =
          allProducts.length > 0 ? Math.max(...allProducts.map((p) => p.index || 0)) + 1 : 1;
        const id = `ST-PRD-${String(nextIndex).padStart(3, "0")}`;

        const created: CatalogProduct = {
          ...newProd,
          id,
          index: nextIndex,
          slug: newProd.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          applications: newProd.applications?.length
            ? newProd.applications
            : ["Wall Cladding", "Interior Feature Wall", "Exterior Elevation"],
          finishes: newProd.finishes?.length ? newProd.finishes : ["Natural Cleft", "Honed"],
          isActive: true,
          isCustomUploaded: true,
        };

        const currentItems = readCustomCatalogItems();
        const updatedItems = [...currentItems, created];
        saveCustomCatalogItems(updatedItems, true);
        setCustomItems(updatedItems);

        // Save price
        const currentPrices = readCustomPrices();
        const priceObj: AttachedProductPrice = {
          price: newProd.price,
          currency: "₹",
          unit: newProd.unit || "sq.ft",
          mrp: newProd.mrp || Math.round(newProd.price * 1.25),
          badge: newProd.badge || "New Launch",
          leadTime: newProd.leadTime || "Ready to Ship",
          notes: newProd.notes || "Ex-factory Makrana, crating included.",
          showOnPdf: true,
          isCustom: true,
          updatedAt: new Date().toISOString(),
        };
        const nextPrices = { ...currentPrices, [id]: priceObj };
        saveCustomPrices(nextPrices, true);
        setCustomPrices(nextPrices);

        // Sync with ERP products table
        await syncWebsiteProductToErpServerFn({
          data: {
            id,
            name: created.name,
            price: newProd.price,
            unit: priceObj.unit,
            mrp: priceObj.mrp,
            category: created.category,
            stoneType: created.stoneType,
            description: `${created.name} — ${created.stoneType}`,
            thickness: created.thickness,
            image: created.image,
          },
        });

        await upsertSiteSetting("website_catalog_items", updatedItems);

        return created;
      } finally {
        setIsSyncing(false);
      }
    },
    [allProducts],
  );

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    const current = readCustomCatalogItems();
    const updated = current.filter((x) => x.id !== id);
    saveCustomCatalogItems(updated, true);
    setCustomItems(updated);
    await upsertSiteSetting("website_catalog_items", updated);
  }, []);

  // Reorder product sequence (drag & drop reordering)
  const reorderProducts = useCallback(
    async (sourceId: string, targetId: string) => {
      const currentList = [...allProducts];
      const sourceIndex = currentList.findIndex((p) => p.id === sourceId);
      const targetIndex = currentList.findIndex((p) => p.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return;
      }

      // Remove source item and insert at target position
      const [movedItem] = currentList.splice(sourceIndex, 1);
      currentList.splice(targetIndex, 0, movedItem);

      // New ordered ID sequence
      const newOrderIds = currentList.map((p) => p.id);

      saveCatalogOrder(newOrderIds, true);
      setCustomOrder(newOrderIds);
    },
    [allProducts],
  );

  // Reset order to factory benchmark sequence
  const resetOrder = useCallback(async () => {
    saveCatalogOrder([], true);
    setCustomOrder([]);
  }, []);

  return {
    products: allProducts,
    categories,
    isSyncing,
    getProductPrice,
    updateProduct,
    addProduct,
    deleteProduct,
    reorderProducts,
    resetOrder,
  };
}

/**
 * Returns all active website products merged with live custom overrides and pricing.
 * Can be called synchronously anywhere across quotes, calculators, and line items.
 */
export function getActiveWebsiteProducts(): (CatalogProduct & {
  activePrice: AttachedProductPrice;
})[] {
  const customItems = readCustomCatalogItems();
  const customPrices = readCustomPrices();
  const customOrder = readCatalogOrder();
  const defaultList = rawCatalogData as CatalogProduct[];
  const map = new Map<string, CatalogProduct>();

  for (const item of defaultList) {
    map.set(item.id, { ...item, isActive: true });
  }

  for (const custom of customItems) {
    map.set(custom.id, { ...(map.get(custom.id) || {}), ...custom });
  }

  const items = Array.from(map.values()).filter((p) => p.isActive !== false);

  if (customOrder && customOrder.length > 0) {
    const orderMap = new Map<string, number>();
    customOrder.forEach((id, idx) => orderMap.set(id, idx));

    items.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : 10000 + (a.index || 999);
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : 10000 + (b.index || 999);
      return orderA - orderB;
    });
  } else {
    items.sort((a, b) => (a.index || 999) - (b.index || 999));
  }

  return items.map((prod) => {
    const activePrice =
      customPrices[prod.id] || getBenchmarkPrice(prod.category, prod.stoneType, prod.index || 1);
    return {
      ...prod,
      activePrice,
    };
  });
}
