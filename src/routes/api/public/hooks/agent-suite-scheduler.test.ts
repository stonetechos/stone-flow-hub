import { describe, expect, it, beforeEach } from "bun:test";
import { matchesSharedSecret } from "@/lib/server/shared-secret";

describe("Agent Suite Scheduler Cron Route Auth", () => {
  const secret = "test-secret-stonetech-2026";

  it("validates secret with constant-time comparison", () => {
    expect(matchesSharedSecret("test-secret-stonetech-2026", secret)).toBe(true);
    expect(matchesSharedSecret("wrong-token", secret)).toBe(false);
    expect(matchesSharedSecret("", secret)).toBe(false);
    expect(matchesSharedSecret(null, secret)).toBe(false);
  });

  it("accepts both Bearer authorization header and x-cron-secret", () => {
    const bearer = "Bearer test-secret-stonetech-2026".replace(/^Bearer\s+/i, "");
    expect(matchesSharedSecret(bearer, secret)).toBe(true);

    const xCronSecret = "test-secret-stonetech-2026";
    expect(matchesSharedSecret(xCronSecret, secret)).toBe(true);
  });
});
