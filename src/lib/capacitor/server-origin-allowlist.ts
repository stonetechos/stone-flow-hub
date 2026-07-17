/**
 * Cross-origin allowlist for the packaged Capacitor Android app.
 *
 * Background: TanStack Start server functions (`/_serverFn/*`) are same-origin
 * RPC endpoints by design — protected by a CSRF check (Sec-Fetch-Site/Origin/
 * Referer) and, absent any CORS response headers, blocked outright by the
 * browser's CORS policy for any cross-origin caller.
 *
 * The Capacitor app has no local server: it's a static bundle shipped inside
 * the APK, served to the WebView from Capacitor's own local origin (NOT the
 * deployed erp.stonetech.in origin). Every server function call it makes is
 * therefore a genuine cross-origin request. This module is the single place
 * that both the CSRF middleware and the CORS middleware (src/start.ts) read
 * from, so the two checks can never drift out of sync.
 *
 * Auth is Bearer-token based (see auth-attacher.ts) — the app attaches
 * `Authorization: Bearer <supabase access token>` itself, not cookies — so
 * there is no ambient-credential CSRF risk here and no need for
 * `Access-Control-Allow-Credentials`. Widening this allowlist only lets the
 * listed origins read server function *responses*; it does not grant them
 * any session the caller doesn't already hold a valid token for.
 */

// https://localhost — Capacitor's default Android WebView origin
// (server.androidScheme: 'https', server.hostname: 'localhost', both set
// explicitly in capacitor.config.ts to pin this value across Capacitor
// version bumps).
// capacitor://localhost — Capacitor's default iOS WebView origin, kept
// here so adding an iOS platform later doesn't require touching this file.
export const CAPACITOR_APP_ORIGINS = new Set<string>([
  "https://localhost",
  "capacitor://localhost",
]);

export function isCapacitorAppOrigin(origin: string | null): origin is string {
  return origin != null && CAPACITOR_APP_ORIGINS.has(origin);
}
