/**
 * Canonical specification for execution-policy behaviour (Milestone 1 —
 * Hardening & Guardrails). resolveEffectiveMode() is the single function
 * that decides whether a VIE action executes without a human in the loop —
 * every combination of policy mode, confidence, and blockers it can
 * possibly see is pinned here. Any future change to this function's
 * behaviour must be reflected in these tests first. Run with `bun test`.
 */
import { describe, expect, test } from "bun:test";
import { resolveEffectiveMode } from "./index";
import type { PlannerBlocker, VieExecutionPolicy } from "../types";

/** Minimal, valid PlannerBlocker fixture — resolveEffectiveMode() only ever
 *  cares about array length, never a blocker's contents, so these tests
 *  don't need realistic field values. Sprint AI-1.5: `blockers` is now
 *  `PlannerBlocker[]` instead of `string[]`; this function's own logic —
 *  `blockers.length > 0` — is completely unchanged, so only the literal
 *  test fixtures below needed retyping. */
const blocker = (message: string): PlannerBlocker => ({
  id: "x",
  type: "text_required",
  message,
  field: "x",
  required: true,
});

const auto = (autoThreshold = 0.85): VieExecutionPolicy => ({ mode: "auto", autoThreshold });
const confirmPolicy = (autoThreshold = 0.85): VieExecutionPolicy => ({
  mode: "confirm",
  autoThreshold,
});
const draftPolicy = (autoThreshold = 0.85): VieExecutionPolicy => ({
  mode: "draft",
  autoThreshold,
});

describe("resolveEffectiveMode", () => {
  describe("blockers always force draft, regardless of policy or confidence", () => {
    test("auto policy + high confidence + a blocker -> draft", () => {
      expect(resolveEffectiveMode(auto(), 0.99, [blocker("ambiguous customer")])).toBe("draft");
    });

    test("confirm policy + a blocker -> draft", () => {
      expect(resolveEffectiveMode(confirmPolicy(), 0.99, [blocker("ambiguous customer")])).toBe(
        "draft",
      );
    });

    test("draft policy + a blocker -> draft (already the ceiling)", () => {
      expect(resolveEffectiveMode(draftPolicy(), 0.99, [blocker("ambiguous customer")])).toBe(
        "draft",
      );
    });

    test("more than one blocker still just needs length > 0 -> draft", () => {
      expect(
        resolveEffectiveMode(auto(), 0.99, [blocker("blocker one"), blocker("blocker two")]),
      ).toBe("draft");
    });
  });

  describe("policy mode = auto, no blockers", () => {
    test("confidence above threshold -> auto", () => {
      expect(resolveEffectiveMode(auto(0.85), 0.9, [])).toBe("auto");
    });

    test("confidence exactly at threshold -> auto (inclusive boundary)", () => {
      expect(resolveEffectiveMode(auto(0.85), 0.85, [])).toBe("auto");
    });

    test("confidence just below threshold -> downgrades one step to confirm, never to draft", () => {
      expect(resolveEffectiveMode(auto(0.85), 0.5, [])).toBe("confirm");
    });

    test("confidence of exactly 0 with a non-zero threshold -> confirm", () => {
      expect(resolveEffectiveMode(auto(0.85), 0, [])).toBe("confirm");
    });

    test("confidence of exactly 1 -> auto regardless of how high the threshold is", () => {
      expect(resolveEffectiveMode(auto(0.99), 1, [])).toBe("auto");
    });

    test("autoThreshold of 0 -> any confidence auto-executes", () => {
      expect(resolveEffectiveMode(auto(0), 0, [])).toBe("auto");
    });

    test("autoThreshold of 1 -> only a perfect-confidence classification auto-executes", () => {
      expect(resolveEffectiveMode(auto(1), 0.999, [])).toBe("confirm");
      expect(resolveEffectiveMode(auto(1), 1, [])).toBe("auto");
    });
  });

  describe("policy mode = confirm, no blockers — a ceiling, never upgraded by confidence", () => {
    test("low confidence -> confirm", () => {
      expect(resolveEffectiveMode(confirmPolicy(), 0.1, [])).toBe("confirm");
    });

    test("very high confidence -> still confirm, never auto", () => {
      expect(resolveEffectiveMode(confirmPolicy(), 0.999, [])).toBe("confirm");
    });
  });

  describe("policy mode = draft, no blockers — a ceiling, never upgraded by confidence", () => {
    test("low confidence -> draft", () => {
      expect(resolveEffectiveMode(draftPolicy(), 0.1, [])).toBe("draft");
    });

    test("very high confidence -> still draft, never auto or confirm", () => {
      expect(resolveEffectiveMode(draftPolicy(), 0.999, [])).toBe("draft");
    });
  });
});
