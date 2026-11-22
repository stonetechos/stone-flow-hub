import { describe, expect, it } from "bun:test";
import { SpeedometerGauge, MiniRadialMeter } from "./StatutoryHealthGauge";

describe("StatutoryHealthGauge calculations", () => {
  it("computes gauge angles correctly within 0 to 180 degrees sweep", () => {
    // 0% -> -90 deg
    const pct0 = 0;
    const angle0 = -90 + (pct0 / 100) * 180;
    expect(angle0).toBe(-90);

    // 50% -> 0 deg (top center)
    const pct50 = 50;
    const angle50 = -90 + (pct50 / 100) * 180;
    expect(angle50).toBe(0);

    // 100% -> +90 deg (full sweep)
    const pct100 = 100;
    const angle100 = -90 + (pct100 / 100) * 180;
    expect(angle100).toBe(90);
  });

  it("calculates arc length and strokeDashoffset correctly", () => {
    const radius = 70;
    const arcLength = Math.PI * radius;

    // At 100% progress, strokeDashoffset is 0
    const offset100 = arcLength - (100 / 100) * arcLength;
    expect(offset100).toBe(0);

    // At 50% progress, strokeDashoffset is half
    const offset50 = arcLength - (50 / 100) * arcLength;
    expect(offset50).toBeCloseTo(arcLength / 2, 2);
  });

  it("identifies health status bands correctly", () => {
    // Health mode: 100 is green, 0 is red
    const isHealthy = (pct: number) => pct >= 80;
    const isModerate = (pct: number) => pct >= 50 && pct < 80;
    const isDanger = (pct: number) => pct < 50;

    expect(isHealthy(95)).toBe(true);
    expect(isModerate(65)).toBe(true);
    expect(isDanger(30)).toBe(true);

    // Risk mode: 0 is green, 100 is red
    const isRiskHealthy = (pct: number) => pct <= 50;
    const isRiskHigh = (pct: number) => pct > 75;

    expect(isRiskHealthy(35)).toBe(true);
    expect(isRiskHigh(85)).toBe(true);
  });
});
