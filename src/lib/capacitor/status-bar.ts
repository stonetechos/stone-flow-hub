/**
 * Runtime edge-to-edge / status-bar setup for the packaged Android app.
 *
 * `capacitor.config.ts`'s `plugins.StatusBar` block sets the same
 * `overlaysWebView`/`style` values as a launch-time default (applied by the
 * native shell before any JS runs), which matters because a fair number of
 * OEM WebViews apply that native config a frame or two before the first
 * paint. This module re-asserts the same values once JS is running, and is
 * the file to extend if/when the app grows a dark theme — `StatusBar.setStyle`
 * would move from a static call to a `matchMedia`/theme-context subscriber
 * here, without touching anything else in the app shell.
 *
 * Deliberately NOT gated on `VITE_CAPACITOR_BUILD` (unlike
 * `install-fetch-patch.ts`) — `@capacitor/status-bar`'s web implementation
 * is a documented no-op stub, so calling it from an ordinary browser tab is
 * harmless. It IS gated on `Capacitor.isNativePlatform()` so the plugin
 * bridge is never even touched outside the native shell.
 */
import { Capacitor } from "@capacitor/core";

let installed = false;

export async function configureStatusBarForEdgeToEdge(): Promise<void> {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  installed = true;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // WebView draws full-bleed behind the status bar / gesture bar; every
    // `env(safe-area-inset-*)` rule in this codebase depends on this being
    // true to resolve to anything other than 0 (see capacitor.config.ts).
    await StatusBar.setOverlaysWebView({ overlay: true });
    // `Default` defers to the OS's own light/dark heuristic rather than
    // this app guessing — correct today since STOS ships one (light) theme
    // only; revisit per the file header comment if that changes.
    await StatusBar.setStyle({ style: Style.Default });
  } catch (error) {
    // Some OEM WebViews (a handful of MIUI/ColorOS builds are the commonly
    // reported offenders) throw on one of these calls despite implementing
    // the plugin. Never let a status-bar cosmetic failure break app boot —
    // the CSS safe-area fallbacks still apply either way.
    console.warn("[status-bar] edge-to-edge setup failed", error);
  }
}
