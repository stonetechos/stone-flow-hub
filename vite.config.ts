// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Set by `npm run build:capacitor` only. Every other script (dev, build,
// build:dev, preview) leaves this unset, so the default Cloudflare/Nitro
// build below is completely unchanged by anything in this file.
//
// VITE_-prefixed so the wrapper's automatic VITE_* env injection also
// exposes it to client code as `import.meta.env.VITE_CAPACITOR_BUILD` —
// see src/lib/capacitor/install-fetch-patch.ts, which reads it to decide
// whether to install its fetch patch.
const isCapacitorBuild = process.env.VITE_CAPACITOR_BUILD === "true";

export default defineConfig({
  vite: { plugins: [mcpPlugin()] },
  // Capacitor build skips Nitro/Cloudflare entirely and produces a plain
  // static client build instead — that's what makes a real index.html
  // possible (Nitro's SSR output only ever renders HTML per-request).
  ...(isCapacitorBuild ? { nitro: false } : {}),
  ...(isCapacitorBuild
    ? {
        vite: {
          build: {
            // Own directory so this never collides with the default
            // build's `.output/` on disk — both can be run back to back.
            // The plugin below still splits this into `<outDir>/client`
            // (the real static SPA — what Capacitor's webDir must point
            // at) and `<outDir>/server` (an SSR bundle used only to
            // produce the prerendered shell; not shipped to the device).
            outDir: "dist-capacitor",
          },
        },
      }
    : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isCapacitorBuild
      ? {
          // Prerenders the root route to a real static HTML shell instead
          // of relying on per-request SSR. See:
          // https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode
          spa: {
            enabled: true,
            prerender: {
              // Emit the shell as index.html at the client output root —
              // Capacitor's webDir expects to find it there directly.
              outputPath: "/index.html",
            },
          },
          // serverFns.base is intentionally left at its default
          // ("/_serverFn") here. It's a *path* option, not an origin
          // override — passing an absolute URL produces a malformed
          // request URL in the compiled bundle (confirmed by inspecting
          // the build output). Redirecting calls to the real deployment
          // is instead handled at runtime by a fetch patch; see
          // src/lib/capacitor/install-fetch-patch.ts.
        }
      : {}),
  },
});
