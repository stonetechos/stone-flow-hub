// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
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

// Sprint 1.7.1, Part 5 — genuine (non-fabricated) build metadata, computed
// once here at build time and injected as global constants consumed by
// src/lib/platform/application.ts. Each value is best-effort: if it can't
// be determined in this environment (no git repo, no migrations directory),
// the constant is left as the bare `undefined` identifier so the
// `typeof __X__ !== "undefined"` guard at the call site degrades to `null`
// rather than ever inventing a value. `bun test` never runs this file (no
// Vite define pass), so the same guard also covers the test environment.
function defineValue(value: string | undefined): string {
  return value === undefined ? "undefined" : JSON.stringify(value);
}

function gitCommitHash(): string | undefined {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

function latestMigrationVersion(): string | undefined {
  try {
    const files = readdirSync(new URL("./supabase/migrations", import.meta.url)).filter((f) =>
      f.endsWith(".sql"),
    );
    if (!files.length) return undefined;
    // Migration filenames are timestamp-prefixed; a lexicographic sort and
    // taking the last one mirrors the order Supabase's migration runner
    // applies them in, so this is genuinely "the latest applied schema
    // version" as of this build — not an invented number.
    files.sort();
    return files[files.length - 1]!.split("_")[0];
  } catch {
    return undefined;
  }
}

const buildTimeDefine = {
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  __GIT_COMMIT_HASH__: defineValue(gitCommitHash()),
  __DB_SCHEMA_VERSION__: defineValue(latestMigrationVersion()),
};

// Computed once, then reused by both branches below — previously this file
// declared `vite:` twice in the same object literal (once unconditionally,
// once inside the Capacitor-only spread); the second occurrence silently
// clobbered the first at the plain-JS-object level (last key wins), which
// meant `mcpPlugin()` was dropped from Capacitor builds. Folding the
// Capacitor-only `build.outDir` into the same object fixes that as a
// side effect of adding `define` here — see the Sprint 1.7.1 completion
// report for detail.
const viteConfig = {
  plugins: [mcpPlugin()],
  define: buildTimeDefine,
  ...(isCapacitorBuild
    ? {
        build: {
          // Own directory so this never collides with the default
          // build's `.output/` on disk — both can be run back to back.
          // The plugin below still splits this into `<outDir>/client`
          // (the real static SPA — what Capacitor's webDir must point
          // at) and `<outDir>/server` (an SSR bundle used only to
          // produce the prerendered shell; not shipped to the device).
          outDir: "dist-capacitor",
        },
      }
    : {}),
};

export default defineConfig({
  vite: viteConfig,
  // Capacitor build skips Nitro/Cloudflare entirely and produces a plain
  // static client build instead — that's what makes a real index.html
  // possible (Nitro's SSR output only ever renders HTML per-request).
  ...(isCapacitorBuild ? { nitro: false } : {}),
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
