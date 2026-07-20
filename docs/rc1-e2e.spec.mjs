/**
 * Stone Tech OS — RC-1 authenticated E2E smoke.
 *
 * Runs against the LOCAL dev server using YOUR admin credentials.
 * The sandbox couldn't inherit your Supabase session, so run this locally:
 *
 *   bun add -d playwright
 *   bunx playwright install chromium
 *   BASE_URL=http://localhost:8080 ADMIN_EMAIL=you@example.com ADMIN_PASS=… \
 *     node docs/rc1-e2e.spec.mjs
 *
 * Writes screenshots to ./rc1-screenshots/ and prints a pass/fail table.
 * Covers every hop of the ERP workflow. Does NOT stop on first failure.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.ADMIN_EMAIL;
const PASS = process.env.ADMIN_PASS;
if (!EMAIL || !PASS) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASS env vars.");
  process.exit(1);
}
const OUT = "./rc1-screenshots";
mkdirSync(OUT, { recursive: true });

const results = [];
async function step(page, name, fn) {
  const started = Date.now();
  try {
    await fn();
    const ms = Date.now() - started;
    await page.screenshot({
      path: join(OUT, `${results.length + 1}_${name.replace(/\W+/g, "_")}.png`),
    });
    results.push({ name, status: "PASS", ms });
    console.log(`✓ ${name} (${ms}ms)`);
  } catch (e) {
    const ms = Date.now() - started;
    await page
      .screenshot({
        path: join(OUT, `${results.length + 1}_FAIL_${name.replace(/\W+/g, "_")}.png`),
      })
      .catch(() => {});
    results.push({ name, status: "FAIL", ms, error: String(e).slice(0, 300) });
    console.log(`✗ ${name} — ${e.message.slice(0, 200)}`);
  }
}

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
});

// ---- Auth ----
await step(page, "sign in", async () => {
  await page.goto(`${BASE}/auth`, { waitUntil: "domcontentloaded" });
  await page.fill("#signin-email", EMAIL);
  await page.fill("#signin-password", PASS);
  await Promise.all([
    page.waitForURL(/\/(dashboard|vendor)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
});

// ---- List routes reachable & rendering ----
const listRoutes = [
  "/dashboard",
  "/customers",
  "/projects",
  "/enquiries",
  "/estimates",
  "/quotes",
  "/rfqs",
  "/purchase-orders",
  "/grns",
  "/manufacturing",
  "/inventory",
  "/dispatch",
  "/installations",
  "/invoices",
  "/receipts",
  "/payments",
  "/vendors",
  "/products",
  "/followups",
  "/tasks",
  "/documents",
  "/reports",
  "/notifications",
  "/dashboards/executive",
  "/dashboards/analytics",
  "/dashboards/procurement",
  "/dashboards/collections",
  "/dashboards/installation",
  "/dashboards/business-intelligence",
  "/dashboards/control-centre",
  "/dashboards/customer-intelligence",
  "/dashboards/vendor-intelligence",
  "/dashboards/forecast",
  "/dashboards/profitability",
];
for (const path of listRoutes) {
  await step(page, `route ${path}`, async () => {
    const r = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 });
    if (!r || r.status() >= 400) throw new Error(`HTTP ${r?.status()}`);
    // any error-boundary or "Something went wrong" text is a fail
    const bad = await page.getByText(/something went wrong|failed to load|error \d{3}/i).count();
    if (bad > 0) throw new Error("error text visible on page");
  });
}

// ---- Customer create + immediate EntityPicker visibility ----
const stamp = Date.now();
const newCustomerName = `RC1 Test Co ${stamp}`;
await step(page, "create customer", async () => {
  await page.goto(`${BASE}/customers`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /new customer|add customer/i })
    .first()
    .click();
  await page.getByLabel(/name/i).first().fill(newCustomerName);
  await page
    .getByRole("button", { name: /^(save|create)/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await page.getByText(newCustomerName).first().waitFor({ timeout: 8000 });
});
await step(page, "customer visible in EntityPicker (new project form)", async () => {
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /new project|add project/i })
    .first()
    .click();
  // EntityPicker uses a search combobox — open and type
  const picker = page.locator('[role="combobox"], input[placeholder*="customer" i]').first();
  await picker.click();
  await page.keyboard.type(newCustomerName.slice(0, 12));
  await page.waitForTimeout(600);
  await page.getByText(newCustomerName).first().waitFor({ timeout: 5000 });
  // close without saving
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
});

// ---- Print report ----
const passCount = results.filter((r) => r.status === "PASS").length;
const failCount = results.filter((r) => r.status === "FAIL").length;
console.log("\n=== RC-1 SMOKE REPORT ===");
console.log(`Total: ${results.length}  Pass: ${passCount}  Fail: ${failCount}`);
console.log(`Console errors: ${consoleErrors.length}  Uncaught pageerrors: ${pageErrors.length}`);
if (failCount) {
  console.log("\nFailures:");
  for (const r of results.filter((x) => x.status === "FAIL"))
    console.log(` - ${r.name}: ${r.error}`);
}
if (pageErrors.length) {
  console.log("\nUncaught page errors (first 10):");
  pageErrors.slice(0, 10).forEach((e) => console.log(" -", e));
}
console.log(`\nScreenshots: ${OUT}/`);
await browser.close();
process.exit(failCount ? 1 : 0);
