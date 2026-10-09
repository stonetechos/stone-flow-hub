import { describe, expect, it } from "bun:test";
import { calculateDeadlineHealth } from "./order-pipeline";

describe("calculateDeadlineHealth", () => {
  const refDate = new Date("2026-10-10T12:00:00Z");

  it("identifies comfortable buffer when vendor deadline is days before customer deadline", () => {
    // Vendor: Oct 15, Customer: Oct 20 -> 5 days buffer
    const result = calculateDeadlineHealth("2026-10-15", "2026-10-20", "in_production", refDate);
    expect(result.health).toBe("on_track");
    expect(result.bufferDays).toBe(5);
  });

  it("identifies critical delay when vendor deadline is after customer deadline", () => {
    // Vendor: Oct 22, Customer: Oct 20 -> -2 days buffer!
    const result = calculateDeadlineHealth("2026-10-22", "2026-10-20", "in_production", refDate);
    expect(result.health).toBe("critical_delay");
    expect(result.bufferDays).toBe(-2);
  });

  it("identifies tight buffer when vendor deadline is 1-2 days before customer deadline", () => {
    // Vendor: Oct 19, Customer: Oct 20 -> 1 day buffer
    const result = calculateDeadlineHealth("2026-10-19", "2026-10-20", "in_production", refDate);
    expect(result.health).toBe("tight_buffer");
    expect(result.bufferDays).toBe(1);
  });

  it("identifies overdue when vendor deadline has already elapsed", () => {
    // Vendor: Oct 05 (ref is Oct 10) -> overdue
    const result = calculateDeadlineHealth("2026-10-05", "2026-10-15", "in_production", refDate);
    expect(result.health).toBe("overdue");
  });

  it("marks completed when status is received or delivered", () => {
    const result = calculateDeadlineHealth("2026-10-05", "2026-10-08", "received", refDate);
    expect(result.health).toBe("completed");
    expect(result.bufferDays).toBe(null);
  });
});
