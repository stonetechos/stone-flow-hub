#!/usr/bin/env node
/**
 * Builds the JSON payload for `wrangler secret bulk`, read from this
 * process's own env (populated from GitHub Actions repo secrets by
 * .github/workflows/deploy.yml). Only server-side runtime secrets belong
 * here — client VITE_* vars are baked in at build time instead, not set as
 * Worker secrets.
 *
 * Unset/empty optional secrets are silently dropped rather than written as
 * empty strings, so a fresh repo that hasn't configured e.g. Razorpay yet
 * doesn't fail the deploy or wipe an existing Worker secret set by hand.
 * Required secrets are still emitted even if empty, so `wrangler secret
 * bulk` — not this script — is the one that surfaces a clear failure for a
 * genuinely missing required secret.
 */
const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "OPENROUTER_API_KEY",
  "RESEND_API_KEY",
  "SUPABASE_AUTH_HOOK_SECRET",
];

const OPTIONAL = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  // TRANSITIONAL — src/routes/lovable/email/* (the old Lovable-relay auth
  // webhook + sender) still reads this directly and is kept running until
  // Supabase's Auth "Send Email" hook is manually repointed at the new
  // /api/public/hooks/auth-email endpoint and verified (see
  // docs/DEPLOYMENT.md and the deploy-independence runbook). Safe to
  // delete this line — and the src/routes/lovable/ directory, and the
  // @lovable.dev/email-js + @lovable.dev/webhooks-js deps — once that
  // cutover is confirmed.
  "LOVABLE_API_KEY",
];

const payload = {};
for (const key of REQUIRED) {
  payload[key] = process.env[key] ?? "";
}
for (const key of OPTIONAL) {
  const v = process.env[key];
  if (v) payload[key] = v;
}

process.stdout.write(JSON.stringify(payload));
