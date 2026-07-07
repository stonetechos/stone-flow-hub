/** Email providers. Concrete implementations live server-side; this module
 * declares the interface contracts and stubs for the client.
 *
 * The actual `send()` is executed from a server function (see
 * `src/lib/notifications/queue.functions.ts`) using process.env credentials.
 * Providers are pluggable — swap Resend for SES/SendGrid/SMTP by editing the
 * factory function only.
 */
import type { MessageProvider, OutboundMessage, SendResult } from "./types";
import { ProviderNotConfiguredError } from "./types";

function makeStub(id: string): MessageProvider {
  return {
    id,
    channel: "email",
    async send(_msg: OutboundMessage): Promise<SendResult> {
      throw new ProviderNotConfiguredError(id);
    },
  };
}

export const ResendEmailProvider = () => makeStub("resend");
export const SmtpEmailProvider = () => makeStub("smtp");
export const SendGridEmailProvider = () => makeStub("sendgrid");
export const SesEmailProvider = () => makeStub("ses");
