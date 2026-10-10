import { describe, expect, it } from "bun:test";
import { cashbookEntryInputSchema, type CashbookEntryRow } from "./schema";

describe("Cashbook Entry Schema Validation", () => {
  it("accepts valid debit entry", () => {
    const valid = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "debit",
      amount: 5000,
      remarks: "Cash received from client for site survey",
    });
    expect(valid.success).toBe(true);
  });

  it("accepts valid credit entry", () => {
    const valid = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "credit",
      amount: 1200.5,
      remarks: "Site helper petty cash and fuel reimbursement",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects non-positive amount", () => {
    const zero = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "debit",
      amount: 0,
      remarks: "Zero amount test",
    });
    expect(zero.success).toBe(false);

    const negative = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "credit",
      amount: -500,
      remarks: "Negative amount test",
    });
    expect(negative.success).toBe(false);
  });

  it("requires remarks / notes to be non-empty", () => {
    const emptyRemarks = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "debit",
      amount: 1000,
      remarks: "   ",
    });
    expect(emptyRemarks.success).toBe(false);
  });

  it("rejects invalid entry type", () => {
    const badType = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "transfer",
      amount: 1000,
      remarks: "Invalid type",
    });
    expect(badType.success).toBe(false);
  });
});

describe("Cashbook Running Balance Computation", () => {
  it("accurately computes sequential running balance with debits and credits", () => {
    const mockRaw: Array<Pick<CashbookEntryRow, "entry_type" | "amount">> = [
      { entry_type: "debit", amount: 10000 }, // +10,000 -> 10,000
      { entry_type: "credit", amount: 2500 }, // -2,500 -> 7,500
      { entry_type: "credit", amount: 1500 }, // -1,500 -> 6,000
      { entry_type: "debit", amount: 4000 }, // +4,000 -> 10,000
      { entry_type: "credit", amount: 12000 }, // -12,000 -> -2,000
    ];

    let running = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const computed = mockRaw.map((entry) => {
      const isDebit = entry.entry_type === "debit";
      const debit = isDebit ? entry.amount : 0;
      const credit = !isDebit ? entry.amount : 0;
      totalDebit += debit;
      totalCredit += credit;
      running += debit - credit;
      return {
        ...entry,
        debit,
        credit,
        running_balance: running,
      };
    });

    expect(totalDebit).toBe(14000);
    expect(totalCredit).toBe(16000);
    expect(running).toBe(-2000);

    expect(computed[0].running_balance).toBe(10000);
    expect(computed[1].running_balance).toBe(7500);
    expect(computed[2].running_balance).toBe(6000);
    expect(computed[3].running_balance).toBe(10000);
    expect(computed[4].running_balance).toBe(-2000);
  });
});
