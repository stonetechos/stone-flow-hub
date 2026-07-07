/**
 * Server-only outbound dispatcher.
 *
 * Reads provider config from `app_settings`, resolves credentials from
 * process.env secrets, honours the global TEST/LIVE mode toggle, and
 * emits `message_delivery_events` for every state transition.
 *
 * Providers:
 *  - email    → Resend REST (https://resend.com/api)
 *  - whatsapp → Meta WhatsApp Business Cloud (graph.facebook.com v20)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type Channel = "email" | "whatsapp" | "sms";

export interface DispatchResult {
  ok: boolean;
  providerMessageId?: string | null;
  error?: string;
  status?: number;
  raw?: Record<string, unknown> | null;
}

interface EmailCfg {
  provider?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  api_key_secret_name?: string; // defaults to RESEND_API_KEY
}
interface WaCfg {
  provider?: string;
  phone_number_id?: string;
  business_account_id?: string;
  verify_token?: string;
  access_token_secret_name?: string; // defaults to WHATSAPP_ACCESS_TOKEN
}
interface ModeCfg {
  mode?: "test" | "live";
  test_email?: string;
  test_phone?: string;
}

function pickSecret(name: string | undefined, fallback: string): string | undefined {
  const key = (name && name.trim()) || fallback;
  return process.env[key];
}

/** WhatsApp Graph API version — bumped centrally. */
const WA_GRAPH_VERSION = "v25.0";

/** Merge env-provided WhatsApp identifiers as fallbacks over app_settings. */
export function resolveWaCfg(cfg: WaCfg): WaCfg {
  return {
    ...cfg,
    phone_number_id: cfg.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID,
    business_account_id: cfg.business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    verify_token: cfg.verify_token || process.env.WHATSAPP_VERIFY_TOKEN,
  };
}

/** Send one email via Resend. */
export async function sendEmailViaResend(
  cfg: EmailCfg,
  to: string,
  subject: string,
  html: string,
): Promise<DispatchResult> {
  const apiKey = pickSecret(cfg.api_key_secret_name, "RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY secret not set" };
  if (!cfg.from_email) return { ok: false, error: "From email not configured" };

  const from = cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email;
  const body: Record<string, unknown> = { from, to: [to], subject, html };
  if (cfg.reply_to) body.reply_to = cfg.reply_to;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { id?: string; message?: string; name?: string };
  if (!res.ok) return { ok: false, status: res.status, error: json.message || json.name || `HTTP ${res.status}`, raw: json };
  return { ok: true, providerMessageId: json.id ?? null, raw: json };
}

/** Send one WhatsApp text message via Meta Cloud API. */
export async function sendWhatsappViaMeta(
  cfg: WaCfg,
  to: string,
  body: string,
): Promise<DispatchResult> {
  const c = resolveWaCfg(cfg);
  const token = pickSecret(c.access_token_secret_name, "WHATSAPP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "WHATSAPP_ACCESS_TOKEN secret not set" };
  if (!c.phone_number_id) return { ok: false, error: "Phone Number ID not configured" };

  const url = `https://graph.facebook.com/${WA_GRAPH_VERSION}/${encodeURIComponent(c.phone_number_id)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^0-9]/g, ""),
      type: "text",
      text: { body },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; type?: string };
  };
  if (!res.ok) {
    return { ok: false, status: res.status, error: json.error?.message || `HTTP ${res.status}`, raw: json };
  }
  return { ok: true, providerMessageId: json.messages?.[0]?.id ?? null, raw: json };
}

/** Send an approved WhatsApp template (e.g. Meta's `hello_world` sample). */
export async function sendWhatsappTemplate(
  cfg: WaCfg,
  to: string,
  templateName = "hello_world",
  languageCode = "en_US",
): Promise<DispatchResult> {
  const c = resolveWaCfg(cfg);
  const token = pickSecret(c.access_token_secret_name, "WHATSAPP_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "WHATSAPP_ACCESS_TOKEN secret not set" };
  if (!c.phone_number_id) return { ok: false, error: "Phone Number ID not configured" };
  const url = `https://graph.facebook.com/${WA_GRAPH_VERSION}/${encodeURIComponent(c.phone_number_id)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^0-9]/g, ""),
      type: "template",
      template: { name: templateName, language: { code: languageCode } },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; type?: string };
  };
  if (!res.ok) return { ok: false, status: res.status, error: json.error?.message || `HTTP ${res.status}`, raw: json };
  return { ok: true, providerMessageId: json.messages?.[0]?.id ?? null, raw: json };
}

async function getSettings(supabase: SupabaseClient) {
  const rows = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", ["notifications.email", "notifications.whatsapp", "communication.mode", "communication.whatsapp.status"]);
  const map = new Map<string, unknown>();
  for (const r of rows.data ?? []) map.set((r as { key: string }).key, (r as { value: unknown }).value);
  return {
    email: (map.get("notifications.email") ?? {}) as EmailCfg,
    whatsapp: (map.get("notifications.whatsapp") ?? {}) as WaCfg,
    mode: (map.get("communication.mode") ?? { mode: "test" }) as ModeCfg,
    whatsappStatus: (map.get("communication.whatsapp.status") ?? {}) as WhatsappStatus,
  };
}

export interface WhatsappStatus {
  last_send_at?: string;
  last_send_to?: string;
  last_send_wamid?: string;
  last_incoming_at?: string;
  last_incoming_from?: string;
  last_incoming_body?: string;
  last_incoming_wamid?: string;
  webhook_verified_at?: string;
}

/** Merge-patch the WhatsApp status singleton in app_settings. */
export async function updateWhatsappStatus(
  supabase: SupabaseClient,
  patch: Partial<WhatsappStatus>,
): Promise<void> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "communication.whatsapp.status").maybeSingle();
  const current = ((data as { value?: WhatsappStatus } | null)?.value ?? {}) as WhatsappStatus;
  const merged = { ...current, ...patch };
  await supabase.from("app_settings").upsert(
    { key: "communication.whatsapp.status", value: merged as unknown as Record<string, unknown> },
    { onConflict: "key" },
  );
}

/** Public: verify provider credentials with a small no-op call. */
export async function checkProvider(
  channel: Channel,
  supabase: SupabaseClient,
): Promise<{ ok: boolean; reason?: string }> {
  const s = await getSettings(supabase);
  if (channel === "email") {
    const key = pickSecret(s.email.api_key_secret_name, "RESEND_API_KEY");
    if (!key) return { ok: false, reason: "Missing RESEND_API_KEY secret" };
    if (!s.email.from_email) return { ok: false, reason: "From email not configured" };
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status === 401) return { ok: false, reason: "Invalid API key" };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true };
  }
  if (channel === "whatsapp") {
    const c = resolveWaCfg(s.whatsapp);
    const token = pickSecret(c.access_token_secret_name, "WHATSAPP_ACCESS_TOKEN");
    if (!token) return { ok: false, reason: "Missing WHATSAPP_ACCESS_TOKEN secret" };
    if (!c.phone_number_id) return { ok: false, reason: "Phone Number ID not configured" };
    const url = `https://graph.facebook.com/${WA_GRAPH_VERSION}/${encodeURIComponent(c.phone_number_id)}?fields=display_phone_number,verified_name`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "Invalid access token" };
    if (res.status === 404) return { ok: false, reason: "Invalid Phone Number ID" };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true };
  }
  return { ok: false, reason: "Unsupported channel" };
}

/**
 * Full WhatsApp connection test: validates the access token, phone number ID,
 * WABA ID, and messaging endpoint reachability.
 */
export async function runWhatsappConnectionTest(
  supabase: SupabaseClient,
): Promise<{
  ok: boolean;
  checks: {
    access_token: { ok: boolean; detail?: string };
    phone_number_id: { ok: boolean; detail?: string };
    business_account_id: { ok: boolean; detail?: string };
    messaging_endpoint: { ok: boolean; detail?: string };
  };
}> {
  const s = await getSettings(supabase);
  const c = resolveWaCfg(s.whatsapp);
  const token = pickSecret(c.access_token_secret_name, "WHATSAPP_ACCESS_TOKEN");
  const checks = {
    access_token: { ok: false } as { ok: boolean; detail?: string },
    phone_number_id: { ok: false } as { ok: boolean; detail?: string },
    business_account_id: { ok: false } as { ok: boolean; detail?: string },
    messaging_endpoint: { ok: false } as { ok: boolean; detail?: string },
  };

  if (!token) { checks.access_token.detail = "Missing WHATSAPP_ACCESS_TOKEN secret"; return { ok: false, checks }; }
  checks.access_token.ok = true;

  if (!c.phone_number_id) checks.phone_number_id.detail = "Not configured";
  else {
    const r = await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${encodeURIComponent(c.phone_number_id)}?fields=display_phone_number,verified_name`, { headers: { Authorization: `Bearer ${token}` } });
    const j = (await r.json().catch(() => ({}))) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } };
    if (r.status === 401 || r.status === 403) { checks.access_token.ok = false; checks.access_token.detail = "Invalid access token"; }
    else if (r.status === 404) { checks.phone_number_id.detail = "Invalid Phone Number ID"; }
    else if (!r.ok) { checks.phone_number_id.detail = j.error?.message || `HTTP ${r.status}`; }
    else { checks.phone_number_id.ok = true; checks.phone_number_id.detail = `${j.verified_name ?? ""} ${j.display_phone_number ?? ""}`.trim(); checks.messaging_endpoint.ok = true; checks.messaging_endpoint.detail = "Reachable"; }
  }

  if (!c.business_account_id) checks.business_account_id.detail = "Not configured";
  else {
    const r = await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${encodeURIComponent(c.business_account_id)}?fields=name,timezone_id`, { headers: { Authorization: `Bearer ${token}` } });
    const j = (await r.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
    if (r.status === 404) checks.business_account_id.detail = "Invalid WABA ID";
    else if (!r.ok) checks.business_account_id.detail = j.error?.message || `HTTP ${r.status}`;
    else { checks.business_account_id.ok = true; checks.business_account_id.detail = j.name ?? "OK"; }
  }

  const ok = checks.access_token.ok && checks.phone_number_id.ok && checks.business_account_id.ok && checks.messaging_endpoint.ok;
  return { ok, checks };
}

/** Public: send a one-off test message honouring TEST/LIVE mode. */
export async function sendTest(
  channel: Channel,
  supabase: SupabaseClient,
  override?: { to?: string; subject?: string; body?: string },
): Promise<DispatchResult> {
  const s = await getSettings(supabase);
  const isTest = (s.mode.mode ?? "test") === "test";
  const subject = override?.subject ?? "Stone Tech OS — Test message";
  const body = override?.body ?? "This is a test message from Stone Tech OS. If you received it, delivery is configured correctly.";
  if (channel === "email") {
    const to = isTest ? (s.mode.test_email || override?.to) : override?.to;
    if (!to) return { ok: false, error: "No recipient — set test_email in Communication settings or pass a to override." };
    return sendEmailViaResend(s.email, to, subject, `<p>${body}</p>`);
  }
  if (channel === "whatsapp") {
    const to = isTest ? (s.mode.test_phone || override?.to) : override?.to;
    if (!to) return { ok: false, error: "No recipient — set test_phone in Communication settings or pass a to override." };
    return sendWhatsappViaMeta(s.whatsapp, to, body);
  }
  return { ok: false, error: "Unsupported channel" };
}

/**
 * Process one batch of the queue. Returns how many messages were attempted.
 * Idempotent — safe to call repeatedly. Meant to be invoked by an external
 * scheduler (see `/api/public/hooks/dispatch-queue`).
 */
export async function dispatchQueueBatch(
  supabase: SupabaseClient,
  batchSize = 25,
): Promise<{ attempted: number; sent: number; failed: number }> {
  const s = await getSettings(supabase);
  const isTest = (s.mode.mode ?? "test") === "test";
  const now = new Date().toISOString();

  const { data: rows } = await supabase
    .from("message_queue")
    .select("*")
    .in("status", ["queued", "retrying"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  const list = (rows ?? []) as Array<{
    id: string;
    channel: Channel;
    to_address: string;
    subject: string | null;
    body: string;
    attempts: number;
    max_attempts: number;
  }>;

  let sent = 0;
  let failed = 0;

  for (const m of list) {
    // Mark sending
    await supabase.from("message_queue").update({ status: "sending" }).eq("id", m.id);

    const redirectedTo =
      isTest && m.channel === "email" ? s.mode.test_email || m.to_address :
      isTest && m.channel === "whatsapp" ? s.mode.test_phone || m.to_address :
      m.to_address;

    let res: DispatchResult;
    try {
      if (m.channel === "email") {
        res = await sendEmailViaResend(s.email, redirectedTo, m.subject ?? "(no subject)", m.body);
      } else if (m.channel === "whatsapp") {
        res = await sendWhatsappViaMeta(s.whatsapp, redirectedTo, m.body);
      } else {
        res = { ok: false, error: `Channel ${m.channel} not implemented` };
      }
    } catch (err) {
      res = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    const attempts = m.attempts + 1;
    if (res.ok) {
      sent++;
      await supabase.from("message_queue").update({
        status: "sent",
        attempts,
        provider_message_id: res.providerMessageId ?? null,
        sent_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", m.id);
      await supabase.from("message_delivery_events").insert({
        message_id: m.id,
        event: "sent",
        provider: m.channel === "email" ? "resend" : "meta_cloud",
        provider_ref: res.providerMessageId ?? null,
        payload: (res.raw ?? {}) as never,
      });
      if (m.channel === "whatsapp") {
        await updateWhatsappStatus(supabase, {
          last_send_at: new Date().toISOString(),
          last_send_to: redirectedTo,
          last_send_wamid: res.providerMessageId ?? undefined,
        });
      }
    } else {
      failed++;
      const done = attempts >= m.max_attempts;
      const backoffMs = Math.min(60 * 60_000, 60_000 * 2 ** Math.min(attempts, 6)); // 1m, 2m, 4m, ...
      await supabase.from("message_queue").update({
        status: done ? "failed" : "retrying",
        attempts,
        last_error: res.error ?? "Unknown error",
        failed_reason: done ? (res.error ?? "Max attempts reached") : null,
        next_retry_at: done ? null : new Date(Date.now() + backoffMs).toISOString(),
      }).eq("id", m.id);
      await supabase.from("message_delivery_events").insert({
        message_id: m.id,
        event: done ? "failed" : "retry_scheduled",
        provider: m.channel === "email" ? "resend" : "meta_cloud",
        provider_ref: null,
        payload: { error: res.error, status: res.status } as never,
      });
    }
  }

  return { attempted: list.length, sent, failed };
}
