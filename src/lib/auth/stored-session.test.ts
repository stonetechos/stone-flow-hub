import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { getStoredAuthSessionSync, isStoredSessionValid } from "./stored-session";

describe("stored-session", () => {
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

  it("returns null when no session is in localStorage", () => {
    expect(getStoredAuthSessionSync()).toBeNull();
  });

  it("reads standard Supabase session format from localStorage", () => {
    const mockSession = {
      access_token: "test_token",
      refresh_token: "test_refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: "usr_123",
        email: "test@stonetech.in",
      },
    };

    store.set("sb-abcd123-auth-token", JSON.stringify(mockSession));
    const result = getStoredAuthSessionSync();

    expect(result).not.toBeNull();
    expect(result?.user.id).toBe("usr_123");
    expect(result?.user.email).toBe("test@stonetech.in");
    expect(result?.access_token).toBe("test_token");
    expect(isStoredSessionValid(result)).toBe(true);
  });

  it("detects expired session", () => {
    const mockExpiredSession = {
      access_token: "test_token",
      refresh_token: "test_refresh",
      expires_at: Math.floor(Date.now() / 1000) - 60, // expired 1 min ago
      user: {
        id: "usr_123",
      },
    };

    store.set("sb-test-auth-token", JSON.stringify(mockExpiredSession));
    const result = getStoredAuthSessionSync();

    expect(result).not.toBeNull();
    expect(isStoredSessionValid(result)).toBe(false);
  });
});
