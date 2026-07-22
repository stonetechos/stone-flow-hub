/**
 * Sprint 1.7.1, Part 4 — best-effort User-Agent parsing and platform
 * detection for audit log enrichment (the `browser`/`os`/`platform`
 * columns added to `activity_log` by migration 20260722160003).
 *
 * Deliberately minimal and dependency-free: recognizes the handful of
 * browser/OS families actually likely to show up in this app's traffic
 * (desktop Chrome/Safari/Firefox/Edge on Windows/macOS/Linux, mobile
 * Chrome/Safari on Android/iOS) plus the packaged Capacitor WebView.
 * Anything it doesn't recognize returns `null` for that field rather than
 * guessing — per Part 4's "do not fake values" principle, which this
 * module treats as a general rule, not just for the IP address field it
 * was originally stated for.
 */
import { isCapacitorAppOrigin } from "@/lib/capacitor/server-origin-allowlist";

export interface ParsedUserAgent {
  browser: string | null;
  os: string | null;
}

// Order matters — more specific patterns (Edge, Opera, the *iOS webkit
// wrapper UAs) must be checked before the generic ones they'd otherwise
// also match (e.g. Edge's UA also contains "Chrome/").
const BROWSER_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/edg\//i, "Edge"],
  [/opr\//i, "Opera"],
  [/crios\//i, "Chrome"],
  [/fxios\//i, "Firefox"],
  [/chrome\//i, "Chrome"],
  [/firefox\//i, "Firefox"],
  [/version\/[\d.]+.*safari/i, "Safari"],
];

const OS_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/windows nt/i, "Windows"],
  [/android/i, "Android"],
  [/iphone|ipad|ipod/i, "iOS"],
  [/mac os x/i, "macOS"],
  [/cros /i, "ChromeOS"],
  [/linux/i, "Linux"],
];

/** Parses a raw User-Agent string into a coarse browser/OS pair. Returns
 * `{ browser: null, os: null }` for a missing or entirely unrecognized
 * string — never a guess. */
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  if (!userAgent) return { browser: null, os: null };
  const browser = BROWSER_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? null;
  const os = OS_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? null;
  return { browser, os };
}

/**
 * "Web" vs "Capacitor" (the packaged mobile app), derived from a request's
 * `Origin` header. Reuses `CAPACITOR_APP_ORIGINS`/`isCapacitorAppOrigin`
 * from `src/lib/capacitor/server-origin-allowlist.ts` — the existing,
 * isomorphic single source of truth for what a Capacitor request's origin
 * looks like — rather than re-declaring the same origins here.
 *
 * Returns `null` when there's no Origin header to check. Browsers don't
 * always send one (notably, same-origin GET navigations frequently omit
 * it), so a `null` here means "unknown", not "definitely not Capacitor" —
 * consistent with never asserting more than what was actually observed.
 */
export function derivePlatformFromOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null;
  return isCapacitorAppOrigin(origin) ? "Capacitor" : "Web";
}
