/**
 * Prompt few-shot coverage tests (VIE Phase 2 — Milestone 3: Validation &
 * Coverage; extended in Phase 3 — Milestone 3: Expose create_quotation to
 * VIE). VIE_SYSTEM_PROMPT is a plain string sent verbatim to the LLM —
 * there is no function to unit-test in the usual sense, so these tests
 * instead pin the prompt's STATIC, checkable properties: that its own
 * documented output contract is internally consistent (every real intent
 * appears in the JSON shape it tells the model to return), that every
 * few-shot example is valid JSON whose `entities` actually parses against
 * the same Zod schema the Planner will validate real LLM output against,
 * and that the boundary cases VIE-CreateCustomer-UX-Contract.md and
 * VIE-CreateQuotation-UX-Contract.md call out as important are represented
 * by at least one example.
 *
 * Found and fixed one genuine defect while writing these (Milestone 3,
 * Phase 2): the prompt's own "Return STRICT JSON" shape block listed only
 * `"log_enquiry" | "note_followup" | "unsupported"` for the "intent" field —
 * omitting "create_customer" even though the classification rules two lines
 * above it, and two of the file's own few-shot examples, both already use
 * it. An LLM given a documented output enum that's missing a value it's
 * also shown examples of is exactly the kind of internal contradiction that
 * causes unpredictable classification drift in production; fixed here by
 * adding "create_customer" to the documented shape (see prompts.ts).
 *
 * Phase 3 Milestone 3 removed the temporary STAGED_INTENTS exception this
 * file carried during Milestone 2 (Planner Integration): now that
 * create_quotation has real few-shot coverage (prompts.ts) and understand.ts
 * actually classifies it (KNOWN_INTENTS), every check below applies to it
 * like any other intent again — no more staging needed.
 */
import { describe, expect, test } from "bun:test";
import type { ZodTypeAny } from "zod";
import { VIE_SYSTEM_PROMPT } from "./prompts";
import {
  VIE_INTENTS,
  createCustomerEntitiesSchema,
  createQuotationEntitiesSchema,
  logEnquiryEntitiesSchema,
  noteFollowupEntitiesSchema,
  type VieClassifiedIntent,
} from "./types";

interface ParsedExample {
  utterance: string;
  intent: string;
  language: string;
  confidence: number;
  entities: Record<string, unknown>;
}

/** Every "..." -> {...} line in the prompt's Examples section. */
function parseExamples(prompt: string): ParsedExample[] {
  const lines = prompt.split("\n").filter((l) => l.includes('" -> {'));
  return lines.map((line) => {
    const arrowIndex = line.indexOf(" -> ");
    const utterancePart = line.slice(0, arrowIndex).trim();
    const jsonPart = line.slice(arrowIndex + 4).trim();
    const utterance = utterancePart.slice(1, -1); // strip surrounding quotes
    const parsed = JSON.parse(jsonPart) as {
      intent: string;
      language: string;
      confidence: number;
      canonicalText: string;
      entities: Record<string, unknown>;
    };
    return {
      utterance,
      intent: parsed.intent,
      language: parsed.language,
      confidence: parsed.confidence,
      entities: parsed.entities,
    };
  });
}

const ENTITY_SCHEMAS: Record<string, ZodTypeAny | undefined> = {
  log_enquiry: logEnquiryEntitiesSchema,
  note_followup: noteFollowupEntitiesSchema,
  create_customer: createCustomerEntitiesSchema,
  create_quotation: createQuotationEntitiesSchema,
};

describe("VIE_SYSTEM_PROMPT — internal consistency", () => {
  test("the documented JSON 'intent' shape lists every real VieIntent plus 'unsupported'", () => {
    const shapeLineMatch = VIE_SYSTEM_PROMPT.match(/"intent":\s*("[^\n]+")/);
    expect(shapeLineMatch).not.toBeNull();
    const shapeLine = shapeLineMatch![1];
    for (const intent of VIE_INTENTS) {
      expect(shapeLine).toContain(`"${intent}"`);
    }
    expect(shapeLine).toContain('"unsupported"');
  });

  test("the classification list (the '- \"intent\" — ...' bullets) documents every real VieIntent plus 'unsupported'", () => {
    const allIntents: VieClassifiedIntent[] = [...VIE_INTENTS, "unsupported"];
    for (const intent of allIntents) {
      expect(VIE_SYSTEM_PROMPT).toContain(`"${intent}"`);
    }
  });

  test("every intent with entities documents its own '\"intent\", entities may include' block", () => {
    for (const intent of VIE_INTENTS) {
      expect(VIE_SYSTEM_PROMPT).toContain(`For "${intent}", entities may include:`);
    }
  });
});

describe("VIE_SYSTEM_PROMPT — few-shot examples are well-formed and schema-valid", () => {
  const examples = parseExamples(VIE_SYSTEM_PROMPT);

  test("at least one example exists for every real intent and for 'unsupported'", () => {
    const seenIntents = new Set(examples.map((e) => e.intent));
    for (const intent of VIE_INTENTS) {
      expect(seenIntents.has(intent)).toBe(true);
    }
    expect(seenIntents.has("unsupported")).toBe(true);
  });

  test("every example's intent is one VIE actually classifies (KNOWN_INTENTS in understand.ts)", () => {
    const known = new Set<string>([...VIE_INTENTS, "unsupported"]);
    for (const example of examples) {
      expect(known.has(example.intent)).toBe(true);
    }
  });

  test("every example's language is one of the five VieLanguage values", () => {
    const known = new Set(["en", "hi", "gu", "mixed", "unknown"]);
    for (const example of examples) {
      expect(known.has(example.language)).toBe(true);
    }
  });

  test("every example's confidence is within [0, 1]", () => {
    for (const example of examples) {
      expect(example.confidence).toBeGreaterThanOrEqual(0);
      expect(example.confidence).toBeLessThanOrEqual(1);
    }
  });

  test("every example's entities parse against the real Zod schema the Planner will validate it with", () => {
    for (const example of examples) {
      const schema = ENTITY_SCHEMAS[example.intent];
      if (!schema) continue; // "unsupported" has no entity schema
      const result = schema.safeParse(example.entities);
      expect(
        result.success,
        `Example "${example.utterance}" (${example.intent}) has entities that fail its own schema: ${
          result.success ? "" : JSON.stringify(result.error.issues)
        }`,
      ).toBe(true);
    }
  });
});

describe("VIE_SYSTEM_PROMPT — UX-contract boundary case coverage", () => {
  const examples = parseExamples(VIE_SYSTEM_PROMPT);

  test("§3: an existing-customer detail change is 'unsupported', not create_customer", () => {
    const example = examples.find((e) => /switched his number/.test(e.utterance));
    expect(example?.intent).toBe("unsupported");
  });

  test("§3: a lookup/existence question is 'unsupported', not create_customer", () => {
    const example = examples.find((e) => /Do we have a customer/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("unsupported");
  });

  test("§4: create_customer is still valid with a name only, no mobile", () => {
    const example = examples.find((e) => /Register Kiran Patel/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_customer");
    expect(example?.entities.mobile).toBeUndefined();
  });

  test("§13: two names in one utterance -> only the first-mentioned name is extracted", () => {
    const example = examples.find((e) => /Ramesh and Suresh/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_customer");
    expect(example?.entities.customerName).toBe("Ramesh");
  });

  test("log_enquiry dominance: a name + product/quantity/rate utterance is log_enquiry, never create_customer, even for an implied-new customer", () => {
    const example = examples.find((e) => /250 sqft Mint at 145/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("log_enquiry");
  });

  test("note_followup examples include at least one with a targetName (a gap in the original few-shot set)", () => {
    const withTarget = examples.filter(
      (e) => e.intent === "note_followup" && typeof e.entities.targetName === "string",
    );
    expect(withTarget.length).toBeGreaterThan(0);
  });

  test("create_quotation: a bare 'create quotation for <name>' utterance classifies create_quotation with only a customerName", () => {
    const example = examples.find((e) => /Create quotation for Ramesh/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_quotation");
    expect(example?.entities.customerName).toBe("Ramesh");
  });

  test("create_quotation: a quote naming a project (not a customer) extracts projectText", () => {
    const example = examples.find((e) => /Shah project/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_quotation");
    expect(example?.entities.projectText).toBe("Shah project");
  });

  test("create_quotation: multiple products in one utterance extract multiple line items, not just one", () => {
    const example = examples.find((e) => /Mint and Kadappa/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_quotation");
    const items = example?.entities.items as Array<{ productText: string }> | undefined;
    expect(items?.length).toBe(2);
    expect(items?.map((i) => i.productText)).toEqual(["Mint", "Kadappa"]);
  });

  test("create_quotation: an installation modifier extracts a real QUOTE_CATEGORIES value, not invented text", () => {
    const example = examples.find((e) => /with installation/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_quotation");
    expect(example?.entities.category).toBe("supply_and_installation");
  });

  test("create_quotation: two customer names in one utterance -> only the first-mentioned name is extracted (mirrors create_customer's own rule)", () => {
    const example = examples.find((e) => /Quote for Ramesh and Suresh/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("create_quotation");
    expect(example?.entities.customerName).toBe("Ramesh");
  });

  test("create_quotation: an unanswerable pricing request is 'unsupported', not a token create_quotation attempt", () => {
    const example = examples.find((e) => /What should I charge/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("unsupported");
  });

  test("create_quotation: editing an existing quotation is 'unsupported', never create_quotation", () => {
    const example = examples.find((e) => /Update the quote for Ramesh/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("unsupported");
  });

  test("log_enquiry dominance still holds for create_quotation: a stated price with no quoting verb stays log_enquiry, never create_quotation", () => {
    const example = examples.find((e) => /250 sqft Mint at 145/.test(e.utterance));
    expect(example).toBeDefined();
    expect(example?.intent).toBe("log_enquiry");
  });
});
