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
 *
 * An optional pre-opened Window reference can be passed when preparing data asynchronously
 * (e.g. fetching document PDF/details), which bypasses Safari's popup blocker.
 */
export function openWhatsappToContact(
  phone: string,
  text: string,
  targetWindow?: Window | null,
): boolean {
  const url = buildWhatsappUrl(phone, text);
  if (typeof window === "undefined" && !targetWindow) return false;

  // 1. If targetWindow was pre-opened in the synchronous click gesture:
  if (targetWindow && !targetWindow.closed) {
    try {
      targetWindow.location.href = url;
      targetWindow.focus?.();
      return true;
    } catch {
      // Continue to fallback
    }
  }

  // 2. Try window.open
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win && !win.closed) {
      win.focus?.();
      return true;
    }
  } catch {
    // Popup blocked or denied
  }

  // 3. Fallback: create temporary DOM anchor and click it
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    // 4. Last resort: location.assign
    window.location.assign(url);
    return true;
  }
}
