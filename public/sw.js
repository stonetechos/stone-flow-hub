/**
 * STOS — service worker (Phase G.10A: PWA Foundation).
 *
 * Scope is intentionally narrow: cache static sub-resources (built JS/CSS,
 * fonts, icons) so a warm load is fast, while every request that can carry
 * business data — Supabase REST/Auth/Storage/Realtime and same-origin
 * /api/* — is left completely untouched (network-only, no cache, no
 * interception) so RLS and auth behave exactly as they do today.
 *
 * HTML documents are deliberately never cached; see the comment on
 * `networkOnlyNavigation` for why, and for what a real offline boot would
 * require. The practical consequence is that offline means the offline
 * page, not a working app.
 *
 * Bump CACHE_VERSION on any change to the caching rules below; old caches
 * are swept in `activate`.
 */

const CACHE_VERSION = "stos-3";
const STATIC_CACHE = `stos-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Small, known-stable set precached at install. Hashed build output
// (JS/CSS chunks) is intentionally NOT precached here — there is no
// build-time manifest plugin wired up (see docs/ARCHITECTURE.md / vite
// config note about not adding plugins manually), so those are instead
// picked up opportunistically by the stale-while-revalidate runtime
// handler below as the user navigates.
const PRECACHE_URLS = [
  "/manifest.json",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// The offline page is precached separately from the list above, and not
// with `cache.addAll`. Cloudflare Workers Assets serves this project with
// `html_handling: auto-trailing-slash`, so a request for `/offline.html`
// is answered with a 307 to `/offline`. Following that redirect produces a
// Response whose `redirected` flag is true, and the spec forbids using
// such a response to satisfy a navigation request — the browser rejects it
// and the user gets a network error instead of the offline page, which is
// to say the offline page never once displayed. Copying the body into a
// fresh Response drops the flag, and does so whichever path ends up
// serving the file.
async function precacheOfflinePage(cache) {
  const response = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!response.ok) throw new Error(`offline page responded ${response.status}`);
  const body = await response.blob();
  await cache.put(
    OFFLINE_URL,
    new Response(body, {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
  );
}

const SUPABASE_HOST_HINT = "supabase.co";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all([
        cache.addAll(PRECACHE_URLS).catch((err) => console.warn("[sw] precache failed", err)),
        precacheOfflinePage(cache).catch((err) =>
          console.warn("[sw] offline page precache failed", err),
        ),
      ]);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Deletes every cache but the current static one, which now includes
      // the `stos-pages-*` caches this worker used to write. Those held
      // whole HTML documents referencing content-hashed chunks that no
      // longer exist; sweeping them is what un-poisons a browser that
      // picked one up before this version.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
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

// Navigations are network-only, with the offline page as the sole
// fallback. This worker used to cache each HTML document it fetched and
// replay it when the network failed, which sounds strictly better and is
// not: every document references the build's content-hashed JS and CSS
// chunks by filename, and each deploy publishes new hashes and deletes the
// old ones. A replayed document is therefore a page whose scripts 404 —
// a blank screen with no error, indistinguishable from the app being
// broken, and persisting until the user clears site data. Serving a page
// that says "you are offline" is worse only in the narrow case of a
// genuinely offline reload, and it is honest, which the blank screen was
// not. Restoring real offline navigation needs a build-time asset
// manifest so the shell and the chunks it names can be versioned and
// precached together.
async function networkOnlyNavigation(request) {
  try {
    return await fetch(request);
  } catch {
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
    event.respondWith(networkOnlyNavigation(request));
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
const SYNC_TAG = "stos-pending-ops";

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
    payload = { title: "STOS", body: event.data.text() };
  }
  const title = payload.title || "STOS";
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
