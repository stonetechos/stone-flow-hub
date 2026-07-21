/**
 * VIE Core — the ONLY function in this entire feature that calls the LLM.
 *
 * Produces a structured classification only: intent, raw entities, a
 * confidence score, detected language, and an English gloss. It never looks
 * at the database and never decides what ERP action to take — that is the
 * Planner's job (./planner). See ADR-0001 §2/§3.
 */
import { chatJson } from "@/lib/ai/gateway.server";
import { VIE_SYSTEM_PROMPT } from "./prompts";
import type { VieClassifiedIntent, VieLanguage, VieUnderstanding } from "./types";

const KNOWN_INTENTS: readonly VieClassifiedIntent[] = [
  "log_enquiry",
  "note_followup",
  "create_customer",
  "create_quotation",
  "unsupported",
];
const KNOWN_LANGUAGES: readonly VieLanguage[] = ["en", "hi", "gu", "mixed", "unknown"];

interface RawVieResponse {
  intent?: string;
  language?: string;
  confidence?: number;
  canonicalText?: string;
  entities?: Record<string, unknown>;
}

export async function understand(rawText: string): Promise<VieUnderstanding> {
  const result = await chatJson<RawVieResponse>(
    [
      { role: "system", content: VIE_SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    { temperature: 0 },
  );

  const intent: VieClassifiedIntent = KNOWN_INTENTS.includes(result.intent as VieClassifiedIntent)
    ? (result.intent as VieClassifiedIntent)
    : "unsupported";

  const language: VieLanguage = KNOWN_LANGUAGES.includes(result.language as VieLanguage)
    ? (result.language as VieLanguage)
    : "unknown";

  const confidence =
    typeof result.confidence === "number" && Number.isFinite(result.confidence)
      ? Math.min(1, Math.max(0, result.confidence))
      : 0;

  return {
    intent,
    entities: result.entities ?? {},
    confidence,
    language,
    originalText: rawText,
    canonicalText: result.canonicalText?.trim() || rawText,
  };
}
