/** Payment Links — provider-agnostic. Manual mode fully functional; gateway providers
 *  are stubbed behind feature flags until credentials are configured. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";
import { getAppSetting } from "@/lib/app-settings/api";

export type PaymentLinkRow = DbTable<"payment_links">;
export type PaymentProvider = "manual" | "razorpay" | "cashfree" | "stripe" | "paypal";

export interface CreatePaymentLinkInput {
  provider: PaymentProvider;
  entityType: string;
  entityId: string;
  customerId?: string | null;
  amount: number;
  currency?: string;
  expiresAt?: string | null;
  meta?: Record<string, unknown>;
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isProviderEnabled(p: PaymentProvider): Promise<boolean> {
  if (p === "manual") return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flags = (await getAppSetting<any>("feature_flags" as never)) ?? {};
  return Boolean(flags[p]);
}

export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkRow> {
  const enabled = await isProviderEnabled(input.provider);
  if (!enabled) throw new AppError(`${input.provider} gateway is not yet enabled. Configure it in Settings → Payment Providers.`);

  const token = randomToken();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/pay/${token}`;

  // Manual mode: the ERP itself hosts /pay/$token and shows bank/UPI details.
  // Gateway providers would exchange the token for a hosted URL — implemented
  // lazily inside their adapters once secrets are configured.
  const { data, error } = await (supabase.from as unknown as (t: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insert: (v: unknown) => any;
  })("payment_links")
    .insert({
      provider: input.provider,
      entity_type: input.entityType,
      entity_id: input.entityId,
      invoice_id: input.entityType === "invoice" ? input.entityId : null,
      amount: input.amount,
      currency: input.currency ?? "INR",
      currency_code: input.currency ?? "INR",
      token,
      short_url: url,
      status: "created",
      expires_at: input.expiresAt ?? null,
      meta: { ...(input.meta ?? {}), customer_id: input.customerId ?? null, url },
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function getPaymentLinkByToken(token: string): Promise<PaymentLinkRow | null> {
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

export async function listPaymentLinksForEntity(entityType: string, entityId: string) {
  const { data, error } = await supabase
    .from("payment_links")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

export async function markPaymentLinkPaid(id: string, providerRef?: string): Promise<void> {
  const { error } = await supabase
    .from("payment_links")
    .update({ status: "paid", provider_ref: providerRef ?? null })
    .eq("id", id);
  if (error) throw new AppError(mapDbError(error));
}
