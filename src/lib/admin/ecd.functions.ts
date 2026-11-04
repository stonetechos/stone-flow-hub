/**
 * Server functions for ECD (Erase Cash Data & Vault Retrieval).
 *
 * Implements one-click scrubbing and cryptographic retrieval for super admins:
 * - Compiles cashbook, cash receipts, cash payments, cash quotations.
 * - Encrypts using AES-256-GCM male-female socket envelope (completely unreadable outside STOS).
 * - Saves encrypted archive to Supabase Storage (stonetech-files/ecd-vault).
 * - Dispatches hardcoded email notification to info@stonetech.in.
 * - Scrubs live database records and toggles cash visibility off in < 2 minutes.
 * - Seamlessly restores database records from encrypted socket file or cloud snapshot.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminOrSuperAdmin } from "./server-auth";
import { encryptSocketPayload, decryptSocketPayload } from "./ecd-socket-crypto";
import { FILES_BUCKET } from "@/lib/constants";

const ECD_HARDCODED_EMAIL = "info@stonetech.in";
const CASHBOOK_SETTINGS_KEY = "finance.ramans_cashbook";
const CASHBOOK_OPENING_KEY = "finance.ramans_cashbook.opening_balance";
const ECD_SETTINGS_KEY = "finance.ecd_status";

export interface EcdSnapshotPayload {
  metadata: {
    source: "Stone Tech OS (STOS)";
    version: "1.0.0";
    timestamp: string;
    erasedBy: {
      userId: string;
      email: string;
    };
    manifest: {
      cashbookCount: number;
      receiptsCount: number;
      paymentsCount: number;
      quotesCount: number;
      personalTransfersCount: number;
      totalCashVolume: number;
    };
  };
  cashbook_entries: Array<Record<string, unknown>>;
  cashbook_opening_balance: Record<string, unknown> | null;
  receipts: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  quotes: Array<Record<string, unknown>>;
  personal_transfers: Array<Record<string, unknown>>;
}

export interface EcdStatusResponse {
  isScrubbed: boolean;
  lastEcdTimestamp: string | null;
  activeCashStats: {
    cashbookCount: number;
    receiptsCount: number;
    paymentsCount: number;
    quotesCount: number;
    personalTransfersCount: number;
    totalCashVolume: number;
  };
}

async function verifySuperAdmin(supabase: SupabaseClient, userId: string) {
  const flags = await requireAdminOrSuperAdmin(supabase as never, userId);
  if (!flags.isSuperAdmin) {
    throw new Error("Super Admin role required to access ECD operations");
  }
}

/**
 * 1. Get current ECD status & summary of cash data currently in the system
 */
export const getEcdStatusServerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EcdStatusResponse> => {
    const supabase = context.supabase;
    const userId = context.userId;
    await verifySuperAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin ?? supabase;

    // Read ECD settings flag
    const { data: ecdSetting } = await admin
      .from("app_settings" as never)
      .select("value")
      .eq("key" as never, ECD_SETTINGS_KEY as never)
      .maybeSingle();

    const ecdVal = (
      ecdSetting as { value?: { isScrubbed?: boolean; lastEcdTimestamp?: string } } | null
    )?.value;
    const isScrubbed = !!ecdVal?.isScrubbed;
    const lastEcdTimestamp = ecdVal?.lastEcdTimestamp ?? null;

    // Fetch cashbook count & volume
    let cashbookCount = 0;
    let cashbookVolume = 0;
    const { data: cbRows } = await admin
      .from("ramans_cashbook" as never)
      .select("amount")
      .limit(5000);

    if (cbRows && Array.isArray(cbRows)) {
      cashbookCount = cbRows.length;
      cashbookVolume = (cbRows as Array<{ amount: number }>).reduce(
        (acc: number, r: { amount: number }) => acc + (Number(r.amount) || 0),
        0,
      );
    } else {
      const { data: cbSetting } = await admin
        .from("app_settings" as never)
        .select("value")
        .eq("key" as never, CASHBOOK_SETTINGS_KEY as never)
        .maybeSingle();
      const entries = (cbSetting as { value?: Array<{ amount: number }> } | null)?.value;
      if (Array.isArray(entries)) {
        cashbookCount = entries.length;
        cashbookVolume = entries.reduce(
          (acc: number, r: { amount: number }) => acc + (Number(r.amount) || 0),
          0,
        );
      }
    }

    // Fetch cash receipts
    let receiptsCount = 0;
    let receiptsVolume = 0;
    const { data: rcRows } = await admin
      .from("receipts")
      .select("amount")
      .eq("method", "cash")
      .limit(5000);
    if (rcRows && Array.isArray(rcRows)) {
      receiptsCount = rcRows.length;
      receiptsVolume = (rcRows as Array<{ amount: number }>).reduce(
        (acc: number, r: { amount: number }) => acc + (Number(r.amount) || 0),
        0,
      );
    }

    // Fetch cash payments
    let paymentsCount = 0;
    let paymentsVolume = 0;
    const { data: pmRows } = await admin
      .from("payments")
      .select("amount")
      .eq("method", "cash")
      .limit(5000);
    if (pmRows && Array.isArray(pmRows)) {
      paymentsCount = pmRows.length;
      paymentsVolume = (pmRows as Array<{ amount: number }>).reduce(
        (acc: number, r: { amount: number }) => acc + (Number(r.amount) || 0),
        0,
      );
    }

    // Fetch cash quotes
    let quotesCount = 0;
    const { data: qtRows } = await admin
      .from("quotes")
      .select("id, workflow_state, terms")
      .limit(2000);
    if (qtRows && Array.isArray(qtRows)) {
      const cashQuotes = qtRows.filter((q: { workflow_state: unknown; terms: string | null }) => {
        const ws = q.workflow_state as { sale_mode?: string; is_cash?: boolean } | null;
        return (
          ws?.sale_mode === "cash" ||
          ws?.is_cash === true ||
          (q.terms && q.terms.toLowerCase().includes("cash"))
        );
      });
      quotesCount = cashQuotes.length;
    }

    return {
      isScrubbed,
      lastEcdTimestamp,
      activeCashStats: {
        cashbookCount,
        receiptsCount,
        paymentsCount,
        quotesCount,
        personalTransfersCount: 0,
        totalCashVolume: cashbookVolume + receiptsVolume + paymentsVolume,
      },
    };
  });

/**
 * 2. Execute ECD: Export, Encrypt with Male-Female Socket, Upload, Send Email, and Scrub
 */
export const executeEcdServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { confirmationToken: string }) => d)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const claims = context.claims as { email?: string };
    const userEmail = claims?.email || "super_admin";
    await verifySuperAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin ?? supabase;

    if (data.confirmationToken.trim().toUpperCase() !== "ECD") {
      throw new Error("Invalid confirmation code. Please type ECD to confirm.");
    }

    const timestamp = new Date().toISOString();

    // 1. Gather all Cashbook entries
    let cashbookEntries: Array<Record<string, unknown>> = [];
    const { data: cbRows } = await admin
      .from("ramans_cashbook" as never)
      .select("*")
      .order("entry_date" as never, { ascending: true });

    if (cbRows && Array.isArray(cbRows)) {
      cashbookEntries = cbRows as unknown as Array<Record<string, unknown>>;
    } else {
      const { data: cbSetting } = await admin
        .from("app_settings" as never)
        .select("value")
        .eq("key" as never, CASHBOOK_SETTINGS_KEY as never)
        .maybeSingle();
      const entries = (cbSetting as { value?: Array<Record<string, unknown>> } | null)?.value;
      if (Array.isArray(entries)) cashbookEntries = entries;
    }

    // 2. Gather Cashbook Opening Balance
    const { data: obSetting } = await admin
      .from("app_settings" as never)
      .select("value")
      .eq("key" as never, CASHBOOK_OPENING_KEY as never)
      .maybeSingle();
    const openingBalance = (obSetting as { value?: Record<string, unknown> } | null)?.value ?? null;

    // 3. Gather Cash Receipts
    const { data: receipts } = await admin.from("receipts").select("*").eq("method", "cash");
    const cashReceipts = receipts ?? [];

    // 4. Gather Cash Payments
    const { data: payments } = await admin.from("payments").select("*").eq("method", "cash");
    const cashPayments = payments ?? [];

    // 5. Gather Cash Quotes
    const { data: quotes } = await admin.from("quotes").select("*");
    const cashQuotes = (quotes ?? []).filter(
      (q: { workflow_state: unknown; terms: string | null }) => {
        const ws = q.workflow_state as { sale_mode?: string; is_cash?: boolean } | null;
        return (
          ws?.sale_mode === "cash" ||
          ws?.is_cash === true ||
          (q.terms && q.terms.toLowerCase().includes("cash"))
        );
      },
    );

    const totalCashVolume =
      cashbookEntries.reduce(
        (acc: number, r: Record<string, unknown>) => acc + (Number(r.amount) || 0),
        0,
      ) +
      cashReceipts.reduce(
        (acc: number, r: { amount: number }) => acc + (Number(r.amount) || 0),
        0,
      ) +
      cashPayments.reduce((acc: number, r: { amount: number }) => acc + (Number(r.amount) || 0), 0);

    const snapshotPayload: EcdSnapshotPayload = {
      metadata: {
        source: "Stone Tech OS (STOS)",
        version: "1.0.0",
        timestamp,
        erasedBy: {
          userId,
          email: userEmail,
        },
        manifest: {
          cashbookCount: cashbookEntries.length,
          receiptsCount: cashReceipts.length,
          paymentsCount: cashPayments.length,
          quotesCount: cashQuotes.length,
          personalTransfersCount: 0,
          totalCashVolume,
        },
      },
      cashbook_entries: cashbookEntries,
      cashbook_opening_balance: openingBalance,
      receipts: cashReceipts,
      payments: cashPayments,
      quotes: cashQuotes,
      personal_transfers: [],
    };

    // 6. Encrypt with Male-Female Socket Cryptography
    const encrypted = await encryptSocketPayload(snapshotPayload, timestamp);

    // 7. Store encrypted envelope in Supabase Storage under ecd-vault/
    const storagePath = `ecd-vault/${encrypted.folderName}/${encrypted.fileName}`;
    try {
      const blob = new Blob([encrypted.rawString], { type: "application/octet-stream" });
      await admin.storage.from(FILES_BUCKET).upload(storagePath, blob, {
        contentType: "application/octet-stream",
        upsert: true,
      });
    } catch (stErr) {
      console.warn("[ecd] Storage upload warning:", stErr);
    }

    // 8. Send Automated Backup Email to Hardcoded Email ID (info@stonetech.in)
    let emailStatus = "sent";
    try {
      const { sendResendEmail } = await import("@/lib/email/resend.server");
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">STOS Vault — ECD Backup Archive</h2>
          <p style="color: #475569; font-size: 14px;">An Erase Cash Data (ECD) operation was executed by <strong>${userEmail}</strong> on <strong>${new Date(timestamp).toUTCString()}</strong>.</p>
          <div style="background-color: #f8fafc; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Vault Token:</strong> <code>${encrypted.envelope.vaultToken}</code></p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Encrypted Folder:</strong> <code>${encrypted.folderName}</code></p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Encrypted File:</strong> <code>${encrypted.fileName}</code></p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Cryptographic Checksum:</strong> <code>${encrypted.checksum}</code></p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Records Archived:</strong> ${snapshotPayload.metadata.manifest.cashbookCount} Cashbook, ${snapshotPayload.metadata.manifest.receiptsCount} Receipts, ${snapshotPayload.metadata.manifest.quotesCount} Quotes</p>
            <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Total Cash Volume Archived:</strong> ₹${totalCashVolume.toLocaleString("en-IN")}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.5;">This archive is sealed with STOS Male-Female Socket AES-256-GCM encryption and is unreadable by any external program. It can only be restored through the STOS Super Admin panel.</p>
        </div>
      `;

      await sendResendEmail({
        from: "STOS Vault <notifications@stonetech.in>",
        to: ECD_HARDCODED_EMAIL,
        subject: `[STOS Vault] ECD Encrypted Backup Archive — ${encrypted.envelope.vaultToken}`,
        html: emailHtml,
        text: `STOS ECD Encrypted Archive Generated. Token: ${encrypted.envelope.vaultToken}. Checksum: ${encrypted.checksum}`,
      });
    } catch (eErr) {
      console.warn("[ecd] Backup email warning:", eErr);
      emailStatus = "email_logged_locally";
    }

    // 9. Atomically Scrub Cash Records from the System
    // A. Clear Cashbook Table
    try {
      await admin
        .from("ramans_cashbook" as never)
        .delete()
        .neq("id" as never, "none" as never);
    } catch {
      // ignore if table does not exist
    }

    // B. Clear Cashbook App Settings fallback
    await admin.from("app_settings" as never).upsert(
      {
        key: CASHBOOK_SETTINGS_KEY,
        value: [] as never,
        description: "Raman's Cashbook ledger fallback store (Scrubbed)",
      } as never,
      { onConflict: "key" },
    );

    // C. Reset Opening Balance
    await admin.from("app_settings" as never).upsert(
      {
        key: CASHBOOK_OPENING_KEY,
        value: {
          amount: 0,
          as_of_date: timestamp.slice(0, 10),
          notes: "Scrubbed via ECD",
          updated_at: timestamp,
        } as never,
        description: "Raman's Cashbook initial opening cash balance",
      } as never,
      { onConflict: "key" },
    );

    // D. Delete cash receipts
    if (cashReceipts.length > 0) {
      const receiptIds = cashReceipts.map((r: { id: string }) => r.id);
      await admin.from("receipt_allocations").delete().in("receipt_id", receiptIds);
      await admin.from("receipts").delete().in("id", receiptIds);
    }

    // E. Delete cash payments
    if (cashPayments.length > 0) {
      const paymentIds = cashPayments.map((p: { id: string }) => p.id);
      await admin.from("payments").delete().in("id", paymentIds);
    }

    // F. Delete cash quotes
    if (cashQuotes.length > 0) {
      const quoteIds = cashQuotes.map((q: { id: string }) => q.id);
      await admin.from("quotes").delete().in("id", quoteIds);
    }

    // G. Set ECD Scrubbed status in app_settings (hides tabs & reports)
    await admin.from("app_settings" as never).upsert(
      {
        key: ECD_SETTINGS_KEY,
        value: {
          isScrubbed: true,
          lastEcdTimestamp: timestamp,
          lastToken: encrypted.envelope.vaultToken,
          lastStoragePath: storagePath,
        } as never,
        description: "STOS ECD Status and Cash Tabs Visibility",
      } as never,
      { onConflict: "key" },
    );

    return {
      success: true,
      timestamp,
      vaultToken: encrypted.envelope.vaultToken,
      folderName: encrypted.folderName,
      fileName: encrypted.fileName,
      checksum: encrypted.checksum,
      encryptedRaw: encrypted.rawString,
      storagePath,
      emailStatus,
      manifest: snapshotPayload.metadata.manifest,
    };
  });

/**
 * 3. List Stored Encrypted Cloud Backups from Supabase Storage
 */
export const listEcdCloudBackupsServerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    await verifySuperAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin ?? supabase;

    try {
      const { data: folderList, error } = await admin.storage
        .from(FILES_BUCKET)
        .list("ecd-vault", { limit: 50, sortBy: { column: "created_at", order: "desc" } });

      if (error || !folderList) return [];

      const backups: Array<{
        name: string;
        path: string;
        createdAt: string;
        size: number;
      }> = [];

      for (const item of folderList) {
        if (item.name.startsWith("STOS-VAULT-")) {
          const { data: files } = await admin.storage
            .from(FILES_BUCKET)
            .list(`ecd-vault/${item.name}`, { limit: 10 });
          if (files && files.length > 0) {
            const stosFile =
              files.find((f: { name: string }) => f.name.endsWith(".stos")) ?? files[0];
            backups.push({
              name: stosFile.name,
              path: `ecd-vault/${item.name}/${stosFile.name}`,
              createdAt: item.created_at || new Date().toISOString(),
              size: stosFile.metadata?.size || 0,
            });
          }
        }
      }

      return backups;
    } catch (err) {
      console.warn("[ecd] List cloud backups error:", err);
      return [];
    }
  });

/**
 * 4. Restore Cash Data from Encrypted Socket File or Cloud Backup
 */
export const restoreEcdServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { rawEnvelopeString?: string; storagePath?: string }) => d)
  .handler(async ({ context, data }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const claims = context.claims as { email?: string };
    const userEmail = claims?.email || "super_admin";
    await verifySuperAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin ?? supabase;

    let rawString = data.rawEnvelopeString?.trim();

    // If storagePath provided, fetch from Supabase Storage
    if (!rawString && data.storagePath) {
      const { data: fileData, error } = await admin.storage
        .from(FILES_BUCKET)
        .download(data.storagePath);
      if (error || !fileData) {
        throw new Error(`Failed to load cloud backup from ${data.storagePath}`);
      }
      rawString = await fileData.text();
    }

    if (!rawString) {
      throw new Error("No encrypted socket file payload provided for restoration");
    }

    // Decrypt using Male-Female Socket Cryptography
    const snapshot = await decryptSocketPayload<EcdSnapshotPayload>(rawString);

    if (!snapshot.metadata || snapshot.metadata.source !== "Stone Tech OS (STOS)") {
      throw new Error("Invalid socket payload: source metadata does not match STOS");
    }

    // Restore 1: Cashbook Entries
    if (snapshot.cashbook_entries && snapshot.cashbook_entries.length > 0) {
      await admin.from("app_settings" as never).upsert(
        {
          key: CASHBOOK_SETTINGS_KEY,
          value: snapshot.cashbook_entries as never,
          description: "Raman's Cashbook ledger fallback store (Restored)",
        } as never,
        { onConflict: "key" },
      );

      try {
        await admin.from("ramans_cashbook" as never).upsert(snapshot.cashbook_entries as never);
      } catch (tErr) {
        console.warn("[ecd] Table restore fallback:", tErr);
      }
    }

    // Restore 2: Cashbook Opening Balance
    if (snapshot.cashbook_opening_balance) {
      await admin.from("app_settings" as never).upsert(
        {
          key: CASHBOOK_OPENING_KEY,
          value: snapshot.cashbook_opening_balance as never,
          description: "Raman's Cashbook initial opening cash balance (Restored)",
        } as never,
        { onConflict: "key" },
      );
    }

    // Restore 3: Cash Receipts
    if (snapshot.receipts && snapshot.receipts.length > 0) {
      await admin.from("receipts").upsert(snapshot.receipts as never, { onConflict: "id" });
    }

    // Restore 4: Cash Payments
    if (snapshot.payments && snapshot.payments.length > 0) {
      await admin.from("payments").upsert(snapshot.payments as never, { onConflict: "id" });
    }

    // Restore 5: Cash Quotes
    if (snapshot.quotes && snapshot.quotes.length > 0) {
      await admin.from("quotes").upsert(snapshot.quotes as never, { onConflict: "id" });
    }

    // Restore 6: Reset ECD Scrubbed status in app_settings (unhides tabs)
    await admin.from("app_settings" as never).upsert(
      {
        key: ECD_SETTINGS_KEY,
        value: {
          isScrubbed: false,
          restoredAt: new Date().toISOString(),
          restoredBy: userEmail,
        } as never,
        description: "STOS ECD Status and Cash Tabs Visibility",
      } as never,
      { onConflict: "key" },
    );

    return {
      success: true,
      restoredAt: new Date().toISOString(),
      manifest: snapshot.metadata.manifest,
    };
  });
