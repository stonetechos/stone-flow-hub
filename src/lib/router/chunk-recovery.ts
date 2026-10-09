/**
 * Auto-recovery for chunk load errors and deployment version skew.
 *
 * When a new deployment is shipped to production, browsers with active open tabs
 * continue referencing older JavaScript chunk hashes. When the user navigates
 * to a lazy route, dynamic import() fails with "Importing a module script failed"
 * (WebKit/Safari) or "Failed to fetch dynamically imported module" (Chromium).
 *
 * This utility detects deployment chunk skew and triggers a clean, throttled
 * page reload so the client immediately picks up the latest assets without
 * stranding the user on an error screen.
 */

const RELOAD_THROTTLE_MS = 15_000;
const SESSION_KEY = "stos:chunk_reload_ts";

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    (typeof error === "string"
      ? error
      : (error as Error)?.message || (error as { name?: string })?.name || "") || "";
  const lower = msg.toLowerCase();
  return (
    lower.includes("importing a module script failed") ||
    lower.includes("failed to fetch dynamically imported module") ||
    lower.includes("error loading dynamically imported module") ||
    lower.includes("unable to preload css") ||
    lower.includes("loading chunk") ||
    lower.includes("dynamically imported module")
  );
}

export function recoverFromChunkError(force = false): boolean {
  if (typeof window === "undefined") return false;

  try {
    const lastReload = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    const now = Date.now();

    if (!force && lastReload > 0 && now - lastReload < RELOAD_THROTTLE_MS) {
      // Throttled: prevent infinite reload loops if the network is genuinely disconnected
      return false;
    }

    sessionStorage.setItem(SESSION_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    window.location.reload();
    return true;
  }
}
