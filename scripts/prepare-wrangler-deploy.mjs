#!/usr/bin/env node
/**
 * Patches the wrangler config Nitro's cloudflare-module preset generates at
 * build time (.output/server/wrangler.json) so `wrangler deploy` also
 * attaches the production custom domain — without this, a plain `wrangler
 * deploy` only publishes to the Worker's default *.workers.dev URL.
 *
 * Why patch the generated file instead of hand-writing routes into the
 * repo's own wrangler.jsonc: the generated file's `main`/`assets` paths are
 * relative to `.output/server/` (see that file's own header comment) and
 * differ from the repo-root file's paths, plus Nitro adds `no_bundle` and
 * ESM `rules` the repo-root file doesn't carry. The generated file is what
 * actually gets deployed; the repo-root `wrangler.jsonc` is kept only for
 * `wrangler dev` / manual reference.
 *
 * Run this after `bun run build`, before `wrangler deploy -c
 * .output/server/wrangler.json`. Idempotent — safe to run more than once.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "..", ".output", "server", "wrangler.json");

const customDomain = process.env.PRODUCTION_CUSTOM_DOMAIN || "erp.stonetech.in";

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf-8"));
} catch (err) {
  console.error(`Could not read ${configPath} — did \`bun run build\` run first?`);
  throw err;
}

const alreadyPresent = (config.routes ?? []).some(
  (r) => typeof r === "object" && r.pattern === customDomain,
);

if (!alreadyPresent) {
  config.routes = [...(config.routes ?? []), { pattern: customDomain, custom_domain: true }];
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Added custom domain route "${customDomain}" to ${configPath}`);
} else {
  console.log(`Custom domain route "${customDomain}" already present in ${configPath}`);
}
