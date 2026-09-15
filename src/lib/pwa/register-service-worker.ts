/**
 * Service worker registration (Phase G.10A: PWA Foundation).
 *
 * Called once from the root shell (`src/routes/__root.tsx`), client-only.
 * Kept deliberately separate from that file so root stays about routing
 * concerns, matching how other cross-cutting client setup (toast
 * diagnostics, error reporting) is split into `src/lib/*` there already.
 */
import { toast } from "sonner";
import { listPendingOperations } from "@/lib/pwa/sync-queue";
import { isCapacitorAppOrigin } from "@/lib/capacitor/server-origin-allowlist";

let registered = false;

export function registerServiceWorker(): void {
  if (registered) return;
  if (typeof window === "undefined") return; // SSR guard
  if (!("serviceWorker" in navigator)) return;
  // The packaged Capacitor app serves the same bundle — `public/sw.js`
  // included — from its own WebView origin, where a service worker has
  // nothing useful to do: the assets are already local, and the store
  // handles updates. What it can do is get in the way. The offline
  // fallback becomes unreachable (the WebView's navigations are file-backed,
  // not network-backed), and the update prompt and controllerchange reload
  // below fire against an app that was never fetched over the network. Two
  // caching layers with different lifetimes over one set of files is a
  // source of stale-shell bugs and nothing else.
  if (isCapacitorAppOrigin(window.location.origin)) return;
  registered = true;

  // Purge any stale legacy caches immediately on boot
  if ("caches" in window) {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        if (key !== "stos-static-stos-5") {
          void caches.delete(key);
        }
      }
    });
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Proactively check for an updated worker on every page load
        void registration.update();

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // Immediately activate the new worker and reload
              installing.postMessage({ type: "SKIP_WAITING" });
              toast("STOS Updated", {
                description: "Applying latest release...",
                duration: 3_000,
              });
            }
          });
        });
      })
      .catch((err) => console.warn("[pwa] service worker registration failed", err));

    // Reload only when an already-controlled page swaps to a new worker,
    // which is the case this is for. On a first-ever install the page
    // starts uncontrolled and `clients.claim()` in the worker's activate
    // handler fires this same event — reloading there throws away a page
    // the user is already using, and because the guard flag does not
    // survive the reload it triggers, a worker that re-activates can do it
    // again and again.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "FLUSH_PENDING_OPS") {
        void listPendingOperations().then((ops) => {
          if (ops.length > 0) {
            // Foundation-phase: no consumer drains this queue yet (see
            // src/lib/pwa/sync-queue.ts). Surface it instead of silently
            // dropping, so a future phase's outbox has something to hook
            // into and nothing is lost in the meantime.
            window.dispatchEvent(new CustomEvent("stos:pending-ops-flush", { detail: ops }));
          }
        });
      }
    });
  });
}
