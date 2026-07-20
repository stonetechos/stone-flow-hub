/**
 * Shared test utilities for VIE (Milestone 1 — Hardening & Guardrails).
 *
 * Extracted because both entity-schema test suites added in this milestone
 * (logEnquiryEntitiesSchema, noteFollowupEntitiesSchema — see types.test.ts)
 * needed the same two things: a safeParse-and-assert boilerplate, and a
 * "valid baseline payload + override one field" fixture per intent. Every
 * future VIE intent's entity schema should get its own fixture builder here
 * and reuse expectValidEntities/expectInvalidEntities rather than
 * re-deriving either — that duplication is exactly what this file removes.
 *
 * Lives under src/lib/vie/testSupport/ — the project's standard location
 * for reusable testing helpers (as opposed to test files themselves, which
 * stay colocated beside the production code they test, e.g. types.test.ts
 * next to types.ts). This module is covered by tsconfig.test.json, the
 * dedicated compiler context for test code — see that file and
 * docs/TESTING.md for why it's isolated from the production tsconfig.json.
 *
 * Not a test file itself (no `.test.ts` suffix, so `bun test` won't try to
 * run it directly) — it's imported BY test files, the same way a
 * custom-matchers/test-helpers module works in other test frameworks.
 */
import { expect } from "bun:test";
import type { ZodType } from "zod";
import type { CreateCustomerEntities, LogEnquiryEntities, NoteFollowupEntities } from "../types";

/** Asserts `input` satisfies `schema` and returns the parsed value so a test
 *  can make further assertions on it (e.g. a specific field's value). */
export function expectValidEntities<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  expect(result.success).toBe(true);
  return result.success ? result.data : (undefined as T);
}

/** Asserts `input` is rejected by `schema` — used for every "this malformed
 *  AI output must not reach the Planner" case. */
export function expectInvalidEntities(schema: ZodType<unknown>, input: unknown): void {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
}

/** A fully-populated, valid log_enquiry entities payload, matching
 *  prompts.ts's own few-shot example — override individual fields per test
 *  case instead of re-typing the whole shape each time. */
export function validLogEnquiryEntities(
  overrides: Partial<Record<keyof LogEnquiryEntities, unknown>> = {},
): Record<string, unknown> {
  return {
    customerName: "Ramesh",
    productText: "Mint",
    quantity: 250,
    unit: "sqft",
    rate: 145,
    ...overrides,
  };
}

/** A fully-populated, valid note_followup entities payload, matching
 *  prompts.ts's own few-shot example. */
export function validNoteFollowupEntities(
  overrides: Partial<Record<keyof NoteFollowupEntities, unknown>> = {},
): Record<string, unknown> {
  return {
    targetName: "Ramesh",
    note: "Customer rejected the offer - price too high",
    relativeDays: 3,
    channel: "call",
    ...overrides,
  };
}

/** A fully-populated, valid create_customer entities payload, matching
 *  prompts.ts's own few-shot example (VIE Phase 2 — Milestone 2). */
export function validCreateCustomerEntities(
  overrides: Partial<Record<keyof CreateCustomerEntities, unknown>> = {},
): Record<string, unknown> {
  return {
    customerName: "Meera",
    mobile: "9724455663",
    city: "Surat",
    customerType: "contractor",
    ...overrides,
  };
}
