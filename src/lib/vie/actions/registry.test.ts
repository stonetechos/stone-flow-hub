/**
 * Tests for the Action Registry (ADR-0001 §3/§4) — the plain intent ->
 * handler lookup table underlying every action handler test in this
 * directory. Pure in-memory logic, no I/O to mock.
 *
 * The registry's backing Map (registry.ts) is module-level, process-wide
 * singleton state with no reset between test files — unlike the mocked
 * modules in testSupport/moduleMocks.ts, which DO get resetAllModuleMocks()
 * between files, nothing here ever clears it. Every real VieIntent
 * ("log_enquiry", "note_followup", "create_customer", "create_quotation")
 * now has its own dedicated action-handler test file
 * (logEnquiry.test.ts/noteFollowup.test.ts/createCustomer.test.ts/
 * createQuotation.test.ts) that imports the real production handler module
 * for its own legitimate reasons, which self-registers under that exact
 * intent as a side effect. That means no real VieIntent value is ever safe
 * to use as an "unregistered" probe here again: whichever one is picked,
 * some other file in the same `bun test` process will have legitimately
 * registered it before or after this test runs, and bun's file-discovery
 * order is not guaranteed to be identical across machines/filesystems, so
 * this assertion's pass/fail became a coin flip that had nothing to do with
 * the registry's actual behavior. The fix is to probe a key that is
 * guaranteed to never be registered by any production code — a synthetic
 * value outside the real VieIntent union, cast the same way any other
 * deliberately-invalid-input test in this codebase does — rather than a
 * real intent that other files may or may not have touched yet.
 */
import { describe, expect, test } from "bun:test";
import { registerVieAction, getVieAction, type VieActionResult } from "./registry";
import type { VieIntent } from "../types";

describe("Action Registry", () => {
  test("an unregistered intent returns undefined", () => {
    // Deliberately not a real VieIntent — see the file header comment for
    // why every real intent value is now unsafe to use here.
    expect(getVieAction("__never_registered_intent__" as VieIntent)).toBeUndefined();
  });

  test("register then get returns the exact same handler function", () => {
    const handler = async (_params: Record<string, unknown>): Promise<VieActionResult> => ({
      linkedRecordType: "test",
      linkedRecordId: "id-1",
    });
    registerVieAction("log_enquiry", handler);
    expect(getVieAction("log_enquiry")).toBe(handler);
  });

  test("re-registering the same intent overwrites the previous handler", () => {
    const first = async (): Promise<VieActionResult> => ({
      linkedRecordType: "a",
      linkedRecordId: "1",
    });
    const second = async (): Promise<VieActionResult> => ({
      linkedRecordType: "b",
      linkedRecordId: "2",
    });
    registerVieAction("create_customer", first);
    registerVieAction("create_customer", second);
    expect(getVieAction("create_customer")).toBe(second);
  });
});
