/**
 * Unit tests for the audit User-Agent/platform
 * parsing helpers. Pure functions, no Supabase/network mocking needed.
 */
import { describe, test, expect } from "bun:test";
import { parseUserAgent, derivePlatformFromOrigin } from "./user-agent";

const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SAFARI_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const FIREFOX_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const EDGE_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";

describe("parseUserAgent", () => {
  test("returns null/null for a missing user agent", () => {
    expect(parseUserAgent(null)).toEqual({ browser: null, os: null });
    expect(parseUserAgent(undefined)).toEqual({ browser: null, os: null });
    expect(parseUserAgent("")).toEqual({ browser: null, os: null });
  });

  test("recognizes desktop Chrome on Windows", () => {
    expect(parseUserAgent(CHROME_WINDOWS)).toEqual({ browser: "Chrome", os: "Windows" });
  });

  test("recognizes desktop Safari on macOS", () => {
    expect(parseUserAgent(SAFARI_MAC)).toEqual({ browser: "Safari", os: "macOS" });
  });

  test("recognizes Firefox on Linux", () => {
    expect(parseUserAgent(FIREFOX_LINUX)).toEqual({ browser: "Firefox", os: "Linux" });
  });

  test("recognizes Chrome on Android", () => {
    expect(parseUserAgent(CHROME_ANDROID)).toEqual({ browser: "Chrome", os: "Android" });
  });

  test("recognizes Safari on iOS", () => {
    expect(parseUserAgent(SAFARI_IOS)).toEqual({ browser: "Safari", os: "iOS" });
  });

  test("recognizes Edge (not misreported as Chrome, despite sharing the Chrome/ token)", () => {
    expect(parseUserAgent(EDGE_WINDOWS)).toEqual({ browser: "Edge", os: "Windows" });
  });

  test("returns null fields for an unrecognized user agent, rather than guessing", () => {
    expect(parseUserAgent("SomeCustomBot/1.0")).toEqual({ browser: null, os: null });
  });
});

describe("derivePlatformFromOrigin", () => {
  test("returns null when there's no origin to check", () => {
    expect(derivePlatformFromOrigin(null)).toBeNull();
    expect(derivePlatformFromOrigin(undefined)).toBeNull();
  });

  test("recognizes the Capacitor Android WebView origin", () => {
    expect(derivePlatformFromOrigin("https://localhost")).toBe("Capacitor");
  });

  test("recognizes the Capacitor iOS WebView origin", () => {
    expect(derivePlatformFromOrigin("capacitor://localhost")).toBe("Capacitor");
  });

  test("treats any other origin as Web", () => {
    expect(derivePlatformFromOrigin("https://erp.stonetech.in")).toBe("Web");
  });
});
