#!/usr/bin/env node
/**
 * Regression guard for the "AI server functions must use the
 * authenticated Supabase client, never the anonymous singleton" fix.
 *
 * Background: every data-access function under src/lib/**\/api.ts is
 * called from both the browser (where the module-level `supabase`
 * singleton in integrations/supabase/client.ts carries the real user's
 * session) and TanStack Start server functions like `nlSearch` (where
 * that same singleton has no session — it authenticates as Postgres role
 * `anon`, and every RLS policy that matters is scoped `TO authenticated`,
 * so it silently returns zero rows). That was the actual root cause of
 * Copilot's "no matching records" bug for every query, regardless of how
 * correct the resolver logic was. The fix: these files now call
 * getDb() (integrations/supabase/server-context.ts) instead of importing
 * the singleton directly; getDb() resolves to the real authenticated
 * client inside a withAuthenticatedClient() scope (which nlSearch's
 * handler opens with requireSupabaseAuth's context.supabase) and falls
 * back to the exact same singleton everywhere else, so browser behaviour
 * is unchanged.
 *
 * This script has no framework dependency (the repo has no vitest/jest
 * configured) — it's a plain Node script performing static source
 * checks, run via `npm run verify:auth-context`. It exits non-zero (and
 * fails CI, if wired into it) the moment any of the following regress:
 *
 *   1. Any of the data-access files this fix touched reverts to
 *      importing the anonymous singleton directly.
 *   2. Any of those same files stops importing getDb from
 *      server-context.
 *   3. nl-search.functions.ts's nlSearch handler stops wrapping its body
 *      in withAuthenticatedClient(context.supabase, ...).
 *   4. resolve.ts starts importing a NEW list*()/get*() data-access
 *      module (from src/lib/**\/api.ts or similar) that isn't in this
 *      script's known-migrated set — a signal that a future AI feature
 *      added a new resolver without threading the authenticated client
 *      through it.
 *
 * Milestone 1 (VIE Phase 2 — Hardening & Guardrails) extended this same
 * script, rather than adding a second one, to guard the equivalent risks in
 * src/lib/vie/**:
 *
 *   5. vie.functions.ts's server functions stop opening the authenticated
 *      scope (the same class of regression as check 3, for VIE's own
 *      entry points).
 *   6. Any handler registered in the VIE Action Registry
 *      (src/lib/vie/actions/*.ts) writes to a business table directly
 *      instead of calling an existing, already-reviewed @/lib/*\/api
 *      function — the automated version of ADR-0001's "no parallel write
 *      path" rule, which previously relied on manual code review alone.
 *      Unlike check 4's hardcoded MIGRATED_FILES list, this scans the
 *      actions directory itself, so a newly-added handler is checked
 *      automatically with nothing to remember to update here.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ANON_IMPORT = '@/integrations/supabase/client"';
const AUTH_IMPORT = '@/integrations/supabase/server-context"';

// Every data-access file this fix migrated, covering every G.9B NL
// Search resolver: customers, enquiries, quotations, sales orders,
// invoices, receipts, dispatch, installations, purchase orders,
// vendors, products, inventory, projects, global search, timeline
// (+ the vendor timeline it dynamically imports), and the three
// further data sources the Executive Insight providers those
// resolvers fan out to actually read from (payment dashboard,
// installation progress, manufacturing/production orders).
const MIGRATED_FILES = [
  "src/lib/customers/api.ts",
  "src/lib/enquiries/api.ts",
  "src/lib/quotes/api.ts",
  "src/lib/sales-orders/api.ts",
  "src/lib/invoices/api.ts",
  "src/lib/receipts/api.ts",
  "src/lib/dispatch/api.ts",
  "src/lib/installation/orders.ts",
  "src/lib/purchase-orders/api.ts",
  "src/lib/vendors/api.ts",
  "src/lib/products/api.ts",
  "src/lib/inventory/api.ts",
  "src/lib/projects/api.ts",
  "src/lib/search/api.ts",
  "src/lib/timeline/api.ts",
  "src/lib/vendors/timeline.ts",
  "src/lib/customer-payments/schedule.ts",
  "src/lib/installation/progress.ts",
  "src/lib/manufacturing/api.ts",
];

let failures = 0;

function fail(message) {
  console.error(`✘ ${message}`);
  failures++;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function read(relPath) {
  return readFileSync(path.join(ROOT, relPath), "utf8");
}

// --- Checks 1 & 2: every migrated data-access file must use getDb(),
// never the anonymous singleton, for its query client. ---
for (const relPath of MIGRATED_FILES) {
  let content;
  try {
    content = read(relPath);
  } catch {
    fail(
      `${relPath}: could not read file (has it moved? update MIGRATED_FILES and resolve.ts's imports together)`,
    );
    continue;
  }

  if (content.includes(ANON_IMPORT)) {
    fail(
      `${relPath}: imports the anonymous module-level Supabase singleton directly. Server-side callers (AI/NL Search) would run unauthenticated and RLS-filtered to zero rows — this is the exact bug that made Copilot's customer search always return "No matching records found". Import getDb from "@/integrations/supabase/server-context" instead.`,
    );
    continue;
  }
  if (!content.includes(AUTH_IMPORT)) {
    fail(
      `${relPath}: does not import getDb from "@/integrations/supabase/server-context" — expected every query in this file to be built off getDb() so it respects a request's authenticated scope when called from a server function.`,
    );
    continue;
  }
  pass(`${relPath}: uses getDb() (authenticated-aware), not the anonymous singleton`);
}

// --- Check 3: nlSearch must actually open the authenticated scope. ---
{
  const relPath = "src/lib/ai/nl-search.functions.ts";
  const content = read(relPath);
  const opensScope =
    content.includes("withAuthenticatedClient") && content.includes("context.supabase");
  if (!opensScope) {
    fail(
      `${relPath}: nlSearch's handler no longer calls withAuthenticatedClient(context.supabase, ...). Without this, every resolver it calls (resolveIntent's full call graph) silently falls back to the anonymous client again, regardless of how correct those resolvers' own logic is.`,
    );
  } else {
    pass(
      `${relPath}: nlSearch wraps its handler in withAuthenticatedClient(context.supabase, ...)`,
    );
  }
}

// --- Check 4: resolve.ts must not gain a new, unmigrated data source. ---
{
  const relPath = "src/lib/ai/nl-search/resolve.ts";
  const content = read(relPath);
  const importedApiPaths = [...content.matchAll(/from\s+"(@\/lib\/[^"]+\/api)"/g)].map((m) => m[1]);
  const knownApiModules = new Set(
    MIGRATED_FILES.filter((f) => f.endsWith("/api.ts")).map(
      (f) => "@/" + f.replace(/^src\//, "").replace(/\.ts$/, ""),
    ),
  );
  const unknown = importedApiPaths.filter((p) => !knownApiModules.has(p));
  if (unknown.length > 0) {
    fail(
      `${relPath}: imports data-access module(s) not covered by this guard: ${unknown.join(", ")}. If this is a genuinely new NL Search resolver, migrate it to getDb() (see integrations/supabase/server-context.ts) and add it to MIGRATED_FILES in scripts/verify-server-auth-context.mjs.`,
    );
  } else {
    pass(
      `${relPath}: every .../api module it imports is a known, migrated (authenticated-aware) data source`,
    );
  }
}

// --- Check 5: VIE server functions must open the authenticated scope. ---
{
  const relPath = "src/lib/vie/vie.functions.ts";
  const content = read(relPath);
  const opensScope =
    content.includes("withAuthenticatedClient") && content.includes("context.supabase");
  if (!opensScope) {
    fail(
      `${relPath}: no VIE server function calls withAuthenticatedClient(context.supabase, ...). Without this, every Planner resolver and Workflow Engine handler it calls (several layers deep) would silently fall back to the anonymous client, the same regression class check 3 guards for NL Search.`,
    );
  } else {
    pass(
      `${relPath}: VIE server functions wrap their handlers in withAuthenticatedClient(context.supabase, ...)`,
    );
  }
}

// --- Check 6: VIE Action Registry handlers must never write directly —
// only via an existing module's api.ts function (ADR-0001: "no parallel
// write path"). Scans the directory itself rather than a hardcoded list,
// so a newly-added handler is covered automatically. ---
{
  const actionsDir = "src/lib/vie/actions";
  let dirEntries;
  try {
    dirEntries = readdirSync(path.join(ROOT, actionsDir));
  } catch {
    fail(`${actionsDir}: could not read directory (has the Action Registry moved?)`);
    dirEntries = [];
  }

  const handlerFiles = dirEntries.filter(
    (f) => f.endsWith(".ts") && f !== "registry.ts" && f !== "index.ts" && !f.endsWith(".test.ts"),
  );

  if (dirEntries.length > 0 && handlerFiles.length === 0) {
    fail(
      `${actionsDir}: no handler files found alongside registry.ts/index.ts — has the naming convention changed?`,
    );
  }

  for (const file of handlerFiles) {
    const relPath = `${actionsDir}/${file}`;
    const content = read(relPath);

    const importsRawSupabase =
      content.includes('from "@supabase/supabase-js"') ||
      content.includes('from "@/integrations/supabase/client"') ||
      content.includes('from "@/integrations/supabase/server-context"');
    const importsExistingApiModule = /from\s+"@\/lib\/[^"]+\/api"/.test(content);

    if (importsRawSupabase) {
      fail(
        `${relPath}: imports a Supabase client directly. Action Registry handlers must call an existing module's api.ts function only (ADR-0001: "no parallel write path") — never write to a business table themselves. If this handler is missing a data-access function it needs, add it to the relevant module's api.ts first, then call it from here.`,
      );
      continue;
    }
    if (!importsExistingApiModule) {
      fail(
        `${relPath}: does not import any @/lib/*/api module. Every Action Registry handler must delegate its write to an existing, already-reviewed api.ts function — the same one the manual UI form for this action already calls.`,
      );
      continue;
    }
    pass(`${relPath}: delegates to an existing @/lib/*/api module, imports no raw Supabase client`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log("All server-auth-context checks passed.");
}
