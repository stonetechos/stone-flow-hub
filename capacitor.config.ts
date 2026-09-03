import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.vedoravision.stonetechos.app",
  appName: "STOS",
  // Produced by `npm run build:capacitor` (see vite.config.ts) — a real
  // static SPA shell (index.html + assets), not the Nitro/Cloudflare
  // output in `.output/` that the default `npm run build` produces.
  webDir: "dist-capacitor/client",
  server: {
    // Pinned explicitly (these match Capacitor's own defaults) because
    // src/lib/capacitor/server-origin-allowlist.ts and the CSRF/CORS
    // middleware in src/start.ts hardcode https://localhost as the
    // Android app's origin — if this ever changes, that allowlist must
    // change with it.
    androidScheme: "https",
    hostname: "localhost",
  },
  // Baseline edge-to-edge config applied on launch, before any JS runs.
  // `overlaysWebView: true` matches what the CSS side already assumes
  // (every `env(safe-area-inset-*)` fix in this codebase only resolves to
  // a non-zero value once the WebView actually draws behind the system
  // bars) — without this, on Android <15 the WebView would be letterboxed
  // below the status bar and every safe-area padding rule would compute to
  // 0, silently doing nothing. On Android 15+ (this app's targetSdk is 36)
  // the OS forces edge-to-edge regardless, so this line is a no-op there
  // and only matters for anyone testing on an older emulator/device image.
  // `src/lib/capacitor/status-bar.ts` re-asserts this at runtime and also
  // sets icon style, since that needs to react to the app's light/dark
  // theme rather than being fixed at build time.
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "DEFAULT",
    },
  },
};

export default config;
