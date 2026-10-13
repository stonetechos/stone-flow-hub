import { describe, it, expect } from "bun:test";
import {
  computeOrderPin,
  resolveOrderStage,
  senseOrderDeliveryStatus,
  buildOrderMilestones,
  buildOrderTrackingUrl,
  generateOrderTrackingWhatsappMessage,
} from "./tracking";

describe("Customer Order Tracking & Delay Sensing", () => {
  it("computes deterministic 6-digit PIN", () => {
    const pin1 = computeOrderPin("SO-2026-0042", "9876543210");
    const pin2 = computeOrderPin("so-2026-0042", "+91 98765 43210");
    const pinOther = computeOrderPin("SO-2026-0043", "9876543210");

    expect(pin1).toMatch(/^\d{6}$/);
    expect(pin1).toBe(pin2);
    expect(pin1).not.toBe(pinOther);
  });

  it("resolves order stage accurately from status and dispatches", () => {
    expect(resolveOrderStage("draft", [])).toBe("confirmed");
    expect(resolveOrderStage("in_production", [])).toBe("production");
    expect(resolveOrderStage("ready", [])).toBe("ready");
    expect(resolveOrderStage("confirmed", [{ status: "in_transit" }])).toBe("dispatched");
    expect(resolveOrderStage("in_production", [{ status: "delivered" }])).toBe("delivered");
  });

  it("senses delay when promised delivery date has elapsed", () => {
    const fixedNow = new Date("2026-10-14T10:00:00Z");

    // Past date (promised 10 Oct 2026, today is 14 Oct)
    const delayed = senseOrderDeliveryStatus({
      orderDate: "2026-10-01",
      deliveryDate: "2026-10-10",
      status: "in_production",
      dispatches: [],
      currentDate: fixedNow,
    });

    expect(delayed.isDelayed).toBe(true);
    expect(delayed.delayDays).toBeGreaterThanOrEqual(3);
    expect(delayed.summaryBadge).toBe("delayed");
    expect(delayed.expectedDateText).toContain("Schedule revision in progress");

    // Future date (promised 25 Oct 2026, today is 14 Oct)
    const onTime = senseOrderDeliveryStatus({
      orderDate: "2026-10-01",
      deliveryDate: "2026-10-25",
      status: "in_production",
      dispatches: [],
      currentDate: fixedNow,
    });

    expect(onTime.isDelayed).toBe(false);
    expect(onTime.delayDays).toBe(0);
    expect(onTime.summaryBadge).toBe("on_time");
    expect(onTime.expectedDateText).toContain("Expected to arrive on time");
  });

  it("marks delivered orders as completed and never delayed", () => {
    const fixedNow = new Date("2026-10-14T10:00:00Z");
    const delivered = senseOrderDeliveryStatus({
      orderDate: "2026-10-01",
      deliveryDate: "2026-10-08",
      status: "delivered",
      dispatches: [{ status: "delivered" }],
      currentDate: fixedNow,
    });

    expect(delivered.isDelayed).toBe(false);
    expect(delivered.summaryBadge).toBe("completed");
    expect(delivered.stage).toBe("delivered");
  });

  it("builds 5-stage customer milestones with correct active state", () => {
    const milestones = buildOrderMilestones({
      orderDate: "2026-10-01",
      deliveryDate: "2026-10-20",
      status: "ready",
      dispatches: [],
    });

    expect(milestones).toHaveLength(5);
    // 0: confirmed -> completed
    expect(milestones[0].key).toBe("confirmed");
    expect(milestones[0].status).toBe("completed");
    // 1: production -> completed
    expect(milestones[1].key).toBe("production");
    expect(milestones[1].status).toBe("completed");
    // 2: ready -> current
    expect(milestones[2].key).toBe("ready");
    expect(milestones[2].status).toBe("current");
    // 3: dispatched -> upcoming
    expect(milestones[3].key).toBe("dispatched");
    expect(milestones[3].status).toBe("upcoming");
    // 4: delivered -> upcoming
    expect(milestones[4].key).toBe("delivered");
    expect(milestones[4].status).toBe("upcoming");
  });

  it("builds pre-authenticated customer tracking URL", () => {
    const url = buildOrderTrackingUrl({
      orderNo: "SO-2026-0042",
      phone: "9876543210",
      origin: "https://stonetech.in",
    });

    const expectedPin = computeOrderPin("SO-2026-0042", "9876543210");
    expect(url).toContain("https://stonetech.in/track/SO-2026-0042");
    expect(url).toContain("phone=9876543210");
    expect(url).toContain(`pin=${expectedPin}`);
  });

  it("generates contextual AI WhatsApp message for on-time order", () => {
    const res = generateOrderTrackingWhatsappMessage({
      customerName: "Rajesh Sharma",
      customerPhone: "9876543210",
      orderNo: "SO-2026-0088",
      deliveryDate: "2026-12-15",
      status: "in_production",
      origin: "https://stonetech.in",
    });

    expect(res.assessment.isDelayed).toBe(false);
    expect(res.messageText).toContain("Namaste Rajesh Sharma");
    expect(res.messageText).toContain("SO-2026-0088");
    expect(res.messageText).toContain("Expected to arrive on time i.e.,");
    expect(res.messageText).toContain("https://stonetech.in/track/SO-2026-0088");
    expect(res.normalizedPhone).toBe("9876543210");
  });

  it("generates contextual AI WhatsApp message for delayed order", () => {
    const res = generateOrderTrackingWhatsappMessage({
      customerName: "Amit Verma",
      customerPhone: "9876543210",
      orderNo: "SO-2026-0010",
      deliveryDate: "2026-01-01", // Long past
      status: "in_production",
      origin: "https://stonetech.in",
    });

    expect(res.assessment.isDelayed).toBe(true);
    expect(res.messageText).toContain("Namaste Amit Verma");
    expect(res.messageText).toContain("Schedule Update:");
    expect(res.messageText).toContain("https://stonetech.in/track/SO-2026-0010");
  });

  it("generates contextual AI WhatsApp message for dispatched order", () => {
    const res = generateOrderTrackingWhatsappMessage({
      customerName: "Pooja Mehta",
      customerPhone: "9876543210",
      orderNo: "SO-2026-0099",
      deliveryDate: "2026-10-30",
      status: "confirmed",
      dispatches: [
        {
          dispatch_no: "DC-2026-041",
          status: "in_transit",
          carrier: "VRL Logistics (MH-12-AB-1234)",
        },
      ],
      origin: "https://stonetech.in",
    });

    expect(res.assessment.stage).toBe("dispatched");
    expect(res.messageText).toContain("Dispatched & On the Way");
    expect(res.messageText).toContain("DC-2026-041");
    expect(res.messageText).toContain("VRL Logistics");
  });
});
