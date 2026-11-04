import { describe, expect, test } from "bun:test";
import { encryptSocketPayload, decryptSocketPayload, computeSha256 } from "./ecd-socket-crypto";

describe("ECD Male-Female Socket Cryptography", () => {
  test("encrypts payload into an unreadable encrypted envelope", async () => {
    const sensitiveData = {
      cashbook_entries: [
        {
          id: "cb-1",
          entry_type: "credit",
          amount: 50000,
          remarks: "Site Cash Received - Mr Sharma",
        },
        { id: "cb-2", entry_type: "debit", amount: 12000, remarks: "Labour Daily Wages Cash" },
      ],
      quotes: [
        {
          quote_no: "QT-2026-001",
          customer_name: "VIP Private Client",
          total: 450000,
          is_cash: true,
        },
      ],
      opening_balance: { amount: 150000, as_of_date: "2026-11-01" },
    };

    const encrypted = await encryptSocketPayload(sensitiveData);

    expect(encrypted.envelope.header).toBe("STOS-ECD-SOCKET-V1");
    expect(encrypted.folderName).toStartWith("STOS-VAULT-");
    expect(encrypted.fileName).toEndWith(".stos");

    // The raw string must NOT contain any plaintext customer names, amounts, or remarks
    expect(encrypted.rawString).not.toContain("VIP Private Client");
    expect(encrypted.rawString).not.toContain("Mr Sharma");
    expect(encrypted.rawString).not.toContain("Labour Daily Wages");
    expect(encrypted.rawString).toContain("cipherHex");
    expect(encrypted.rawString).toContain("saltHex");
    expect(encrypted.rawString).toContain("ivHex");
  });

  test("seamlessly decrypts and recovers exact data when plugged into matching socket", async () => {
    const sensitiveData = {
      cashbook_entries: [
        {
          id: "cb-1",
          entry_type: "credit",
          amount: 50000,
          remarks: "Site Cash Received - Mr Sharma",
        },
      ],
      quotes: [{ quote_no: "QT-2026-001", customer_name: "VIP Private Client", total: 450000 }],
      timestamp: "2026-11-05T04:00:00.000Z",
    };

    const encrypted = await encryptSocketPayload(sensitiveData);
    const restored = await decryptSocketPayload<typeof sensitiveData>(encrypted.rawString);

    expect(restored).toEqual(sensitiveData);
    expect(restored.cashbook_entries[0].remarks).toBe("Site Cash Received - Mr Sharma");
    expect(restored.quotes[0].customer_name).toBe("VIP Private Client");
  });

  test("rejects tampered or forged envelope", async () => {
    const sensitiveData = { amount: 100000 };
    const encrypted = await encryptSocketPayload(sensitiveData);

    // Tamper with ciphertext
    const tamperedEnvelope = {
      ...encrypted.envelope,
      cipherHex: encrypted.envelope.cipherHex.slice(0, -4) + "ffff",
    };

    await expect(decryptSocketPayload(tamperedEnvelope)).rejects.toThrow();
  });
});
