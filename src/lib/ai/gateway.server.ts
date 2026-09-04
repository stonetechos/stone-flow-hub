/**
 * AI gateway helper — server-only.
 *
 * Uses direct fetch (OpenAI-compatible chat completions) so we don't pull in
 * the AI SDK just for a few calls. Every AI feature routes through here.
 *
 * Was Lovable's hosted AI Gateway (ai.gateway.lovable.dev, LOVABLE_API_KEY)
 * until the deploy-independence work — swapped to OpenRouter, which speaks
 * the same OpenAI-compatible chat-completions shape and the same model
 * naming (`google/gemini-2.5-flash` etc.), so this was a base-URL + auth
 * header change only, no call-site changes. See docs/DEPLOYMENT.md.
 */

const GATEWAY_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GatewayOptions = {
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
};

function apiKey(): string {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new Error("OPENROUTER_API_KEY is not configured");
  return k;
}

export async function chat(messages: ChatMessage[], opts: GatewayOptions = {}): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-2.5-flash",
    messages,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
      // OpenRouter uses these purely for their own analytics/rankings —
      // optional, but recommended by their docs and harmless to include.
      "HTTP-Referer": "https://erp.stonetech.in",
      "X-Title": "Stone Tech OS",
    },
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
