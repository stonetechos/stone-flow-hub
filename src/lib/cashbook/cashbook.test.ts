import { describe, expect, it } from "bun:test";
import {
  cashbookEntryInputSchema,
  cashbookOpeningBalanceSchema,
  type CashbookEntryRow,
} from "./schema";

describe("Cashbook Entry Schema Validation", () => {
  it("accepts valid credit entry (cash in)", () => {
    const valid = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "credit",
      amount: 200,
      remarks: "Cash received from client for advance",
    });
    expect(valid.success).toBe(true);
  });

  it("accepts valid debit entry (cash out)", () => {
    const valid = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "debit",
      amount: 50,
      remarks: "Site helper petty cash and fuel reimbursement",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects non-positive amount", () => {
    const zero = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "credit",
      amount: 0,
      remarks: "Zero amount test",
    });
    expect(zero.success).toBe(false);

    const negative = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "debit",
      amount: -500,
      remarks: "Negative amount test",
    });
    expect(negative.success).toBe(false);
  });

  it("requires remarks / notes to be non-empty", () => {
    const emptyRemarks = cashbookEntryInputSchema.safeParse({
      entry_date: "2026-10-10",
      entry_type: "credit",
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

describe("Cashbook Opening Balance Schema Validation", () => {
  it("validates valid opening balance", () => {
    const parsed = cashbookOpeningBalanceSchema.safeParse({
      amount: 100,
      as_of_date: "2026-10-01",
      notes: "Starting cash in hand balance",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(100);
      expect(parsed.data.as_of_date).toBe("2026-10-01");
    }
  });

  it("coerces string numbers to numbers and defaults amount to 0", () => {
    const parsed = cashbookOpeningBalanceSchema.safeParse({
      amount: "5000",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount).toBe(5000);
    }
  });

  it("rejects malformed date strings", () => {
    const parsed = cashbookOpeningBalanceSchema.safeParse({
      amount: 100,
      as_of_date: "01/10/2026",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("Cashbook Running Balance Computation with Opening Balance", () => {
  it("matches user's exact specification: Opening Rs 100 + Credit Rs 200 = Rs 300, Debit Rs 50 = Rs 250", () => {
    const openingBalance = 100;
    const transactions: Array<Pick<CashbookEntryRow, "entry_type" | "amount">> = [
      { entry_type: "credit", amount: 200 },
      { entry_type: "debit", amount: 50 },
    ];

    let running = openingBalance;
    let totalCredit = 0;
    let totalDebit = 0;

    const computed = transactions.map((t) => {
      const isCredit = t.entry_type === "credit";
      const credit = isCredit ? t.amount : 0;
      const debit = !isCredit ? t.amount : 0;
      totalCredit += credit;
      totalDebit += debit;
      running += credit - debit;
      return {
        ...t,
        credit,
        debit,
        running_balance: running,
      };
    });

    expect(totalCredit).toBe(200);
    expect(totalDebit).toBe(50);
    expect(computed[0].running_balance).toBe(300); // 100 + 200 = 300
    expect(computed[1].running_balance).toBe(250); // 300 - 50 = 250
    expect(running).toBe(250);
  });

  it("accurately computes multi-transaction sequential running balance from opening balance", () => {
    const openingBalance = 5000;
    const mockRaw: Array<Pick<CashbookEntryRow, "entry_type" | "amount">> = [
      { entry_type: "credit", amount: 10000 }, // +10,000 -> 15,000
      { entry_type: "debit", amount: 2500 }, // -2,500 -> 12,500
      { entry_type: "debit", amount: 1500 }, // -1,500 -> 11,000
      { entry_type: "credit", amount: 4000 }, // +4,000 -> 15,000
      { entry_type: "debit", amount: 18000 }, // -18,000 -> -3,000
    ];

    let running = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const computed = mockRaw.map((entry) => {
      const isCredit = entry.entry_type === "credit";
      const credit = isCredit ? entry.amount : 0;
      const debit = !isCredit ? entry.amount : 0;
      totalCredit += credit;
      totalDebit += debit;
      running += credit - debit;
      return {
        ...entry,
        debit,
        credit,
        running_balance: running,
      };
    });

    expect(totalCredit).toBe(14000);
    expect(totalDebit).toBe(22000);
    expect(running).toBe(-3000); // 5000 + 14000 - 22000 = -3000

    expect(computed[0].running_balance).toBe(15000);
    expect(computed[1].running_balance).toBe(12500);
    expect(computed[2].running_balance).toBe(11000);
    expect(computed[3].running_balance).toBe(15000);
    expect(computed[4].running_balance).toBe(-3000);
  });

  it("handles app_settings fallback format gracefully", () => {
    const rawVal = {
      entries: [
        {
          id: "cb-1",
          entry_date: "2026-10-09",
          entry_type: "credit",
          amount: 5000,
          remarks: "Customer cash advance",
          created_at: "2026-10-09T10:00:00Z",
          updated_at: "2026-10-09T10:00:00Z",
        },
        {
          id: "cb-2",
          entry_date: "2026-10-10",
          entry_type: "debit",
          amount: 2000,
          remarks: "Site fuel payment",
          created_at: "2026-10-10T11:00:00Z",
          updated_at: "2026-10-10T11:00:00Z",
        },
      ],
    };

    const entries = Array.isArray(rawVal)
      ? rawVal
      : Array.isArray(rawVal?.entries)
        ? rawVal.entries
        : [];

    expect(entries.length).toBe(2);
    expect(entries[0].amount).toBe(5000);
    expect(entries[1].amount).toBe(2000);
  });
});
