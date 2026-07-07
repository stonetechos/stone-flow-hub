/** Payment Provider abstraction — parallel to notifications.
 *
 * Concrete adapters (Razorpay, Cashfree, Stripe, PayPal, bank APIs, Manual)
 * implement this interface, so the ERP treats every method the same when
 * recording receipts or reconciling refunds. Manual is always registered.
 */
export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntentResult {
  providerRef: string;
  checkoutUrl?: string | null;
  raw?: unknown;
}

export interface RefundRequest {
  providerRef: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  status: "pending" | "succeeded" | "failed";
  raw?: unknown;
}

export interface PaymentProvider {
  readonly id: string;
  createIntent(req: PaymentIntentRequest): Promise<PaymentIntentResult>;
  refund(req: RefundRequest): Promise<RefundResult>;
}

/** Registry — mirrors notifications registry style. */
const registry = new Map<string, () => PaymentProvider>();

export function registerPaymentProvider(id: string, factory: () => PaymentProvider) {
  registry.set(id, factory);
}

export function listPaymentProviderIds(): string[] {
  return Array.from(registry.keys());
}

export function resolvePaymentProvider(id: string): PaymentProvider | null {
  const f = registry.get(id);
  return f ? f() : null;
}

/** Always-available manual "provider" — bookkeeping only. */
registerPaymentProvider("manual", () => ({
  id: "manual",
  async createIntent(req) {
    return { providerRef: `manual-${Date.now()}`, checkoutUrl: null, raw: req };
  },
  async refund(req) {
    return { providerRef: req.providerRef, status: "succeeded" };
  },
}));
