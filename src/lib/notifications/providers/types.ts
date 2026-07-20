/** Provider abstraction for outbound messaging.
 *
 * Every concrete provider (Resend, SMTP, SendGrid, SES, Meta WhatsApp Cloud, …)
 * implements the same interface, so business code never knows which service is
 * actually delivering a message. New providers plug in through the registry
 * without changing callers.
 */
export type MessageChannel = "email" | "whatsapp" | "sms";

export interface OutboundMessage {
  channel: MessageChannel;
  to: string;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  body: string;
  /** Free-form structured data providers may use (attachments, tags, template refs). */
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  providerMessageId: string | null;
  raw?: unknown;
}

export interface MessageProvider {
  readonly id: string; // "resend", "smtp", "meta_cloud", ...
  readonly channel: MessageChannel;
  send(msg: OutboundMessage): Promise<SendResult>;
}

/** Thrown by providers when their credentials are missing from Settings. */
export class ProviderNotConfiguredError extends Error {
  readonly providerId: string;
  constructor(providerId: string) {
    super(
      `Notification provider "${providerId}" is not configured yet. Add credentials in Settings → Notifications.`,
    );
    this.name = "ProviderNotConfiguredError";
    this.providerId = providerId;
  }
}
