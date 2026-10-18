import { describe, expect, it } from "bun:test";
import { WRITE_OFF_REASONS, type WriteOffReason } from "./api";

describe("WriteOffs API and Reasons", () => {
  it("defines all business write-off reason categories", () => {
    const reasons: WriteOffReason[] = [
      "quality_issue",
      "late_delivery",
      "transit_damage",
      "rate_dispute",
      "round_off",
      "bad_debt",
      "other",
    ];

    for (const r of reasons) {
      expect(WRITE_OFF_REASONS[r]).toBeDefined();
      expect(WRITE_OFF_REASONS[r].label.length).toBeGreaterThan(0);
      expect(WRITE_OFF_REASONS[r].badgeClass.length).toBeGreaterThan(0);
    }
  });

  it("has clear human-facing labels for quality and delivery concessions", () => {
    expect(WRITE_OFF_REASONS.quality_issue.label).toContain("Quality");
    expect(WRITE_OFF_REASONS.late_delivery.label).toContain("Late Delivery");
    expect(WRITE_OFF_REASONS.transit_damage.label).toContain("Transit Damage");
  });
});
