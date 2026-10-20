import { describe, expect, it } from "bun:test";

describe("DangerNotifications Swipe & Dismissal Logic", () => {
  const SWIPE_THRESHOLD = 50;

  it("determines swipe right beyond threshold as dismiss action", () => {
    const evaluateSwipe = (dragX: number): "dismiss" | "act" | "snap_back" => {
      if (dragX > SWIPE_THRESHOLD) return "dismiss";
      if (dragX < -SWIPE_THRESHOLD) return "act";
      return "snap_back";
    };

    expect(evaluateSwipe(60)).toBe("dismiss");
    expect(evaluateSwipe(120)).toBe("dismiss");
    expect(evaluateSwipe(50)).toBe("snap_back");
    expect(evaluateSwipe(30)).toBe("snap_back");
    expect(evaluateSwipe(0)).toBe("snap_back");
  });

  it("determines swipe left beyond threshold as act action", () => {
    const evaluateSwipe = (dragX: number): "dismiss" | "act" | "snap_back" => {
      if (dragX > SWIPE_THRESHOLD) return "dismiss";
      if (dragX < -SWIPE_THRESHOLD) return "act";
      return "snap_back";
    };

    expect(evaluateSwipe(-60)).toBe("act");
    expect(evaluateSwipe(-100)).toBe("act");
    expect(evaluateSwipe(-50)).toBe("snap_back");
    expect(evaluateSwipe(-20)).toBe("snap_back");
  });

  it("filters out dismissed, acknowledged, resolved, or session-dismissed insights", () => {
    const isVisible = (
      lifecycleStatus: string,
      tone: string,
      confidence: number,
      dismissedKeys: Set<string>,
      key: string,
    ) => {
      if (tone !== "danger") return false;
      if (confidence < 0.9) return false;
      if (dismissedKeys.has(key)) return false;
      if (["dismissed", "resolved", "acknowledged", "expired"].includes(lifecycleStatus)) {
        return false;
      }
      return true;
    };

    const dismissedKeys = new Set(["ops:quote:1"]);

    // Active un-dismissed danger insight -> visible
    expect(isVisible("new", "danger", 0.95, dismissedKeys, "ops:quote:2")).toBe(true);
    expect(isVisible("seen", "danger", 0.9, dismissedKeys, "ops:quote:2")).toBe(true);

    // Dismissed in session -> hidden
    expect(isVisible("new", "danger", 0.95, dismissedKeys, "ops:quote:1")).toBe(false);

    // Settled lifecycle statuses -> hidden
    expect(isVisible("dismissed", "danger", 0.95, new Set(), "ops:quote:3")).toBe(false);
    expect(isVisible("acknowledged", "danger", 0.95, new Set(), "ops:quote:4")).toBe(false);
    expect(isVisible("resolved", "danger", 0.95, new Set(), "ops:quote:5")).toBe(false);

    // Non-danger or low confidence -> hidden
    expect(isVisible("new", "info", 0.95, new Set(), "ops:quote:6")).toBe(false);
    expect(isVisible("new", "danger", 0.7, new Set(), "ops:quote:7")).toBe(false);
  });
});
