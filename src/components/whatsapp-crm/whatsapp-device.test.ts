import { describe, expect, test, beforeEach } from "bun:test";

// Polyfill in-memory localStorage for test environment
const mockStorage = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, val: string) => mockStorage.set(key, val),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    key: (i: number) => Array.from(mockStorage.keys())[i] ?? null,
    length: 0,
  };
}

import {
  getStoredDeviceSession,
  saveStoredDeviceSession,
  type WhatsappDeviceSession,
} from "./device-session";

describe("WhatsApp Linked Device (Option B) session management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("defaults to an initialized linked state for Stone Tech terminal with calls suppressed", () => {
    const session = getStoredDeviceSession();
    expect(session.isLinked).toBe(true);
    expect(session.phoneNumber).toBe("+91 98791 23456");
    expect(session.suppressCalls).toBe(true);
    expect(session.accountName).toContain("Stone Tech");
  });

  test("saves and loads customized linked session to localStorage", () => {
    const custom: WhatsappDeviceSession = {
      isLinked: true,
      phoneNumber: "+91 99999 88888",
      accountName: "Rishi & Raman Stone Atelier",
      platform: "macOS Web Session (Multi-Device Engine)",
      linkedAt: "2026-11-22T12:00:00Z",
      lastActiveAt: "2026-11-22T14:00:00Z",
      suppressCalls: true,
    };

    saveStoredDeviceSession(custom);
    const loaded = getStoredDeviceSession();
    expect(loaded.isLinked).toBe(true);
    expect(loaded.phoneNumber).toBe("+91 99999 88888");
    expect(loaded.accountName).toBe("Rishi & Raman Stone Atelier");
    expect(loaded.suppressCalls).toBe(true);
  });

  test("unlinks device session correctly when disconnected", () => {
    const unlinked: WhatsappDeviceSession = {
      isLinked: false,
      phoneNumber: "",
      accountName: "",
      platform: "",
      linkedAt: null,
      lastActiveAt: null,
      suppressCalls: true,
    };

    saveStoredDeviceSession(unlinked);
    const loaded = getStoredDeviceSession();
    expect(loaded.isLinked).toBe(false);
    expect(loaded.phoneNumber).toBe("");
    expect(loaded.suppressCalls).toBe(true);
  });
});
