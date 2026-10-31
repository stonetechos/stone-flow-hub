/**
 * Stone Tech OS (STOS) — Quotation Terms & Conditions Engine
 *
 * Implements standard, polished terms & conditions for:
 * 1. Supply Only (7 terms)
 * 2. Supply + Installation (9 terms)
 *
 * Dynamic Business Rules:
 * - Delivery Timeline: Dynamic input via Number of Days OR "On or Before Date".
 * - Payment Terms:
 *   - If Total Amount < ₹50,000: 100% Advance Payment.
 *   - If Total Amount >= ₹50,000 and Supply Only: 80% Advance Token + 20% on Delivery/Prior to Dispatch.
 *   - If Total Amount >= ₹50,000 and Supply + Installation: 50% Advance Token + 30% on Delivery + 20% upon Installation Completion.
 * - Natural Stone Characteristics & Material Evolution clauses.
 * - Non-returnable goods clause.
 * - Local transportation conveyance clause.
 * - Scaffolding & Wall Surface Undulations clauses (for Supply + Installation).
 * - Exclusive Ahmedabad Jurisdiction.
 */

export type DealScope = "supply_only" | "supply_and_installation";
export type DeliveryTimelineMode = "days" | "date";

export const ADVANCE_PAYMENT_THRESHOLD_INR = 50000;
export const EARLY_PAYMENT_DISCOUNT_DISCLAIMER = "Premake 100% payment to avail 5% discount.";

export interface QuoteTermsOptions {
  dealScope?: DealScope;
  totalAmount?: number;
  timelineMode?: DeliveryTimelineMode;
  timelineDays?: number | string;
  deliveryDate?: string;
  customTimelineText?: string;
  clientProvidedSlab?: boolean;
}

/** Formats a date string (YYYY-MM-DD or readable) into Indian standard "DD MMM YYYY". */
export function formatTimelineDate(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return "";
  const trimmed = dateStr.trim();
  // If in YYYY-MM-DD format
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const [, year, month, day] = match;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${parseInt(day, 10)} ${monthName} ${year}`;
  }
  return trimmed;
}

/** Builds the delivery timeline term text. */
export function buildDeliveryTimelineTerm(
  mode: DeliveryTimelineMode = "days",
  options: {
    timelineDays?: number | string;
    deliveryDate?: string;
    customTimelineText?: string;
  } = {},
): string {
  if (options.customTimelineText && options.customTimelineText.trim()) {
    const text = options.customTimelineText.trim();
    if (/days|date|before|timeline/i.test(text)) {
      return `The time duration to deliver and dispatch the product is ${text}.`;
    }
    return `The time duration to deliver and dispatch the product is ${text} days.`;
  }

  if (mode === "date" && options.deliveryDate && options.deliveryDate.trim()) {
    const formatted = formatTimelineDate(options.deliveryDate);
    return `The product delivery and dispatch will be completed on or before ${formatted}, subject to site readiness and advance payment clearance.`;
  }

  const rawDays = options.timelineDays !== undefined ? String(options.timelineDays).trim() : "";
  if (rawDays) {
    // If the user already wrote "15 days" or "10-15 working days"
    const daysStr = rawDays.toLowerCase().includes("day") ? rawDays : `${rawDays} days`;
    return `The time duration to deliver and dispatch the product is ${daysStr} from the date of design confirmation and advance payment clearance.`;
  }

  return `The estimated delivery and dispatch timeline will be communicated upon order confirmation and advance payment clearance.`;
}

/** Builds the payment terms term text based on total amount and deal scope. */
export function buildPaymentTermsTerm(
  dealScope: DealScope = "supply_only",
  totalAmount: number = 0,
): string {
  const isUnderFiftyThousand = totalAmount > 0 && totalAmount < ADVANCE_PAYMENT_THRESHOLD_INR;
  const discountDisclaimer = EARLY_PAYMENT_DISCOUNT_DISCLAIMER;

  if (isUnderFiftyThousand) {
    return `The payment terms are 100% advance payment required upon order confirmation prior to material procurement and dispatch (applicable for order value under ₹50,000). ${discountDisclaimer}`;
  }

  if (dealScope === "supply_and_installation") {
    return `The payment terms are 50% advance token upon order booking, 30% on delivery of the material at site, and the remaining 20% balance payment to be provided upon completion of installation. ${discountDisclaimer}`;
  }

  // Supply only
  return `The payment terms are 80% advance token upon order booking, and the remaining 20% balance payment has to be provided once the material gets delivered / prior to dispatch. ${discountDisclaimer}`;
}

/** Builds the priority breakage liability disclaimer term when stone slab is provided by the client. */
export function buildClientProvidedSlabBreakageTerm(): string {
  return `Priority Condition — Client-Supplied Stone / Slab Breakage Disclaimer: As the base stone slab / material is provided directly by the client, Stone Tech undertakes CNC job work, carving, handling, and transportation strictly at the client's own risk. Stone Tech holds no responsibility or financial liability for any damage, cracking, fracturing, or breakage of the slab during CNC job work, carving, handling, fabrication, or transit if the natural stone exhibits inherent brittleness, internal fissures, structural weakness, or easily crackable characteristics.`;
}

/** Generates the complete list of polished terms and conditions as individual strings. */
export function getQuoteTermsList(options: QuoteTermsOptions = {}): string[] {
  const scope: DealScope = options.dealScope || "supply_only";
  const total = Number(options.totalAmount) || 0;
  const mode: DeliveryTimelineMode =
    options.timelineMode || (options.deliveryDate ? "date" : "days");

  const deliveryTerm = buildDeliveryTimelineTerm(mode, {
    timelineDays: options.timelineDays,
    deliveryDate: options.deliveryDate,
    customTimelineText: options.customTimelineText,
  });

  const paymentTerm = buildPaymentTermsTerm(scope, total);

  const rawTerms: string[] = [];

  // Priority condition #1 when client provides stone slab
  if (options.clientProvidedSlab) {
    rawTerms.push(buildClientProvidedSlabBreakageTerm());
  }

  rawTerms.push(
    `Delivery Timeline: ${deliveryTerm}`,
    `Payment Terms: ${paymentTerm}`,
    `Natural Variation: This is a natural stone product; variation in color, veining, tonal shade, and surface texture is an inherent characteristic and consistency cannot be guaranteed.`,
    `Material Evolution: Natural stone has the intrinsic tendency to show its geological character, oxidation, or natural tonal patina after days or months post-installation, which cannot be predicted despite technical expertise.`,
    `Non-Returnable: Material once sold, custom fabricated, cut, or dispatched will not be taken back, exchanged, or cancelled under any circumstances.`,
    `Transportation & Freight: Local transportation, freight, and unloading, if not explicitly itemized in this quotation, will be charged extra at actuals and conveyed during dispatch.`,
  );

  if (scope === "supply_and_installation") {
    rawTerms.push(
      `Scaffolding & Site Facilities: Necessary scaffolding, H-frames, electricity, water, and secure material storage at the site must be provided by the client.`,
      `Site & Surface Readiness: The workable surface must be verified by the client prior to initiation of installation; Stone Tech will not be held responsible for substrate defects, wall undulations, or existing structural alignment flaws on the workable wall.`,
      `Jurisdiction: Any dispute arising out of or related to this quotation is strictly subject to Ahmedabad Jurisdiction.`,
    );
  } else {
    rawTerms.push(
      `Jurisdiction: Any dispute arising out of or related to this quotation is strictly subject to Ahmedabad Jurisdiction.`,
    );
  }

  return rawTerms.map((term, idx) => `${idx + 1}. ${term}`);
}

/** Generates the full formatted Terms & Conditions string for storing in `quotes.terms` or appending to PDF/WhatsApp. */
export function generateQuoteTerms(options: QuoteTermsOptions = {}): string {
  return getQuoteTermsList(options).join("\n\n");
}

/** Helper to detect deal scope from line items. */
export function detectDealScopeFromItems(
  items: Array<{ fulfilment?: string | null; description?: string }>,
): DealScope {
  const hasInstall = items.some((it) => {
    if (it.fulfilment === "supply_and_installation") return true;
    const desc = (it.description || "").toLowerCase();
    return (
      desc.includes("installation") ||
      desc.includes("fixing") ||
      desc.includes("labour") ||
      desc.includes("fitting")
    );
  });
  return hasInstall ? "supply_and_installation" : "supply_only";
}

/** Helper to detect if a quotation involves client-provided stone / slab from items or worksheet metadata. */
export function detectClientProvidedSlabFromItems(
  items?: Array<{ description?: string | null; unit_price?: number | string | null }>,
  worksheet?: unknown,
): boolean {
  // Check worksheet metadata if available
  if (worksheet && typeof worksheet === "object") {
    const ws = worksheet as Record<string, unknown>;
    const slab = ws.slab as Record<string, unknown> | undefined;
    if (slab && typeof slab === "object" && slab.sourcing === "client_provided") return true;
    if (ws.baseStoneSourcing === "client_provided") return true;
    const overlay = ws.overlay as Record<string, unknown> | undefined;
    if (overlay && typeof overlay === "object" && overlay.sourcing === "client_provided")
      return true;
  }

  // Check line items descriptions & notes
  if (Array.isArray(items)) {
    return items.some((it) => {
      const desc = (it.description || "").toLowerCase();
      const isClientProvided =
        desc.includes("provided by client") ||
        desc.includes("client-provided") ||
        desc.includes("client provided") ||
        desc.includes("client scope") ||
        desc.includes("supplied by client");

      if (isClientProvided) return true;

      // In case description has "base stone" and unit_price is 0
      if (
        (desc.includes("base stone") || desc.includes("slab")) &&
        (Number(it.unit_price) === 0 || it.unit_price === "0") &&
        desc.includes("client")
      ) {
        return true;
      }
      return false;
    });
  }

  return false;
}

/** Checks whether a terms text already contains the client breakage disclaimer clause. */
export function hasClientBreakageDisclaimer(termsText?: string | null): boolean {
  if (!termsText) return false;
  const lower = termsText.toLowerCase();
  return (
    lower.includes("client-supplied stone") ||
    lower.includes("slab breakage disclaimer") ||
    lower.includes("breakage of the slab") ||
    lower.includes("brittle and easily crackable")
  );
}

/** Checks whether a terms text already contains the early payment discount disclaimer clause. */
export function hasEarlyPaymentDiscountDisclaimer(termsText?: string | null): boolean {
  if (!termsText) return false;
  const lower = termsText.toLowerCase();
  return (
    lower.includes("100% payment") && (lower.includes("5% discount") || lower.includes("avail 5%"))
  );
}
