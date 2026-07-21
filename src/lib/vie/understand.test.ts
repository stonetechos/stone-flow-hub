/**
 * understand() classification tests (VIE Phase 3 — Milestone 3: Expose
 * create_quotation to VIE). No test file existed for understand.ts before
 * this milestone — every other VIE layer (resolvers, planner, actions,
 * prompts) already had coverage, but understand.ts's own classification/
 * fallback logic (KNOWN_INTENTS membership, language fallback, confidence
 * clamping) did not. Adding it now is directly motivated by this
 * milestone's core change: KNOWN_INTENTS gained "create_quotation", and the
 * single most important thing to verify is that understand() actually
 * passes it through instead of silently falling back to "unsupported" the
 * way it would for any string KNOWN_INTENTS doesn't recognize.
 *
 * Mocks `@/lib/ai/gateway.server`'s `chatJson` via the shared, full-shape
 * `aiGatewayMock` in testSupport/moduleMocks.ts — see that file's header
 * for why a private, ad hoc mock.module() call for a new module would risk
 * repeating the cross-file pollution bug Milestone 3 (Phase 2) found and
 * fixed for `@/lib/customers/api`.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { aiGatewayMock, resetAllModuleMocks } from "./testSupport/moduleMocks";

const { understand } = await import("./understand");

describe("understand()", () => {
  beforeEach(() => {
    resetAllModuleMocks();
  });

  afterEach(() => {
    resetAllModuleMocks();
  });

  test("create_quotation is now a known intent — passes through instead of falling back to unsupported (the core change this milestone verifies)", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "create_quotation",
      language: "en",
      confidence: 0.85,
      canonicalText: "Create a new quotation for customer Ramesh.",
      entities: { customerName: "Ramesh" },
    }));

    const result = await understand("Create quotation for Ramesh.");

    expect(result.intent).toBe("create_quotation");
    expect(result.entities).toEqual({ customerName: "Ramesh" });
    expect(result.confidence).toBe(0.85);
    expect(result.language).toBe("en");
  });

  test.each(["log_enquiry", "note_followup", "create_customer"])(
    "%s remains a known intent and still passes through (regression)",
    async (intent) => {
      aiGatewayMock.chatJson.mockImplementation(async () => ({
        intent,
        language: "en",
        confidence: 0.9,
        canonicalText: "Some utterance.",
        entities: {},
      }));

      const result = await understand("Some utterance.");
      expect(result.intent).toBe(intent);
    },
  );

  test("an intent string KNOWN_INTENTS doesn't recognize falls back to unsupported", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "delete_everything",
      language: "en",
      confidence: 0.99,
      canonicalText: "Not a real intent.",
      entities: {},
    }));

    const result = await understand("Some utterance.");
    expect(result.intent).toBe("unsupported");
  });

  test("a missing intent field falls back to unsupported", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      language: "en",
      confidence: 0.5,
      canonicalText: "No intent field at all.",
      entities: {},
    }));

    const result = await understand("Some utterance.");
    expect(result.intent).toBe("unsupported");
  });

  test("an unrecognized language string falls back to 'unknown'", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "klingon",
      confidence: 0.5,
      canonicalText: "Whatever.",
      entities: {},
    }));

    const result = await understand("Some utterance.");
    expect(result.language).toBe("unknown");
  });

  test("confidence is clamped into [0, 1] — above 1 clamps down", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "en",
      confidence: 1.5,
      canonicalText: "Whatever.",
      entities: {},
    }));

    const result = await understand("Some utterance.");
    expect(result.confidence).toBe(1);
  });

  test("confidence is clamped into [0, 1] — below 0 clamps up", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "en",
      confidence: -0.3,
      canonicalText: "Whatever.",
      entities: {},
    }));

    const result = await understand("Some utterance.");
    expect(result.confidence).toBe(0);
  });

  test("a non-numeric confidence defaults to 0", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "en",
      confidence: "high" as unknown as number,
      canonicalText: "Whatever.",
      entities: {},
    }));

    const result = await understand("Some utterance.");
    expect(result.confidence).toBe(0);
  });

  test("a missing/blank canonicalText falls back to the raw input text", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "en",
      confidence: 0.5,
      canonicalText: "   ",
      entities: {},
    }));

    const result = await understand("The original utterance verbatim.");
    expect(result.canonicalText).toBe("The original utterance verbatim.");
  });

  test("originalText always carries the raw input verbatim, regardless of what the model returns", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "en",
      confidence: 0.5,
      canonicalText: "A gloss.",
      entities: {},
    }));

    const result = await understand("Ramesh ne 250 sqft Mint 145 ma joie che.");
    expect(result.originalText).toBe("Ramesh ne 250 sqft Mint 145 ma joie che.");
  });

  test("missing entities defaults to an empty object", async () => {
    aiGatewayMock.chatJson.mockImplementation(async () => ({
      intent: "unsupported",
      language: "en",
      confidence: 0.5,
      canonicalText: "Whatever.",
    }));

    const result = await understand("Some utterance.");
    expect(result.entities).toEqual({});
  });
});
