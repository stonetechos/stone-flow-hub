import { describe, expect, it } from "bun:test";
import {
  buildWhatsappAccountingStatement,
  type AccountingStatementData,
} from "./accounting-statement";

describe("Accounting Statement Engine", () => {
  it("builds a complete real-time customer accounting statement with itemized ledger", () => {
    const data: AccountingStatementData = {
      party: {
        partyType: "customer",
        id: "cust-1",
        name: "Gagan Bhai",
        code: "CUST-0002",
        phone: "9825012345",
        whatsapp: "9825012345",
        companyName: "Luxury Villa",
        city: "Ahmedabad",
      },
      asOfTimestamp: "18/10/2026, 04:30 PM",
      totalDebit: 145000,
      totalCredit: 120000,
      balance: 25000,
      writeOffTotal: 2500,
      transactions: [
        {
          date: "2026-09-12",
          type: "Invoice",
          refNo: "INV-000045",
          debit: 100000,
          credit: 0,
          runningBalance: 100000,
        },
        {
          date: "2026-09-18",
          type: "Receipt (Bank Transfer)",
          refNo: "REC-000032",
          debit: 0,
          credit: 50000,
          runningBalance: 50000,
        },
        {
          date: "2026-09-25",
          type: "Write-Off (Late Delivery Concession)",
          refNo: "CN-000008",
          debit: 0,
          credit: 2500,
          runningBalance: 47500,
        },
        {
          date: "2026-10-02",
          type: "Delivery Challan (Cash)",
          refNo: "DC-000019",
          debit: 45000,
          credit: 0,
          runningBalance: 92500,
        },
        {
          date: "2026-10-10",
          type: "Receipt (UPI Personal)",
          refNo: "REC-000067",
          debit: 0,
          credit: 67500,
          runningBalance: 25000,
        },
      ],
    };

    const message = buildWhatsappAccountingStatement(data);

    expect(message).toContain("STONE TECH");
    expect(message).toContain("CUSTOMER STATEMENT OF ACCOUNT");
    expect(message).toContain("Gagan Bhai");
    expect(message).toContain("CUST-0002");
    expect(message).toContain("18/10/2026, 04:30 PM");
    expect(message).toContain("👉 *NET OUTSTANDING BALANCE DUE: ₹25,000*");
    expect(message).toContain("• Total Invoiced / Debits: *₹1,45,000*");
    expect(message).toContain("• Total Received / Credits: *₹1,20,000*");
    expect(message).toContain("• Total Concessions & Write-Offs: *₹2,500*");
    expect(message).toContain("INV-000045");
    expect(message).toContain("REC-000032");
    expect(message).toContain("CN-000008");
    expect(message).toContain("DC-000019");
    expect(message).toContain("REC-000067");
    expect(message).toContain("STONE TECH BANKING & PAYMENT DETAILS");
  });

  it("builds vendor statement with appropriate headings", () => {
    const data: AccountingStatementData = {
      party: {
        partyType: "vendor",
        id: "v-1",
        name: "Makrana Marbles",
        phone: "9825099999",
      },
      asOfTimestamp: "18/10/2026, 05:00 PM",
      totalDebit: 300000,
      totalCredit: 250000,
      balance: 50000,
      transactions: [
        {
          date: "2026-10-01",
          type: "Purchase Order",
          refNo: "PO-000010",
          debit: 300000,
          credit: 0,
          runningBalance: 300000,
        },
        {
          date: "2026-10-05",
          type: "Payment",
          refNo: "VP-000004",
          debit: 0,
          credit: 250000,
          runningBalance: 50000,
        },
      ],
    };

    const message = buildWhatsappAccountingStatement(data);
    expect(message).toContain("VENDOR ACCOUNT STATEMENT");
    expect(message).toContain("Makrana Marbles");
    expect(message).toContain("NET PAYABLE DUE TO VENDOR: ₹50,000");
    expect(message).toContain("PO-000010");
    expect(message).toContain("VP-000004");
  });

  it("builds agency statement with appropriate headings", () => {
    const data: AccountingStatementData = {
      party: {
        partyType: "agency",
        id: "ag-1",
        name: "Vikas Installation Team",
        code: "AGY-001",
      },
      asOfTimestamp: "18/10/2026, 05:15 PM",
      totalDebit: 45000,
      totalCredit: 45000,
      balance: 0,
      transactions: [
        {
          date: "2026-10-01",
          type: "Installation Charge",
          refNo: "JOB-001",
          debit: 45000,
          credit: 0,
          runningBalance: 45000,
        },
        {
          date: "2026-10-08",
          type: "Direct Payment",
          refNo: "PAY-001",
          debit: 0,
          credit: 45000,
          runningBalance: 0,
        },
      ],
    };

    const message = buildWhatsappAccountingStatement(data);
    expect(message).toContain("AGENCY ACCOUNT STATEMENT");
    expect(message).toContain("Vikas Installation Team");
    expect(message).toContain("NET BALANCE: NIL (ALL DUES SETTLED)");
  });
});
