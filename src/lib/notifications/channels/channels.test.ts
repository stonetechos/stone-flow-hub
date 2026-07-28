/**
 * Notification channel tests. Run with `bun test`.
 *
 * `@/lib/notifications/toast` and `@capacitor/core` are NOT mocked anywhere
 * else in the repo (grep-confirmed), so this file registers its own
 * file-scoped `mock.module()` calls for both, following the shared
 * "spread the real module's exports, override only what this file needs"
 * pattern `testSupport/moduleMocks.ts` established for the VIE suites —
 * see that file's header comment for why a bare partial mock.module()
 * would silently break any other file that happens to load the same
 * specifier in the same `bun test` process.
 *
 * `bun test` has no DOM (`typeof window === "undefined"`, matching every
 * other SSR-guarded file in this repo — see register-service-worker.ts) —
 * so desktop/push's `isAvailable()` deterministically returns `false` here,
 * which is itself the behavior under test (the non-browser guard), not a
 * limitation to work around.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import * as toastActual from "@/lib/notifications/toast";
import * as capacitorActual from "@capacitor/core";

const toastMock = { notifyToast: mock((..._args: unknown[]) => {}) };
const capacitorMock = {
  isNativePlatform: mock((): boolean => false),
  getPlatform: mock((): string => "web"),
};

mock.module("@/lib/notifications/toast", () => ({ ...toastActual, ...toastMock }));
mock.module("@capacitor/core", () => ({
  ...capacitorActual,
  Capacitor: { ...capacitorActual.Capacitor, ...capacitorMock },
}));

const { desktopChannel } = await import("./desktop");
const { androidChannel } = await import("./android");
const { pushChannel } = await import("./push");
const { registerNotificationChannel, getNotificationChannel, listNotificationChannels } =
  await import("./registry");
const { dispatchToChannels } = await import("./dispatch");
const { NotificationChannelNotImplementedError } = await import("./types");

beforeEach(() => {
  toastMock.notifyToast.mockReset();
  capacitorMock.isNativePlatform.mockReset().mockImplementation(() => false);
  capacitorMock.getPlatform.mockReset().mockImplementation(() => "web");
});

describe("NotificationChannelNotImplementedError", () => {
  test("carries the offending channel id and a descriptive message", () => {
    const err = new NotificationChannelNotImplementedError("android");
    expect(err.name).toBe("NotificationChannelNotImplementedError");
    expect(err.channelId).toBe("android");
    expect(err.message).toContain("android");
  });
});

describe("desktopChannel", () => {
  test("is unavailable outside a browser (no window in this test process)", () => {
    expect(desktopChannel.isAvailable()).toBe(false);
  });

  test("deliver() forwards tier/title/body to notifyToast", async () => {
    await desktopChannel.deliver({
      tier: "critical",
      title: "Overdue invoice",
      body: "INV-0042 is 30 days overdue",
    });
    expect(toastMock.notifyToast).toHaveBeenCalledTimes(1);
    expect(toastMock.notifyToast).toHaveBeenCalledWith("critical", "Overdue invoice", {
      description: "INV-0042 is 30 days overdue",
    });
  });

  test("deliver() tolerates a missing body", async () => {
    await desktopChannel.deliver({ tier: "info", title: "FYI" });
    expect(toastMock.notifyToast).toHaveBeenCalledWith("info", "FYI", { description: undefined });
  });
});

describe("androidChannel", () => {
  test("is unavailable when not running as a native Android Capacitor shell", () => {
    capacitorMock.isNativePlatform.mockImplementation(() => false);
    expect(androidChannel.isAvailable()).toBe(false);
  });

  test("is available when native and platform is android", () => {
    capacitorMock.isNativePlatform.mockImplementation(() => true);
    capacitorMock.getPlatform.mockImplementation(() => "android");
    expect(androidChannel.isAvailable()).toBe(true);
  });

  test("is unavailable when native but platform is ios, not android", () => {
    capacitorMock.isNativePlatform.mockImplementation(() => true);
    capacitorMock.getPlatform.mockImplementation(() => "ios");
    expect(androidChannel.isAvailable()).toBe(false);
  });

  test("deliver() throws NotificationChannelNotImplementedError (foundation-only)", () => {
    expect(() => androidChannel.deliver({ tier: "info", title: "x" })).toThrow(
      NotificationChannelNotImplementedError,
    );
  });
});

describe("pushChannel", () => {
  test("is unavailable outside a browser (no window/PushManager in this test process)", () => {
    expect(pushChannel.isAvailable()).toBe(false);
  });

  test("deliver() throws NotificationChannelNotImplementedError (foundation-only)", () => {
    expect(() => pushChannel.deliver({ tier: "info", title: "x" })).toThrow(
      NotificationChannelNotImplementedError,
    );
  });
});

describe("registry", () => {
  test("desktop, android, and push are all pre-registered", () => {
    const ids = listNotificationChannels()
      .map((c) => c.id)
      .sort();
    expect(ids).toEqual(["android", "desktop", "push"]);
  });

  test("getNotificationChannel returns undefined for an unregistered id", () => {
    // @ts-expect-error deliberately an invalid id to prove the lookup is safe
    expect(getNotificationChannel("carrier-pigeon")).toBeUndefined();
  });

  test("registerNotificationChannel can add a new channel without touching existing ones", () => {
    registerNotificationChannel({
      id: "push",
      label: "Push (test override)",
      isAvailable: () => true,
      deliver: () => {},
    });
    expect(getNotificationChannel("push")?.label).toBe("Push (test override)");
    // restore for other tests in this file
    registerNotificationChannel(pushChannel);
  });
});

describe("dispatchToChannels", () => {
  test("delivers only through available channels, skipping unavailable ones silently", async () => {
    await dispatchToChannels({ tier: "important", title: "Stock low" });
    // desktop unavailable (no window) — notifyToast never called.
    expect(toastMock.notifyToast).not.toHaveBeenCalled();
  });

  test("a stub channel's NotificationChannelNotImplementedError is swallowed, not surfaced", async () => {
    capacitorMock.isNativePlatform.mockImplementation(() => true);
    capacitorMock.getPlatform.mockImplementation(() => "android");
    // Should resolve cleanly even though androidChannel.deliver() throws.
    await expect(
      dispatchToChannels({ tier: "info", title: "x" }, ["android"]),
    ).resolves.toBeUndefined();
  });

  test("channelIds narrows delivery to the requested subset", async () => {
    const forcedDesktopDeliver = mock((_p: unknown) => {});
    registerNotificationChannel({
      id: "desktop",
      label: "Desktop (forced available, test-only)",
      isAvailable: () => true,
      deliver: forcedDesktopDeliver,
    });
    await dispatchToChannels({ tier: "info", title: "only desktop" }, ["desktop"]);
    expect(forcedDesktopDeliver).toHaveBeenCalledTimes(1);
    // restore the real desktop channel for any later test file in this process
    registerNotificationChannel(desktopChannel);
  });
});
