import { describe, expect, it } from "bun:test";
import {
  generateMonthList,
  computeDiaryAndReconciliation,
  type OfficeRentRegisterData,
} from "./rent-register.types";

describe("Tenancy Diary & Accurate Accounting Engine", () => {
  it("generates 21 contract months from Mar 2025 to Nov 2026", () => {
    // Feb 2025 is baseline, Mar 2025 to Nov 2026 is 21 months
    const list = generateMonthList("2025-02", "2026-11");
    expect(list.length).toBe(22); // includes Feb 2025 baseline
    const contractMonths = list.filter((m) => m !== "2025-02");
    expect(contractMonths.length).toBe(21);
    expect(contractMonths[0]).toBe("2025-03");
    expect(contractMonths[contractMonths.length - 1]).toBe("2026-11");
  });

  it("accurately computes multi-faceted diary with lumpsum, cash, deposit refund parts and stone material sale", () => {
    const mockData: OfficeRentRegisterData = {
      settings: {
        propertyName: "SG Business Hub, Gota",
        propertyAddress: "Gota, Ahmedabad",
        landlordName: "Test Landlord",
        monthlyRent: 35000,
        dueDayOfMonth: 5,
        payableInAdvance: true,
        startMonth: "2025-02", // Feb 2025 baseline cleared
        endMonth: "2026-11", // Up to Nov 2026 (21 chargeable months: 21 * 35,000 = 735,000)
      },
      entries: [
        {
          id: "e1",
          date: "2025-03-05",
          category: "rent_payment_bank",
          direction: "we_paid_or_charged",
          impact: "we_owe_less",
          amount: 50000, // Lumpsum bank transfer
          paymentMode: "Bank Transfer (NEFT/RTGS/IMPS)",
          description: "Lumpsum RTGS transfer to landlord",
          createdAt: "2025-03-05",
        },
        {
          id: "e2",
          date: "2025-04-10",
          category: "rent_payment_cash",
          direction: "we_paid_or_charged",
          impact: "we_owe_less",
          amount: 20000, // Cash paid
          paymentMode: "Cash",
          description: "Handed over cash for rent at office",
          createdAt: "2025-04-10",
        },
        {
          id: "e3",
          date: "2025-06-15",
          category: "material_sale_to_landlord",
          direction: "we_paid_or_charged",
          impact: "we_owe_less",
          amount: 45000, // Landlord bought material from Stone Tech
          paymentMode: "Contra / Adjusted",
          description: "Landlord bought Italian marble & sandstone slabs from us",
          createdAt: "2025-06-15",
        },
        {
          id: "e4",
          date: "2025-07-02",
          category: "landlord_payment_for_material",
          direction: "landlord_paid_or_refunded",
          impact: "we_owe_more",
          amount: 15000, // Landlord paid 15k cash towards that material
          paymentMode: "Cash",
          description: "Landlord gave cash partially for stone material",
          createdAt: "2025-07-02",
        },
      ],
      deposit: {
        oldDepositAmount: 100000,
        newDepositAmount: 150000,
        newDepositPaidAmount: 150000,
        oldDepositRefundReceived: 60000, // Returned 60k out of 100k, 40k shortfall owed
        offsetAgainstRent: true,
      },
      maintenance: [
        {
          id: "m1",
          type: "Society Maintenance",
          title: "SG Business Hub Maintenance",
          periodLabel: "2025-26",
          amount: 25000,
          paidAmount: 10000,
          isPaid: false,
          createdAt: "2025-04-01",
        },
      ],
      updatedAt: "2026-11-03",
    };

    const { summary } = computeDiaryAndReconciliation(mockData);

    // Total contract months: 21 (Mar 2025 to Nov 2026)
    expect(summary.totalRentContractMonths).toBe(21);
    // Total contract rent: 21 * 35,000 = 735,000
    expect(summary.totalRentContractAmount).toBe(735000);

    // Total rent paid by us (50,000 + 20,000) = 70,000
    expect(summary.totalRentPaidByUs).toBe(70000);

    // Material net owed by landlord: 45,000 (bought) - 15,000 (paid in cash) = 30,000
    expect(summary.netMaterialOwedByLandlord).toBe(30000);

    // Deposit shortfall owed by landlord: 100,000 - 60,000 = 40,000
    expect(summary.depositShortfallOwedByLandlord).toBe(40000);

    // Unpaid maintenance: 25,000 - 10,000 = 15,000
    expect(summary.unpaidMaintenanceBalance).toBe(15000);

    // Gross payable: Rent (735,000) + Maintenance (15,000) = 750,000
    expect(summary.grossPayable).toBe(750000);

    // Offsets: Rent paid (70,000) + Deposit shortfall (40,000) + Material balance (30,000) = 140,000
    expect(summary.totalOffsetsAndCredits).toBe(140000);

    // Final Optimum Net Payable: 750,000 - 140,000 = 610,000!
    expect(summary.finalOptimumNetPayable).toBe(610000);
  });
});
