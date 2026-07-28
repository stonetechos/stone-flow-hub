/**
 * VIE Event Bus tests — pure, no I/O. Run with `bun test`.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { vieEventBus, VIE_EVENTS, type VieEvent } from "./eventBus";

afterEach(() => {
  vieEventBus.__resetForTests();
});

describe("vieEventBus", () => {
  test("a subscriber receives an event published for its exact type", () => {
    const received: VieEvent[] = [];
    vieEventBus.on(VIE_EVENTS.ACTION_EXECUTED, (e) => received.push(e));
    vieEventBus.publish({
      type: VIE_EVENTS.ACTION_EXECUTED,
      payload: { actionId: "a1" },
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    expect(received.length).toBe(1);
    expect(received[0].payload).toEqual({ actionId: "a1" });
  });

  test("a subscriber to a different type never receives it", () => {
    const received: VieEvent[] = [];
    vieEventBus.on(VIE_EVENTS.ACTION_FAILED, (e) => received.push(e));
    vieEventBus.publish({
      type: VIE_EVENTS.ACTION_EXECUTED,
      payload: {},
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    expect(received.length).toBe(0);
  });

  test("onAny receives every event regardless of type", () => {
    const received: string[] = [];
    vieEventBus.onAny((e) => received.push(e.type));
    vieEventBus.publish({
      type: "a.b",
      payload: {},
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    vieEventBus.publish({
      type: "c.d",
      payload: {},
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    expect(received).toEqual(["a.b", "c.d"]);
  });

  test("unsubscribe stops further delivery", () => {
    const received: VieEvent[] = [];
    const unsubscribe = vieEventBus.on("x.y", (e) => received.push(e));
    vieEventBus.publish({
      type: "x.y",
      payload: 1,
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    unsubscribe();
    vieEventBus.publish({
      type: "x.y",
      payload: 2,
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    expect(received.length).toBe(1);
  });

  test("a throwing listener never breaks publish() or other listeners", () => {
    const received: string[] = [];
    vieEventBus.on("x.y", () => {
      throw new Error("boom");
    });
    vieEventBus.on("x.y", () => {
      received.push("second listener ran");
    });
    expect(() =>
      vieEventBus.publish({
        type: "x.y",
        payload: {},
        occurredAt: "2026-07-28T00:00:00.000Z",
        source: "test",
      }),
    ).not.toThrow();
    expect(received).toEqual(["second listener ran"]);
  });

  test("a rejecting async listener never surfaces as an unhandled rejection the caller must catch", async () => {
    let secondRan = false;
    vieEventBus.on("x.y", async () => {
      throw new Error("async boom");
    });
    vieEventBus.on("x.y", async () => {
      secondRan = true;
    });
    // publishAndWait itself never rejects, even though a listener does.
    await expect(
      vieEventBus.publishAndWait({
        type: "x.y",
        payload: {},
        occurredAt: "2026-07-28T00:00:00.000Z",
        source: "test",
      }),
    ).resolves.toBeUndefined();
    expect(secondRan).toBe(true);
  });

  test("publishAndWait resolves once every listener has settled", async () => {
    const order: string[] = [];
    vieEventBus.on("x.y", async () => {
      await new Promise((r) => setTimeout(r, 5));
      order.push("slow");
    });
    vieEventBus.on("x.y", () => {
      order.push("fast");
    });
    await vieEventBus.publishAndWait({
      type: "x.y",
      payload: {},
      occurredAt: "2026-07-28T00:00:00.000Z",
      source: "test",
    });
    expect(order.sort()).toEqual(["fast", "slow"]);
  });

  test("no subscribers by default — publishing with zero listeners is a safe no-op", () => {
    expect(() =>
      vieEventBus.publish({
        type: "nobody.listening",
        payload: {},
        occurredAt: "2026-07-28T00:00:00.000Z",
        source: "test",
      }),
    ).not.toThrow();
  });
});
