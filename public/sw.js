/**
 * Stone Tech OS — service worker (Phase G.10A: PWA Foundation).
 *
 * Scope is intentionally narrow: cache the static app shell (built JS/CSS,
 * fonts, icons) so the app installs and boots offline, while every request
 * that can carry business data — Supabase REST/Auth/Storage/Realtime and
 * same-origin /api/* — is left completely untouched (network-only, no
 * cache, no interception) so RLS and auth behave exactly as they do today.
 *
 * Bump CACHE_VERSION on any change to the caching rules below; old caches
 * are swept in `activate`.
 */

const CACHE_VERSION = "g10a-1";
const STATIC_CACHE = `stone-tech-os-static-${CACHE_VERSION}`;
const PAGES_CACHE = `stone-tech-os-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Small, known-stable set precached at install. Hashed build output
// (JS/CSS chunks) is intentionally NOT precached here — there is no
// build-time manifest plugin wired up (see docs/ARCHITECTURE.md / vite
// config note about not adding plugins manually), so those are instead
// picked up opportunistically by the stale-while-revalidate runtime
// handler below as the user navigates.
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const SUPABASE_HOST_HINT = "supabase.co";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn("[sw] precache failed", err)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// Client asks us to activate an already-installed waiting worker
// immediately (used by the "new version available" reload prompt in
// src/lib/pwa/register-service-worker.ts).
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSensitiveRequest(url) {
  // Never cache anything that can carry authenticated business data or
  // bypass RLS: Supabase (REST/Auth/Storage/Realtime) and our own
  // server API routes.
  if (url.hostname.includes(SUPABASE_HOST_HINT)) return true;
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return true;
  return false;
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) {
    // Allow caching of known, non-sensitive cross-origin static assets
    // (Google Fonts) but nothing else cross-origin.
    return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  }
  return /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone());
      } else if (response && response.type === "opaque") {
        // cross-origin (e.g. Google Fonts) — still cacheable, just opaque
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

async function networkFirstNavigation(request) {
  const pagesCache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      pagesCache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await pagesCache.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever intercept GET — mutations (POST/PATCH/DELETE) always go
  // straight to the network untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isSensitiveRequest(url)) return; // network-only, untouched

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
  // everything else (e.g. cross-origin analytics/AI calls): default
  // network behavior, not intercepted.
});

// --- Background Sync -------------------------------------------------
// The service worker cannot safely hold a Supabase session, so it does
// not perform writes itself. It only wakes any open tab up to flush its
// IndexedDB pending-operations queue (see src/lib/pwa/sync-queue.ts).
// Genuine gap note: no ERP mutation currently enqueues into that queue —
// this phase ships the primitive only, per "PWA Foundation" scope.
const SYNC_TAG = "stone-tech-os-pending-ops";

self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window" });
      for (const client of clientsList) {
        client.postMessage({ type: "FLUSH_PENDING_OPS" });
      }
    })(),
  );
});

// --- Push notifications (readiness stub only) -------------------------
// No VAPID keys / subscription flow / subscriptions table exist yet —
// deliberately out of scope for this phase (would require a schema
// change). These handlers just make the worker forward-compatible.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Stone Tech OS", body: event.data.text() };
  }
  const title = payload.title || "Stone Tech OS";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.url ? { url: payload.url } : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window" });
      const existing = clientsList.find((c) => c.url.includes(targetUrl));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })(),
  );
});
