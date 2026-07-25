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
};

export default config;
