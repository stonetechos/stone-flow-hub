import { describe, expect, it } from "bun:test";
import {
  personalTransferInputSchema,
  computeScopedLedger,
  getAccountDisplayName,
  getCategoryDisplayName,
  type PersonalTransferRow,
} from "./schema";

describe("personalTransferInputSchema", () => {
  it("accepts a valid transfer between company and personal account", () => {
    const input = {
      transfer_date: "2026-10-12",
      from_account: "stone_tech_current",
      to_account: "rishi_upi",
      amount: 25000,
      category: "drawings",
      reference_no: "UPI420912345",
      remarks: "Drawings to Rishi UPI",
    };

    const parsed = personalTransferInputSchema.parse(input);
    expect(parsed.amount).toBe(25000);
    expect(parsed.from_account).toBe("stone_tech_current");
    expect(parsed.to_account).toBe("rishi_upi");
  });

  it("rejects identical sender and receiver accounts", () => {
    const input = {
      transfer_date: "2026-10-12",
      from_account: "rishi_bank",
      to_account: "rishi_bank",
      amount: 5000,
      category: "self_transfer",
      remarks: "Transfer to self",
    };

    expect(() => personalTransferInputSchema.parse(input)).toThrow(
      "From and To accounts cannot be identical",
    );
  });

  it("requires custom account name when 'other' is selected", () => {
    const input = {
      transfer_date: "2026-10-12",
      from_account: "other",
      from_account_custom: "",
      to_account: "raman_upi",
      amount: 10000,
      remarks: "External transfer",
    };

    expect(() => personalTransferInputSchema.parse(input)).toThrow(
      "Please specify the custom sender account name",
    );
  });
});

describe("computeScopedLedger", () => {
  const sampleTransfers: PersonalTransferRow[] = [
    {
      id: "t1",
      transfer_date: "2026-10-01",
      from_account: "stone_tech_current",
      to_account: "rishi_upi",
      amount: 50000,
      category: "drawings",
      remarks: "Drawings to Rishi",
      created_at: "2026-10-01T10:00:00Z",
      updated_at: "2026-10-01T10:00:00Z",
    },
    {
      id: "t2",
      transfer_date: "2026-10-02",
      from_account: "rishi_bank",
      to_account: "raman_upi",
      amount: 20000,
      category: "partner_settlement",
      remarks: "Rishi to Raman settlement",
      created_at: "2026-10-02T11:00:00Z",
      updated_at: "2026-10-02T11:00:00Z",
    },
    {
      id: "t3",
      transfer_date: "2026-10-03",
      from_account: "raman_upi",
      to_account: "stone_tech_current",
      amount: 15000,
      category: "capital_infusion",
      remarks: "Raman deposited into Company SBI",
      created_at: "2026-10-03T12:00:00Z",
      updated_at: "2026-10-03T12:00:00Z",
    },
    {
      id: "t4",
      transfer_date: "2026-10-04",
      from_account: "rishi_bank",
      to_account: "rishi_upi",
      amount: 5000,
      category: "self_transfer",
      remarks: "Rishi personal bank to Rishi UPI",
      created_at: "2026-10-04T13:00:00Z",
      updated_at: "2026-10-04T13:00:00Z",
    },
  ];

  it("computes Rishi Rai ledger accurately", () => {
    const rishiLedger = computeScopedLedger(sampleTransfers, "rishi");
    // t1: Inflow 50,000 to Rishi
    // t2: Outflow 20,000 from Rishi to Raman
    // t4: Internal between Rishi Bank and Rishi UPI (0 net effect)
    expect(rishiLedger.transferCount).toBe(3);
    expect(rishiLedger.totalInflow).toBe(50000);
    expect(rishiLedger.totalOutflow).toBe(20000);
    expect(rishiLedger.netBalance).toBe(30000);
  });

  it("computes Raman Pupneja ledger accurately", () => {
    const ramanLedger = computeScopedLedger(sampleTransfers, "raman");
    // t2: Inflow 20,000 from Rishi
    // t3: Outflow 15,000 from Raman to Company
    expect(ramanLedger.transferCount).toBe(2);
    expect(ramanLedger.totalInflow).toBe(20000);
    expect(ramanLedger.totalOutflow).toBe(15000);
    expect(ramanLedger.netBalance).toBe(5000);
  });

  it("computes Stone Tech company operations ledger accurately", () => {
    const companyLedger = computeScopedLedger(sampleTransfers, "company");
    // t1: Outflow 50,000 from Company to Rishi
    // t3: Inflow 15,000 from Raman to Company
    expect(companyLedger.transferCount).toBe(2);
    expect(companyLedger.totalInflow).toBe(15000);
    expect(companyLedger.totalOutflow).toBe(50000);
    expect(companyLedger.netBalance).toBe(-35000);
  });

  it("provides human-readable account and category labels", () => {
    expect(getAccountDisplayName("rishi_bank")).toContain("Rishi Rai");
    expect(getAccountDisplayName("raman_upi")).toContain("Raman Pupneja");
    expect(getAccountDisplayName("stone_tech_current")).toContain("Stone Tech");
    expect(getCategoryDisplayName("partner_settlement")).toContain("Partner Transfer");
  });
});
