import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  readCustomRenames,
  saveCustomRenames,
  readSidebarWidth,
  saveSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from "./custom-renames";

describe("custom-renames", () => {
  const store = new Map<string, string>();
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const originalLocalStorage = (globalThis as unknown as { localStorage?: unknown }).localStorage;

  beforeEach(() => {
    store.clear();
    const mockStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };

    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage = mockStorage;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    } else {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
    if (originalLocalStorage !== undefined) {
      (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
    } else {
      delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    }
  });

  it("reads default empty renames when storage is clear", () => {
    expect(readCustomRenames()).toEqual({});
  });

  it("persists and retrieves custom tab renames", () => {
    saveCustomRenames({
      "application-payments": "App Payments",
      "application-ledger": "App Ledgers",
    });

    const renames = readCustomRenames();
    expect(renames["application-payments"]).toBe("App Payments");
    expect(renames["application-ledger"]).toBe("App Ledgers");
  });

  it("reads default sidebar width when unset", () => {
    expect(readSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH);
  });

  it("persists and clamps custom sidebar width within bounds", () => {
    saveSidebarWidth(320);
    expect(readSidebarWidth()).toBe(320);

    // Below minimum
    saveSidebarWidth(100);
    expect(readSidebarWidth()).toBe(MIN_SIDEBAR_WIDTH);

    // Above maximum
    saveSidebarWidth(900);
    expect(readSidebarWidth()).toBe(MAX_SIDEBAR_WIDTH);
  });
});
