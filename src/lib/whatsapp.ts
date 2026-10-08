/**
 * Shared WhatsApp click-to-chat utilities.
 *
 * Used across the ERP (Receipts, Invoices, Quotations, Estimates, Sales Orders,
 * Follow-ups, Leads) to open WhatsApp directly to the customer's chat with
 * pre-filled message text so the human operator can review and press Enter to send.
 */

/**
 * Normalizes a phone number for WhatsApp click-to-chat (wa.me).
 * - Strips non-digit characters.
 * - Strips leading trunk '0' on 11-digit numbers.
 * - Defaults 10-digit Indian numbers to '91' country code.
 * - Leaves full international numbers intact.
 */
export function normalizeWhatsappPhone(phone?: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Builds the official WhatsApp click-to-chat URL.
 * If phone is provided, targets that specific contact directly.
 * If phone is empty, opens WhatsApp share intent to select any contact.
 */
export function buildWhatsappUrl(phone: string, text: string): string {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  const encodedText = encodeURIComponent(text);
  if (!normalizedPhone) {
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

/**
 * Opens WhatsApp (web or app) to the recipient with the message pre-filled.
 * Works across desktop browsers (Safari, Chrome), mobile web, and Capacitor app.
 */
export function openWhatsappToContact(phone: string, text: string): boolean {
  const url = buildWhatsappUrl(phone, text);
  if (typeof window === "undefined") return false;
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      window.location.assign(url);
    }
    return true;
  } catch {
    window.location.assign(url);
    return true;
  }
}
