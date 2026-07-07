/** WhatsApp providers. Meta Cloud API integration is wired but returns
 * `ProviderNotConfiguredError` until credentials are entered in
 * Settings → Notifications → WhatsApp. The runtime send happens in a server
 * function that reads token/phone-number-id/business-account-id from app_settings.
 */
import type { MessageProvider, OutboundMessage, SendResult } from "./types";
import { ProviderNotConfiguredError } from "./types";

function makeStub(id: string): MessageProvider {
  return {
    id,
    channel: "whatsapp",
    async send(_msg: OutboundMessage): Promise<SendResult> {
      throw new ProviderNotConfiguredError(id);
    },
  };
}

export const MetaCloudWhatsAppProvider = () => makeStub("meta_cloud");
export const TwilioWhatsAppProvider = () => makeStub("twilio_whatsapp");
