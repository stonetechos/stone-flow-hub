import { describe, expect, it } from "bun:test";
import { parseTransactionMessage, parseMultipleTransactionMessages } from "./sms-parser";

describe("sms-parser", () => {
  it("parses SBI UPI credit message correctly", () => {
    const sms =
      "Dear SBI User, your A/C ending 4912 Credited by INR 45,000.00 on 25Sep26 by UPI/32847291823/John Doe/Ref No 32847291823 - SBI";
    const res = parseTransactionMessage(sms);
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(45000);
    expect(res?.transaction_type).toBe("credit");
    expect(res?.account_last4).toBe("4912");
    expect(res?.utr_number).toBe("32847291823");
  });

  it("parses Paytm received message correctly", () => {
    const sms =
      "Received Rs. 15,200.00 in your Paytm Payments Bank A/c ending 1234 from UPI/Rajesh Patel/428192837192";
    const res = parseTransactionMessage(sms);
    expect(res).not.toBeNull();
    expect(res?.source).toBe("paytm");
    expect(res?.amount).toBe(15200);
    expect(res?.transaction_type).toBe("credit");
    expect(res?.account_last4).toBe("1234");
    expect(res?.utr_number).toBe("428192837192");
  });

  it("parses Google Pay received message correctly", () => {
    const sms = "Google Pay: You received ₹25,000 from Anita Sharma (UPI Ref: 429182019283)";
    const res = parseTransactionMessage(sms);
    expect(res).not.toBeNull();
    expect(res?.source).toBe("gpay");
    expect(res?.amount).toBe(25000);
    expect(res?.transaction_type).toBe("credit");
    expect(res?.counterparty_name).toBe("Anita Sharma");
    expect(res?.utr_number).toBe("429182019283");
  });

  it("parses HDFC deposit message correctly", () => {
    const sms =
      "HDFC Bank: Rs 50,000.00 deposited in A/c **3421 on 25-SEP-26 towards NEFT Cr-CITI0000001-XYZ BUILDERS-UTR CITIN12345678";
    const res = parseTransactionMessage(sms);
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(50000);
    expect(res?.transaction_type).toBe("credit");
    expect(res?.account_last4).toBe("3421");
  });

  it("parses multiple pasted messages", () => {
    const batch = `
Dear SBI User, your A/C ending 4912 Credited by INR 10,000.00 on 25Sep26 by UPI/32847291823/John Doe/Ref No 32847291823 - SBI

Google Pay: You received ₹5,500 from Anita Sharma (UPI Ref: 429182019283)
    `;
    const res = parseMultipleTransactionMessages(batch);
    expect(res.length).toBe(2);
    expect(res[0].amount).toBe(10000);
    expect(res[1].amount).toBe(5500);
  });
});
