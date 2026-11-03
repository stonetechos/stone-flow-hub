import { describe, expect, it } from "bun:test";
import {
  DEFAULT_OFFICE_RENT_REGISTER,
  generateMonthList,
  computeRentScheduleAndReconciliation,
  type OfficeRentRegisterData,
} from "./rent-register.types";

describe("Office Rent Register Engine", () => {
  it("generates correct chronological month sequence from Feb 2025 onwards", () => {
    const list = generateMonthList("2025-02", "2025-05");
    expect(list).toEqual(["2025-02", "2025-03", "2025-04", "2025-05"]);
  });

  it("handles year transition seamlessly (e.g. Nov 2025 to Feb 2026)", () => {
    const list = generateMonthList("2025-11", "2026-02");
    expect(list).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("computes clean reconciliation with advance rent and deposit shortfall", () => {
    const mockData: OfficeRentRegisterData = {
      settings: {
        propertyName: "SG Business Hub, Gota",
        propertyAddress: "Gota, Ahmedabad",
        landlordName: "Test Landlord",
        monthlyRent: 40000,
        dueDayOfMonth: 5,
        payableInAdvance: true,
        startMonth: "2025-02", // Feb 2025 baseline cleared
      },
      payments: [
        {
          id: "p1",
          paymentDate: "2025-03-04",
          monthFor: "2025-03",
          amount: 40000,
          paymentMode: "Bank Transfer (NEFT/RTGS/IMPS)",
          createdAt: "2025-03-04",
        },
        {
          id: "p2",
          paymentDate: "2025-04-03",
          monthFor: "2025-04",
          amount: 25000, // Partial payment for April
          paymentMode: "Cheque",
          createdAt: "2025-04-03",
        },
      ],
      deposit: {
        oldDepositAmount: 120000,
        newDepositAmount: 150000,
        newDepositPaidAmount: 150000,
        oldDepositRefundReceived: 80000, // Landlord returned only 80k out of 120k! 40k shortfall
        offsetAgainstRent: true,
      },
      maintenance: [
        {
          id: "m1",
          type: "Society Maintenance",
          title: "Q1 Society Maintenance",
          periodLabel: "Apr-Jun 2025",
          amount: 15000,
          paidAmount: 0,
          isPaid: false,
          createdAt: "2025-04-01",
        },
      ],
      updatedAt: "2025-05-10",
    };

    // Calculate as of May 10, 2025
    const asOf = new Date(2025, 4, 10); // May 10, 2025
    const { schedule, reconciliation } = computeRentScheduleAndReconciliation(mockData, asOf);

    // Months: 2025-02 (baseline), 2025-03, 2025-04, 2025-05
    expect(schedule.length).toBe(4);

    // March: 40k due, 40k paid => status 'paid'
    const mar = schedule.find((s) => s.monthKey === "2025-03");
    expect(mar?.status).toBe("paid");
    expect(mar?.balanceDue).toBe(0);

    // April: 40k due, 25k paid => status 'partial' (15k balance)
    const apr = schedule.find((s) => s.monthKey === "2025-04");
    expect(apr?.status).toBe("partial");
    expect(apr?.balanceDue).toBe(15000);

    // May: 40k due, 0 paid, past 5th of May => status 'overdue'
    const may = schedule.find((s) => s.monthKey === "2025-05");
    expect(may?.status).toBe("overdue");
    expect(may?.balanceDue).toBe(40000);

    // Total rent accrued: Mar (40k) + Apr (40k) + May (40k) = 120,000
    expect(reconciliation.totalRentAccrued).toBe(120000);
    // Total rent paid: 40k + 25k = 65,000
    expect(reconciliation.totalRentPaid).toBe(65000);
    // Net rent outstanding: 120,000 - 65,000 = 55,000
    expect(reconciliation.netRentOutstanding).toBe(55000);

    // Deposit shortfall owed by landlord: 120,000 - 80,000 = 40,000
    expect(reconciliation.depositShortfallOwedByLandlord).toBe(40000);

    // Unpaid maintenance: 15,000
    expect(reconciliation.netMaintenanceOutstanding).toBe(15000);

    // Gross payable: 55,000 (rent) + 15,000 (maintenance) = 70,000
    expect(reconciliation.grossPayable).toBe(70000);

    // Optimal Net Payable (after deducting 40,000 unreturned deposit): 70,000 - 40,000 = 30,000!
    expect(reconciliation.optimalNetPayable).toBe(30000);
  });
});
