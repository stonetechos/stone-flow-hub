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

let registered = false;

export function registerServiceWorker(): void {
  if (registered) return;
  if (typeof window === "undefined") return; // SSR guard
  if (!("serviceWorker" in navigator)) return;
  registered = true;

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // A previous SW already controlled this page, so this is an
              // update (not the first install) — offer a refresh instead
              // of silently swapping the app shell under an active user.
              toast("Update available", {
                description: "A new version of Stone Tech OS is ready.",
                action: {
                  label: "Refresh",
                  onClick: () => {
                    installing.postMessage({ type: "SKIP_WAITING" });
                  },
                },
                duration: Infinity,
              });
            }
          });
        });
      })
      .catch((err) => console.warn("[pwa] service worker registration failed", err));

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
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
            window.dispatchEvent(
              new CustomEvent("stone-tech-os:pending-ops-flush", { detail: ops }),
            );
          }
        });
      }
    });
  });
}
