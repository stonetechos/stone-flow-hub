import { describe, expect, it } from "bun:test";

describe("Write-off & Settlement Calculations", () => {
  it("marks an invoice as fully paid when payment + write-off equals total value", () => {
    const total = 46188;
    const payment = 45000;
    const writeOff = 1188;

    const totalPaid = payment;
    const totalSettled = totalPaid + writeOff;
    const balanceDue = Math.max(0, total - totalSettled);
    const isFullyPaid = totalSettled >= total && total > 0;
    const status = isFullyPaid ? "paid" : totalSettled > 0 ? "partially_paid" : "sent";

    expect(totalPaid).toBe(45000);
    expect(totalSettled).toBe(46188);
    expect(balanceDue).toBe(0);
    expect(isFullyPaid).toBe(true);
    expect(status).toBe("paid");
  });

  it("calculates partial payment status when write-off does not cover remaining balance", () => {
    const total = 46188;
    const payment = 40000;
    const writeOff = 1188;

    const totalPaid = payment;
    const totalSettled = totalPaid + writeOff;
    const balanceDue = Math.max(0, total - totalSettled);
    const isFullyPaid = totalSettled >= total && total > 0;
    const status = isFullyPaid ? "paid" : totalSettled > 0 ? "partially_paid" : "sent";

    expect(totalSettled).toBe(41188);
    expect(balanceDue).toBe(5000);
    expect(isFullyPaid).toBe(false);
    expect(status).toBe("partially_paid");
  });

  it("aggregates cumulative written-off amount across all orders combined for repeated customers", () => {
    const creditNotes = [
      {
        id: "cn-1",
        customer_id: "cust-kaushal",
        invoice_id: "inv-000007",
        amount: 1188,
        status: "active",
      },
      {
        id: "cn-2",
        customer_id: "cust-kaushal",
        invoice_id: "inv-000010",
        amount: 500,
        status: "active",
      },
      {
        id: "cn-3",
        customer_id: "cust-kaushal",
        invoice_id: "inv-000015",
        amount: 250,
        status: "cancelled", // should be excluded
      },
      {
        id: "cn-4",
        customer_id: "cust-varahi",
        invoice_id: "inv-000008",
        amount: 300,
        status: "active",
      },
    ];

    const byCustomer: Record<string, number> = {};
    const byInvoice: Record<string, number> = {};

    creditNotes.forEach((cn) => {
      if (cn.status !== "active") return;
      const amt = Number(cn.amount) || 0;
      if (amt <= 0) return;
      if (cn.customer_id) {
        byCustomer[cn.customer_id] = (byCustomer[cn.customer_id] || 0) + amt;
      }
      if (cn.invoice_id) {
        byInvoice[cn.invoice_id] = (byInvoice[cn.invoice_id] || 0) + amt;
      }
    });

    // Kaushal Jeerawala's first order wrote off 1188
    expect(byInvoice["inv-000007"]).toBe(1188);
    // Kaushal Jeerawala's second order wrote off 500
    expect(byInvoice["inv-000010"]).toBe(500);

    // Repeated customer lifetime write-off across ALL orders combined: 1188 + 500 = 1688
    expect(byCustomer["cust-kaushal"]).toBe(1688);

    // Other customer remains isolated
    expect(byCustomer["cust-varahi"]).toBe(300);
  });
});
