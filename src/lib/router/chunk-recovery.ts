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

const RELOAD_THROTTLE_MS = 60_000;
const SESSION_KEY = "stos:chunk_reload_ts";
const SESSION_COUNT_KEY = "stos:chunk_reload_count";
const MAX_AUTO_RELOADS_PER_SESSION = 1;

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
    const reloadCount = Number(sessionStorage.getItem(SESSION_COUNT_KEY) || 0);
    const now = Date.now();

    // Prevent infinite reload loops: allow at most 1 automatic reload per tab session
    if (!force && reloadCount >= MAX_AUTO_RELOADS_PER_SESSION) {
      console.warn(
        "[chunk-recovery] Maximum auto-recovery reload limit reached for this session. Suppressing reload loop.",
      );
      return false;
    }

    if (!force && lastReload > 0 && now - lastReload < RELOAD_THROTTLE_MS) {
      // Throttled: prevent rapid reload loops
      return false;
    }

    sessionStorage.setItem(SESSION_KEY, String(now));
    sessionStorage.setItem(SESSION_COUNT_KEY, String(reloadCount + 1));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
