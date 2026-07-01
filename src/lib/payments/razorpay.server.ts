/** Server-only Razorpay REST helpers. Never import from client code. */
const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function auth(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export type RazorpayPaymentLink = {
  id: string;
  short_url: string;
  amount: number;
  currency: string;
  status: string;
  expire_by?: number;
};

export async function rzpCreatePaymentLink(payload: {
  amountInPaise: number;
  currency: string;
  description: string;
  reference_id: string;
  customer: { name: string; contact?: string; email?: string };
  notes?: Record<string, string>;
}): Promise<RazorpayPaymentLink> {
  const body = {
    amount: payload.amountInPaise,
    currency: payload.currency,
    accept_partial: false,
    description: payload.description,
    reference_id: payload.reference_id,
    customer: payload.customer,
    notify: { sms: !!payload.customer.contact, email: !!payload.customer.email },
    reminder_enable: true,
    notes: payload.notes ?? {},
  };
  const res = await fetch(`${RAZORPAY_BASE}/payment_links`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as unknown;
  if (!res.ok) {
    const msg = (json as { error?: { description?: string } })?.error?.description ?? "Razorpay error";
    throw new Error(`Razorpay: ${msg}`);
  }
  return json as RazorpayPaymentLink;
}

export async function rzpCancelPaymentLink(providerLinkId: string): Promise<void> {
  const res = await fetch(`${RAZORPAY_BASE}/payment_links/${providerLinkId}/cancel`, {
    method: "POST",
    headers: { Authorization: auth() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay cancel failed: ${text}`);
  }
}
