/**
 * Rewrites server-function RPC calls to the real deployed origin when this
 * bundle is running inside the packaged Capacitor Android app.
 *
 * Why this exists: TanStack Start's server-function client stub always
 * builds request URLs as a root-relative path (`/_serverFn/<fnId>`) — its
 * `serverFns.base` build option is a *path* customization knob, not a full
 * origin override (confirmed empirically: passing an absolute URL there
 * produces a malformed `/https:/host/...` URL in the compiled bundle, since
 * the codegen unconditionally prefixes the configured base with `/`).
 *
 * A relative path resolves fine on the real web deployment (same origin as
 * the page) and on Netlify/CDN-style deployments docs describe (rewrite
 * rules route it to the server). Neither applies to Capacitor: the app has
 * no server of its own and no CDN in front of it — `/_serverFn/...`
 * resolved against the WebView's own origin (https://localhost) simply
 * doesn't exist. So this patches the one thing all server-fn calls funnel
 * through — `fetch` — to redirect just that one path prefix to the real
 * deployment. Everything else (Supabase calls, already-absolute URLs) is
 * untouched and passes straight through to the original fetch.
 *
 * Gated on VITE_CAPACITOR_BUILD (set only by `npm run build:capacitor`,
 * see vite.config.ts) so the normal web bundle never installs this patch.
 *
 * Called explicitly (not a bare side-effect import) from the top of
 * src/routes/__root.tsx, before the router — and therefore any route
 * loader's server-fn calls — is created. This package declares
 * `"sideEffects": false` in package.json, so a plain `import "./foo"` with
 * no used export would be silently tree-shaken out of the client bundle;
 * an explicitly invoked named export survives that pass.
 */

// Mirrors CAPACITOR_SERVER_ORIGIN in vite.config.ts and ROOT_DOMAIN in
// src/routes/lovable/email/auth/webhook.ts — this app's other hardcoded
// references to the production origin. Keep all three in sync.
const CAPACITOR_SERVER_ORIGIN = "https://erp.stonetech.in";
const SERVER_FN_PATH_PREFIX = "/_serverFn/";

let installed = false;

export function installCapacitorServerFnFetchPatch(): void {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (import.meta.env.VITE_CAPACITOR_BUILD !== "true") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      if (input.url.startsWith(SERVER_FN_PATH_PREFIX)) {
        return originalFetch(new Request(CAPACITOR_SERVER_ORIGIN + input.url, input), init);
      }
      return originalFetch(input, init);
    }

    const url = input instanceof URL ? input.href : input;
    if (url.startsWith(SERVER_FN_PATH_PREFIX)) {
      return originalFetch(CAPACITOR_SERVER_ORIGIN + url, init);
    }
    return originalFetch(input, init);
  };
}
