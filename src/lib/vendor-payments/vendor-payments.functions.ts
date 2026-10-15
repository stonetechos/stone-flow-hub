/**
 * Server functions for Vendor Payments.
 *
 * Runs on the server with supabaseAdmin (service role) to guarantee that
 * authenticated staff can create, update, and delete vendor payments without
 * client-side RLS failures. Also directly ensures the vendor ledger entry
 * is maintained reliably.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  vendorPaymentCreateSchema,
  vendorPaymentUpdateSchema,
  type VendorPaymentCreateInput,
  type VendorPaymentUpdateInput,
} from "./schema";
import type { VendorPaymentRow } from "./api";

const createVendorPaymentInput = z.object({
  data: vendorPaymentCreateSchema,
});

export const createVendorPaymentServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => createVendorPaymentInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = data.data;
    const uid = context.userId;

    // Generate payment number if not present
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const generatedPaymentNo = `VPAY-${dateStr}-${randomSuffix}`;

    // 1. Insert the vendor payment record using supabaseAdmin
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("vendor_payments" as never)
      .insert({
        payment_no: generatedPaymentNo,
        vendor_id: p.vendor_id,
        purchase_order_id: p.purchase_order_id ?? null,
        grn_id: p.grn_id ?? null,
        project_id: p.project_id ?? null,
        payment_type: p.payment_type,
        amount: p.amount,
        currency_code: p.currency_code ?? "INR",
        method: p.method ?? null,
        reference_no: p.reference_no ?? null,
        paid_at: p.paid_at,
        notes: p.notes ?? null,
        created_by: uid,
      } as never)
      .select("*")
      .single();

    if (insErr) {
      throw new Error(insErr.message);
    }

    const row = inserted as unknown as VendorPaymentRow;

    // 2. Also ensure the vendor ledger entry is recorded directly
    try {
      const isCredit = p.payment_type === "credit_note";
      const debit = isCredit ? 0 : p.amount;
      const credit = isCredit ? p.amount : 0;
      const desc =
        `${p.payment_type.replace(/_/g, " ")} ${p.method ?? ""} ${p.reference_no ?? ""}`.trim();

      // Check if entry already exists
      const { data: existingLedger } = await supabaseAdmin
        .from("vendor_ledger_entries" as never)
        .select("id")
        .eq("source_type" as never, "vendor_payment" as never)
        .eq("source_id" as never, row.id as never)
        .maybeSingle();

      if (!existingLedger) {
        await supabaseAdmin.from("vendor_ledger_entries" as never).insert({
          vendor_id: p.vendor_id,
          entry_date: p.paid_at,
          source_type: "vendor_payment",
          source_id: row.id,
          ref_no: row.payment_no,
          description: desc,
          debit,
          credit,
          currency_code: p.currency_code ?? "INR",
          status: "posted",
          route: "payment",
          metadata: {},
          created_by: uid,
        } as never);
      }
    } catch (ledgerErr) {
      // Non-fatal if the DB trigger already recorded it
      console.warn("[createVendorPaymentServerFn] ledger insert note:", ledgerErr);
    }

    return row;
  });

const updateVendorPaymentInput = z.object({
  id: z.string().uuid(),
  data: vendorPaymentUpdateSchema,
});

export const updateVendorPaymentServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => updateVendorPaymentInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, data: p } = data;
    const uid = context.userId;

    // 1. Update the vendor payment record using supabaseAdmin
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("vendor_payments" as never)
      .update({
        vendor_id: p.vendor_id,
        purchase_order_id: p.purchase_order_id ?? null,
        grn_id: p.grn_id ?? null,
        project_id: p.project_id ?? null,
        payment_type: p.payment_type,
        amount: p.amount,
        currency_code: p.currency_code ?? "INR",
        method: p.method ?? null,
        reference_no: p.reference_no ?? null,
        paid_at: p.paid_at,
        notes: p.notes ?? null,
      } as never)
      .eq("id", id)
      .select("*")
      .single();

    if (updErr) {
      throw new Error(updErr.message);
    }

    const row = updated as unknown as VendorPaymentRow;

    // 2. Ensure vendor ledger entry is updated in sync
    try {
      const isCredit = p.payment_type === "credit_note";
      const debit = isCredit ? 0 : p.amount;
      const credit = isCredit ? p.amount : 0;
      const desc =
        `${p.payment_type.replace(/_/g, " ")} ${p.method ?? ""} ${p.reference_no ?? ""}`.trim();

      const { data: existingLedger } = await supabaseAdmin
        .from("vendor_ledger_entries" as never)
        .select("id")
        .eq("source_type" as never, "vendor_payment" as never)
        .eq("source_id" as never, id as never)
        .maybeSingle();

      if (existingLedger) {
        await supabaseAdmin
          .from("vendor_ledger_entries" as never)
          .update({
            vendor_id: p.vendor_id,
            entry_date: p.paid_at,
            ref_no: row.payment_no,
            description: desc,
            debit,
            credit,
            currency_code: p.currency_code ?? "INR",
            status: "posted",
            route: "payment",
          } as never)
          .eq("id", (existingLedger as { id: string }).id);
      } else {
        await supabaseAdmin.from("vendor_ledger_entries" as never).insert({
          vendor_id: p.vendor_id,
          entry_date: p.paid_at,
          source_type: "vendor_payment",
          source_id: row.id,
          ref_no: row.payment_no,
          description: desc,
          debit,
          credit,
          currency_code: p.currency_code ?? "INR",
          status: "posted",
          route: "payment",
          metadata: {},
          created_by: uid,
        } as never);
      }
    } catch (ledgerErr) {
      console.warn("[updateVendorPaymentServerFn] ledger update note:", ledgerErr);
    }

    return row;
  });

const deleteVendorPaymentInput = z.object({
  id: z.string().uuid(),
});

export const deleteVendorPaymentServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => deleteVendorPaymentInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id } = data;

    // Remove ledger entry first (also handled by trg_vpay_after_del)
    await supabaseAdmin
      .from("vendor_ledger_entries" as never)
      .delete()
      .eq("source_type" as never, "vendor_payment" as never)
      .eq("source_id" as never, id as never);

    const { error } = await supabaseAdmin
      .from("vendor_payments" as never)
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });
