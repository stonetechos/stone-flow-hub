/**
 * VIE entity-schema tests (Milestone 1 — Hardening & Guardrails).
 *
 * These pin the actual validation behaviour of every existing per-intent
 * entity schema against well-formed, malformed, and partial LLM output —
 * the last line of defense before an ambiguous or malformed classification
 * reaches the Planner (see planner/index.ts's `.parse()` calls, now wrapped
 * by vie.functions.ts's classified error handling on top of this). Run with
 * `bun test`.
 */
import { describe, expect, test } from "bun:test";
import { logEnquiryEntitiesSchema, noteFollowupEntitiesSchema } from "./types";
import {
  expectValidEntities,
  expectInvalidEntities,
  validLogEnquiryEntities,
  validNoteFollowupEntities,
} from "./testSupport/testUtils";

describe("logEnquiryEntitiesSchema", () => {
  test("accepts a fully-populated, well-formed AI response", () => {
    const parsed = expectValidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities());
    expect(parsed.customerName).toBe("Ramesh");
    expect(parsed.quantity).toBe(250);
  });

  test("has no required fields — an empty object is valid on its own", () => {
    // Documented behaviour, not an oversight: every field is optional
    // because a partial extraction (e.g. no rate mentioned) must still
    // reach the Planner rather than be rejected outright — the Planner's
    // blocker logic decides what to do with missing fields, not the schema.
    expectValidEntities(logEnquiryEntitiesSchema, {});
  });

  test("accepts a partial AI response with only some fields present", () => {
    expectValidEntities(logEnquiryEntitiesSchema, { customerName: "Ramesh" });
  });

  test("rejects a non-positive quantity", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ quantity: -5 }));
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ quantity: 0 }));
  });

  test("rejects a quantity given as a string instead of a number", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ quantity: "250" }));
  });

  test("rejects an empty customerName", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ customerName: "" }));
  });

  test("rejects a whitespace-only customerName (trimmed to empty)", () => {
    expectInvalidEntities(
      logEnquiryEntitiesSchema,
      validLogEnquiryEntities({ customerName: "   " }),
    );
  });

  test("rejects a non-positive rate", () => {
    expectInvalidEntities(logEnquiryEntitiesSchema, validLogEnquiryEntities({ rate: -145 }));
  });

  test("silently strips an unexpected/unknown field rather than rejecting the whole payload", () => {
    // Zod objects strip unknown keys by default (no .strict() on this
    // schema) — one extra, unrecognized field from the LLM must never fail
    // understanding entirely.
    const parsed = expectValidEntities(logEnquiryEntitiesSchema, {
      ...validLogEnquiryEntities(),
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });
});

describe("noteFollowupEntitiesSchema", () => {
  test("accepts a fully-populated, well-formed AI response", () => {
    const parsed = expectValidEntities(noteFollowupEntitiesSchema, validNoteFollowupEntities());
    expect(parsed.note).toBe("Customer rejected the offer - price too high");
  });

  test("accepts the minimal valid payload — note only (its one required field)", () => {
    expectValidEntities(noteFollowupEntitiesSchema, { note: "General follow-up" });
  });

  test("rejects a payload missing the required `note` field", () => {
    expectInvalidEntities(noteFollowupEntitiesSchema, { targetName: "Ramesh", relativeDays: 3 });
  });

  test("rejects an empty `note`", () => {
    expectInvalidEntities(noteFollowupEntitiesSchema, validNoteFollowupEntities({ note: "" }));
  });

  test("rejects `note` given as a non-string type", () => {
    expectInvalidEntities(noteFollowupEntitiesSchema, validNoteFollowupEntities({ note: 123 }));
  });

  test("rejects a negative relativeDays", () => {
    expectInvalidEntities(
      noteFollowupEntitiesSchema,
      validNoteFollowupEntities({ relativeDays: -1 }),
    );
  });

  test("rejects a non-integer relativeDays", () => {
    expectInvalidEntities(
      noteFollowupEntitiesSchema,
      validNoteFollowupEntities({ relativeDays: 2.5 }),
    );
  });

  test("rejects a channel outside the known enum", () => {
    expectInvalidEntities(
      noteFollowupEntitiesSchema,
      validNoteFollowupEntities({ channel: "sms" }),
    );
  });

  test("accepts a partial AI response matching the prompt's own few-shot example (note + relativeDays only)", () => {
    expectValidEntities(noteFollowupEntitiesSchema, { note: "General follow-up", relativeDays: 3 });
  });

  test("silently strips an unexpected/unknown field rather than rejecting the whole payload", () => {
    const parsed = expectValidEntities(noteFollowupEntitiesSchema, {
      ...validNoteFollowupEntities(),
      someUnexpectedField: "xyz",
    });
    expect((parsed as Record<string, unknown>).someUnexpectedField).toBeUndefined();
  });
});
