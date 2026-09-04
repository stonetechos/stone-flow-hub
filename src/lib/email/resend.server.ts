/**
 * Resend sender — server-only. Replaces `sendLovableEmail()` from
 * `@lovable.dev/email-js` (removed as part of the deploy-independence
 * work — see docs/DEPLOYMENT.md). Used by both the auth-email queue
 * processor (`api/public/hooks/email-queue-process.ts`) and, via
 * `src/lib/notifications/providers/email.ts`, the general
 * business-notification queue once that provider is wired up (currently a
 * stub — out of scope here).
 *
 * Deliberately a thin raw-fetch wrapper, matching the style of
 * `src/lib/ai/gateway.server.ts`, rather than pulling in the `resend` npm
 * SDK for a single endpoint.
 */

export interface ResendSendRequest {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  /** Resend's own idempotency support — same header name it documents. */
  idempotencyKey?: string;
}

export interface ResendSendResponse {
  id: string;
}

/** Thrown on any non-2xx response. `.status` mirrors the HTTP status code so
 * existing duck-typed callers (`"status" in error`) keep working — see
 * `email-queue-process.ts`'s `isRateLimited`/`isForbidden`. */
export class ResendApiError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, message: string, retryAfterSeconds: number | null) {
    super(message);
    this.name = "ResendApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function apiKey(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY is not configured");
  return k;
}

export async function sendResendEmail(payload: ResendSendRequest): Promise<ResendSendResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey()}`,
  };
  if (payload.idempotencyKey) headers["Idempotency-Key"] = payload.idempotencyKey;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      // leave message as raw text
    }
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) || null : null;
    throw new ResendApiError(
      res.status,
      message || `Resend error ${res.status}`,
      retryAfterSeconds,
    );
  }

  return (await res.json()) as ResendSendResponse;
}
