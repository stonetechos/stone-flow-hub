/**
 * Sales predictor tests — pure, no I/O. Run with `bun test`.
 */
import { describe, expect, test } from "bun:test";
import {
  predictEnquiryCold,
  predictQuoteConversion,
  predictRepeatOrderThisMonth,
  predictStopBuying,
} from "./sales";

const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const isoDate = (daysAgo: number) => iso(daysAgo).slice(0, 10);

describe("predictQuoteConversion", () => {
  test("emits with strong signals and returns explainable trace", () => {
    const p = predictQuoteConversion({
      quote: {
        id: "q1",
        quote_no: "Q-001",
        status: "sent",
        issue_date: isoDate(3),
        valid_until: isoDate(-20),
        total: 500_000,
        customer_id: "c1",
        enquiry_id: "e1",
      },
      customerQuoteHistory: [
        { id: "q2", status: "accepted" },
        { id: "q3", status: "accepted" },
        { id: "q4", status: "rejected" },
      ],
      enquiryStage: "negotiation",
      hasScheduledFollowup: true,
      lastActivityAt: iso(1),
    });
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("sales.quote-conversion");
    expect(p!.explanation.signals.length).toBeGreaterThanOrEqual(2);
    expect(p!.explanation.suggestedAction.to).toBe("/quotes/q1");
    expect(p!.explanation.recordsAnalysed[0]).toMatchObject({ type: "quote", id: "q1" });
  });

  test("returns null for closed quote (insufficient/no signals apply)", () => {
    const p = predictQuoteConversion({
      quote: {
        id: "q9",
        quote_no: "Q-9",
        status: "converted",
        issue_date: isoDate(2),
        valid_until: null,
        total: 100,
        customer_id: "c1",
        enquiry_id: null,
      },
      customerQuoteHistory: [],
      enquiryStage: null,
      hasScheduledFollowup: false,
      lastActivityAt: null,
    });
    expect(p).toBeNull();
  });
});

describe("predictEnquiryCold", () => {
  test("emits danger when very stale with no follow-up", () => {
    const p = predictEnquiryCold({
      enquiry: {
        id: "e1",
        enquiry_no: "E-1",
        stage: "negotiation",
        updated_at: iso(40),
        budget_inr: 200_000,
        customer_id: "c1",
      },
      daysSinceLastFollowup: null,
      nextFollowupAt: null,
      stageMedianDays: null,
    });
    expect(p).not.toBeNull();
    expect(p!.severity).toBe("danger");
    expect(p!.explanation.signals.some((s) => /No follow-up/i.test(s.label))).toBe(true);
    expect(p!.explanation.suggestedAction.to).toContain("/enquiries/e1");
  });

  test("returns null for fresh enquiry with active follow-up (single low-weight signal)", () => {
    const p = predictEnquiryCold({
      enquiry: {
        id: "e2",
        enquiry_no: "E-2",
        stage: "contacted",
        updated_at: iso(2),
        budget_inr: 1000,
        customer_id: "c1",
      },
      daysSinceLastFollowup: 1,
      nextFollowupAt: iso(-3),
      stageMedianDays: 10,
    });
    expect(p).toBeNull();
  });
});

describe("predictRepeatOrderThisMonth", () => {
  test("emits when cadence stable and due window reached", () => {
    const p = predictRepeatOrderThisMonth({
      customer: { id: "c1", name: "Acme" },
      orders: [
        { id: "o1", order_date: isoDate(120), status: "delivered" },
        { id: "o2", order_date: isoDate(90), status: "delivered" },
        { id: "o3", order_date: isoDate(60), status: "delivered" },
        { id: "o4", order_date: isoDate(31), status: "delivered" },
      ],
    });
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("sales.repeat-order-this-month");
    expect(p!.explanation.recordsAnalysed.length).toBeGreaterThan(0);
  });

  test("returns null for new customer with < 3 orders", () => {
    const p = predictRepeatOrderThisMonth({
      customer: { id: "c2", name: "Newco" },
      orders: [
        { id: "o1", order_date: isoDate(30), status: "delivered" },
        { id: "o2", order_date: isoDate(10), status: "delivered" },
      ],
    });
    expect(p).toBeNull();
  });
});

describe("predictStopBuying", () => {
  test("emits warning when overdue beyond 2× cadence", () => {
    const p = predictStopBuying({
      customer: { id: "c1", name: "Acme" },
      orders: [
        { id: "o1", order_date: isoDate(300), status: "delivered" },
        { id: "o2", order_date: isoDate(240), status: "delivered" },
        { id: "o3", order_date: isoDate(180), status: "delivered" },
        { id: "o4", order_date: isoDate(30), status: "delivered" },
      ],
    });
    expect(p).not.toBeNull();
    expect(["warning", "danger"]).toContain(p!.severity);
    expect(p!.explanation.suggestedAction.to).toContain("/customers/c1");
  });

  test("returns null when customer is buying on cadence", () => {
    const p = predictStopBuying({
      customer: { id: "c3", name: "Steady" },
      orders: [
        { id: "o1", order_date: isoDate(90), status: "delivered" },
        { id: "o2", order_date: isoDate(60), status: "delivered" },
        { id: "o3", order_date: isoDate(30), status: "delivered" },
      ],
    });
    expect(p).toBeNull();
  });
});
