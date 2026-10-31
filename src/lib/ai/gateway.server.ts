/**
 * AI gateway helper — server-only.
 *
 * Uses direct fetch (OpenAI-compatible chat completions) so we don't pull in
 * the AI SDK just for a few calls. Every AI feature routes through here.
 *
 * Supports:
 *  1. OpenRouter (process.env.OPENROUTER_API_KEY or site_settings)
 *  2. Google Gemini direct OpenAI-compatible endpoint (process.env.GEMINI_API_KEY or site_settings)
 *  3. Seamless Offline / Direct Database mode when no external API key is configured.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_OPENAI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GatewayOptions = {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
};

export interface AiConfig {
  key: string;
  provider: "openrouter" | "gemini";
  endpoint: string;
  defaultModel: string;
}

/** Queries process.env or site_settings in Supabase for a valid AI API key. */
export async function getEffectiveAiConfig(): Promise<AiConfig | null> {
  // 1. Process environment variables
  const openRouterEnv = process.env.OPENROUTER_API_KEY || process.env.AI_GATEWAY_API_KEY;
  if (openRouterEnv && openRouterEnv.trim()) {
    return {
      key: openRouterEnv.trim(),
      provider: "openrouter",
      endpoint: OPENROUTER_URL,
      defaultModel: "google/gemini-2.5-flash",
    };
  }

  const geminiEnv = process.env.GEMINI_API_KEY;
  if (geminiEnv && geminiEnv.trim()) {
    return {
      key: geminiEnv.trim(),
      provider: "gemini",
      endpoint: GEMINI_OPENAI_URL,
      defaultModel: "gemini-2.5-flash",
    };
  }

  // 2. Check site_settings table in Supabase
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabaseAdmin as any)
      .from("site_settings")
      .select("key, value")
      .in("key", ["openrouter_api_key", "gemini_api_key", "ai_api_key"]);

    if (Array.isArray(data)) {
      for (const row of data) {
        const val = typeof row.value === "string" ? row.value.trim() : "";
        if (val) {
          if (row.key === "gemini_api_key" || val.startsWith("AIza")) {
            return {
              key: val,
              provider: "gemini",
              endpoint: GEMINI_OPENAI_URL,
              defaultModel: "gemini-2.5-flash",
            };
          }
          return {
            key: val,
            provider: "openrouter",
            endpoint: OPENROUTER_URL,
            defaultModel: "google/gemini-2.5-flash",
          };
        }
      }
    }
  } catch {
    /* ignore DB lookup error */
  }

  return null;
}

export function getOfflineGuidanceMessage(): string {
  return [
    "👋 **Stoneman AI is active in Direct Database Search mode.**",
    "",
    "I can find and open live ERP records instantly without requiring an external AI service. Try asking me:",
    '• *"Quotation of Mehulbhai"* or *"Quote QUO-000025"*',
    '• *"Invoices for Dinesh"* or *"Unpaid invoices"*',
    '• *"Pending dispatches this week"*',
    '• *"Customer Ramesh"*',
    "",
    "⚙️ *To enable conversational AI & general workflow questions, configure an OpenRouter or Gemini API Key in Settings or via the key button in the Stoneman header.*",
  ].join("\n");
}

export async function chat(messages: ChatMessage[], opts: GatewayOptions = {}): Promise<string> {
  const config = await getEffectiveAiConfig();
  if (!config) {
    if (opts.jsonMode) {
      throw new Error("AI_NOT_CONFIGURED");
    }
    return getOfflineGuidanceMessage();
  }

  const model = opts.model ?? config.defaultModel;
  const body: Record<string, unknown> = {
    model,
    messages,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.key}`,
  };

  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://erp.stonetech.in";
    headers["X-Title"] = "Stone Tech OS";
  }

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit exceeded. Please try again shortly.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in your OpenRouter account to continue.");
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function chatJson<T = unknown>(
  messages: ChatMessage[],
  opts: Omit<GatewayOptions, "jsonMode"> = {},
): Promise<T> {
  const raw = await chat(messages, { ...opts, jsonMode: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Best-effort: extract JSON block from prose
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("AI returned non-JSON response");
  }
}
