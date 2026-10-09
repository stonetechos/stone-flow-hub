/**
 * Shared WhatsApp click-to-chat & business profile utilities.
 *
 * Used across the ERP (Receipts, Invoices, Quotations, Estimates, Sales Orders,
 * Follow-ups, Leads) to open WhatsApp directly to the customer's chat with
 * pre-filled message text so the human operator can review and press Enter to send.
 *
 * Supports:
 *  - WhatsApp Desktop / WhatsApp for Business native app (`whatsapp://send`)
 *  - WhatsApp Web direct (`https://web.whatsapp.com/send`)
 *  - Standard WhatsApp link (`https://wa.me`)
 */

export type WhatsappMode = "app" | "web" | "wa.me";

const STORAGE_KEY = "stos_whatsapp_mode";

/**
 * Normalizes a phone number for WhatsApp click-to-chat.
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
 * Builds the native WhatsApp desktop/mobile app protocol link.
 * On macOS and Windows, this directly launches the installed WhatsApp or
 * WhatsApp for Business desktop app into the contact's chat with text pre-filled.
 */
export function buildWhatsappAppUrl(phone: string, text: string): string {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  const encodedText = encodeURIComponent(text);
  if (!normalizedPhone) {
    return `whatsapp://send?text=${encodedText}`;
  }
  return `whatsapp://send?phone=${normalizedPhone}&text=${encodedText}`;
}

/**
 * Builds a direct WhatsApp Web URL, opening web.whatsapp.com without intermediate redirects.
 */
export function buildWhatsappWebUrl(phone: string, text: string): string {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  const encodedText = encodeURIComponent(text);
  if (!normalizedPhone) {
    return `https://web.whatsapp.com/send?text=${encodedText}`;
  }
  return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`;
}

/**
 * Builds the standard https://wa.me link.
 */
export function buildWhatsappWaMeUrl(phone: string, text: string): string {
  const normalizedPhone = normalizeWhatsappPhone(phone);
  const encodedText = encodeURIComponent(text);
  if (!normalizedPhone) {
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

/**
 * Reads user's stored WhatsApp mode preference ("app" | "web" | "wa.me").
 * Defaults to "app" (WhatsApp Desktop / WhatsApp for Business).
 */
export function getWhatsappModePreference(): WhatsappMode {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "web" || saved === "wa.me" || saved === "app") {
        return saved;
      }
    }
  } catch {
    /* ignore localStorage errors */
  }
  return "app";
}

/**
 * Sets user's WhatsApp mode preference in localStorage.
 */
export function setWhatsappModePreference(mode: WhatsappMode): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Builds the WhatsApp URL according to mode (defaults to preferred mode or "app").
 */
export function buildWhatsappUrl(phone: string, text: string, mode?: WhatsappMode): string {
  const selectedMode = mode ?? getWhatsappModePreference();
  if (selectedMode === "web") {
    return buildWhatsappWebUrl(phone, text);
  }
  if (selectedMode === "wa.me") {
    return buildWhatsappWaMeUrl(phone, text);
  }
  return buildWhatsappAppUrl(phone, text);
}

/**
 * Checks whether native Web Share API is available (optionally for files).
 */
export function canNativeShare(files?: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (files && files.length > 0) {
    return typeof navigator.canShare === "function" && navigator.canShare({ files });
  }
  return true;
}

/**
 * Triggers native system share dialog (e.g. macOS / iOS / Android share sheet).
 */
export async function shareViaNativeShare(data: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (!canNativeShare(data.files)) return false;
  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return false; // User cancelled
    }
    throw err;
  }
}

export interface OpenWhatsappOptions {
  mode?: WhatsappMode;
}

/**
 * Opens WhatsApp (desktop app, WhatsApp Web, or wa.me) to the recipient with the message pre-filled.
 * Works across desktop browsers (Safari, Chrome), mobile web, and Capacitor app.
 *
 * If mode is "app" (default), it invokes `whatsapp://send` to directly open
 * the WhatsApp / WhatsApp for Business desktop application.
 *
 * An optional pre-opened Window reference can be passed when preparing data asynchronously
 * (e.g. fetching document PDF/details), which bypasses Safari's popup blocker for Web/wa.me modes.
 */
export function openWhatsappToContact(
  phone: string,
  text: string,
  targetWindow?: Window | null,
  options?: OpenWhatsappOptions,
): boolean {
  const mode = options?.mode ?? getWhatsappModePreference();
  const url = buildWhatsappUrl(phone, text, mode);

  if (typeof window === "undefined" && !targetWindow) return false;

  // Mode "app": launch protocol handler directly
  if (mode === "app") {
    // If a target window was pre-opened for another purpose, close it so no blank tab is left
    if (targetWindow && !targetWindow.closed) {
      try {
        targetWindow.close();
      } catch {
        /* ignore */
      }
    }

    try {
      const a = document.createElement("a");
      a.href = url;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch {
          /* ignore */
        }
      }, 500);
      return true;
    } catch {
      window.location.assign(url);
      return true;
    }
  }

  // Mode "web" or "wa.me": use browser window navigation
  if (targetWindow && !targetWindow.closed) {
    try {
      targetWindow.location.href = url;
      targetWindow.focus?.();
      return true;
    } catch {
      // Continue to fallback
    }
  }

  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win && !win.closed) {
      win.focus?.();
      return true;
    }
  } catch {
    // Popup blocked or denied
  }

  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {
        /* ignore */
      }
    }, 500);
    return true;
  } catch {
    window.location.assign(url);
    return true;
  }
}
