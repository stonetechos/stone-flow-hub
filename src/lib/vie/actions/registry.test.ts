/**
 * Tests for the Action Registry (ADR-0001 §3/§4) — the plain intent ->
 * handler lookup table underlying every action handler test in this
 * directory. Pure in-memory logic, no I/O to mock.
 */
import { describe, expect, test } from "bun:test";
import { registerVieAction, getVieAction, type VieActionResult } from "./registry";

describe("Action Registry", () => {
  test("an unregistered intent returns undefined", () => {
    expect(getVieAction("note_followup")).toBeUndefined();
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
