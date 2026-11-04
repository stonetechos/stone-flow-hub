import { describe, expect, test } from "bun:test";
import { encryptSocketPayload, decryptSocketPayload } from "./ecd-socket-crypto";
import type { EcdSnapshotPayload } from "./ecd.functions";

describe("ECD Pipeline & Socket Envelope Verification", () => {
  test("packages and verifies a complete cash erasure snapshot", async () => {
    const mockSnapshot: EcdSnapshotPayload = {
      metadata: {
        source: "Stone Tech OS (STOS)",
        version: "1.0.0",
        timestamp: "2026-11-05T04:30:00.000Z",
        erasedBy: {
          userId: "usr-admin-1",
          email: "raman.pupneja@gmail.com",
        },
        manifest: {
          cashbookCount: 3,
          receiptsCount: 2,
          paymentsCount: 1,
          quotesCount: 1,
          personalTransfersCount: 0,
          totalCashVolume: 420000,
        },
      },
      cashbook_entries: [
        {
          id: "cb-1",
          entry_type: "credit",
          amount: 150000,
          remarks: "Marble Advance Cash - Client A",
        },
        { id: "cb-2", entry_type: "debit", amount: 20000, remarks: "Site Unloading Carting Wages" },
        { id: "cb-3", entry_type: "credit", amount: 50000, remarks: "Granite Cash Balance" },
      ],
      cashbook_opening_balance: {
        amount: 200000,
        as_of_date: "2026-11-01",
        notes: "Starting Balance",
      },
      receipts: [
        { id: "rc-1", receipt_no: "REC-CASH-001", amount: 150000, method: "cash" },
        { id: "rc-2", receipt_no: "REC-CASH-002", amount: 50000, method: "cash" },
      ],
      payments: [{ id: "pm-1", payment_no: "PAY-CASH-001", amount: 20000, method: "cash" }],
      quotes: [
        {
          id: "qt-1",
          quote_no: "QT-CASH-001",
          total: 250000,
          workflow_state: { sale_mode: "cash" },
        },
      ],
      personal_transfers: [],
    };

    // 1. Male Socket Encryption
    const encrypted = await encryptSocketPayload(mockSnapshot, mockSnapshot.metadata.timestamp);

    // Verify folder name & file name are obfuscated
    expect(encrypted.folderName).toStartWith("STOS-VAULT-");
    expect(encrypted.fileName).toEndWith(".stos");
    expect(encrypted.envelope.header).toBe("STOS-ECD-SOCKET-V1");

    // Verify nothing sensitive leaked into raw text
    expect(encrypted.rawString).not.toContain("Marble Advance Cash");
    expect(encrypted.rawString).not.toContain("Granite Cash Balance");
    expect(encrypted.rawString).not.toContain("REC-CASH-001");

    // 2. Female Socket Restoration
    const decrypted = await decryptSocketPayload<EcdSnapshotPayload>(encrypted.rawString);

    expect(decrypted.metadata.source).toBe("Stone Tech OS (STOS)");
    expect(decrypted.metadata.manifest.totalCashVolume).toBe(420000);
    expect(decrypted.cashbook_entries.length).toBe(3);
    expect(decrypted.receipts.length).toBe(2);
    expect(decrypted.quotes.length).toBe(1);
    expect(decrypted.cashbook_entries[0].remarks).toBe("Marble Advance Cash - Client A");
  });
});
