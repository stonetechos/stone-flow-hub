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

const defaultDomains = ["erp.stonetech.in", "stonetech.in", "www.stonetech.in"];
const customDomains = process.env.PRODUCTION_CUSTOM_DOMAINS
  ? process.env.PRODUCTION_CUSTOM_DOMAINS.split(",").map((s) => s.trim())
  : process.env.PRODUCTION_CUSTOM_DOMAIN
    ? [process.env.PRODUCTION_CUSTOM_DOMAIN]
    : defaultDomains;

let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf-8"));
} catch (err) {
  console.error(`Could not read ${configPath} — did \`bun run build\` run first?`);
  throw err;
}

let modified = false;
for (const domain of customDomains) {
  const alreadyPresent = (config.routes ?? []).some(
    (r) => typeof r === "object" && r.pattern === domain,
  );

  if (!alreadyPresent) {
    config.routes = [...(config.routes ?? []), { pattern: domain, custom_domain: true }];
    modified = true;
    console.log(`Added custom domain route "${domain}" to ${configPath}`);
  } else {
    console.log(`Custom domain route "${domain}" already present in ${configPath}`);
  }
}

if (modified) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}
