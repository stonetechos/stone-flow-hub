import { describe, expect, test } from "bun:test";
import {
  isSoundAlertEnabled,
  setSoundAlertEnabled,
  isVibrationAlertEnabled,
  setVibrationAlertEnabled,
  playNotificationSound,
  triggerNotificationVibration,
} from "./sound";

describe("Notifications sound and vibration engine", () => {
  test("allows setting and reading sound enabled state", () => {
    // In Node/Bun SSR or mock environment, graceful degradation to true/false without crashing
    setSoundAlertEnabled(true);
    expect(isSoundAlertEnabled()).toBe(true);

    setSoundAlertEnabled(false);
    expect(isSoundAlertEnabled()).toBe(false);

    // Reset back to true
    setSoundAlertEnabled(true);
    expect(isSoundAlertEnabled()).toBe(true);
  });

  test("allows setting and reading vibration enabled state", () => {
    setVibrationAlertEnabled(true);
    expect(isVibrationAlertEnabled()).toBe(true);

    setVibrationAlertEnabled(false);
    expect(isVibrationAlertEnabled()).toBe(false);

    setVibrationAlertEnabled(true);
    expect(isVibrationAlertEnabled()).toBe(true);
  });

  test("playNotificationSound gracefully executes across all tiers without throwing in non-browser environment", () => {
    expect(() => playNotificationSound("info")).not.toThrow();
    expect(() => playNotificationSound("important")).not.toThrow();
    expect(() => playNotificationSound("critical")).not.toThrow();
  });

  test("triggerNotificationVibration gracefully handles non-DOM environment without throwing", () => {
    expect(() => triggerNotificationVibration("info")).not.toThrow();
    expect(() => triggerNotificationVibration("important")).not.toThrow();
    expect(() => triggerNotificationVibration("critical")).not.toThrow();
  });
});
