import { describe, expect, test } from "bun:test";
import { matchesSharedSecret } from "./shared-secret";

describe("matchesSharedSecret", () => {
  test("accepts the configured secret", () => {
    expect(matchesSharedSecret("cron-secret", "cron-secret")).toBe(true);
  });

  test("rejects missing, empty, incorrect, and different-length secrets", () => {
    expect(matchesSharedSecret(null, "cron-secret")).toBe(false);
    expect(matchesSharedSecret("", "cron-secret")).toBe(false);
    expect(matchesSharedSecret("wrong-secret", "cron-secret")).toBe(false);
    expect(matchesSharedSecret("short", "cron-secret")).toBe(false);
    expect(matchesSharedSecret("cron-secret", undefined)).toBe(false);
    expect(matchesSharedSecret("cron-secret", "")).toBe(false);
  });
});
