import { normalizeWhatsappPhone } from "@/lib/whatsapp";

export interface BuildQuoteUpdateMessageParams {
  quoteNo: string;
  total?: number | null;
  customerName?: string | null;
  projectName?: string | null;
  validUntil?: string | null;
  customNote?: string | null;
}

/**
 * Builds a polite, professional WhatsApp reminder asking the client for an update
 * on a sent quotation. Mentions the quotation number, total amount, project name,
 * and explicitly offers room for negotiation or re-structuring of products.
 */
export function buildQuoteUpdateWhatsappMessage(params: BuildQuoteUpdateMessageParams): string {
  const quoteNo = params.quoteNo || "Quotation";
  const greetingName = params.customerName?.trim() ? ` ${params.customerName.trim()}` : "";
  const projectClause = params.projectName?.trim() ? ` for *${params.projectName.trim()}*` : "";
  const totalClause =
    typeof params.total === "number" && !isNaN(params.total) && params.total > 0
      ? ` (Total: *₹${Math.round(params.total).toLocaleString("en-IN")}*)`
      : "";

  const lines = [
    `Namaste${greetingName}! 🙏`,
    "",
    `Following up from *Stone Tech Architectural Atelier* regarding our Quotation *${quoteNo}*${projectClause}${totalClause}.`,
    "",
    "We wanted to check on the status of the quotation we sent earlier. We are eagerly expecting your kind confirmation or reply on the proposal.",
    "",
    "If any further negotiation, quantity adjustment, or re-structuring / alternative selection of stone products, finishes, or specifications is required, please do let us know — we are more than happy to tailor the proposal to your exact project requirements!",
  ];

  if (params.customNote?.trim()) {
    lines.push("", params.customNote.trim());
  }

  lines.push("", "Warm regards,", "*Stone Tech Architectural Atelier*", "Ahmedabad, Gujarat");

  return lines.join("\n");
}

export interface CandidateContact {
  label: string;
  phone: string;
  rawPhone: string;
  isPrimary?: boolean;
}

/**
 * Extracts candidate phone numbers for a customer / quotation,
 * prioritizing WhatsApp numbers, then primary phone, then contact persons.
 */
export function extractCandidatePhones(input: {
  customer?: {
    name?: string | null;
    primary_phone?: string | null;
    whatsapp?: string | null;
  } | null;
  contacts?: Array<{
    name?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    designation?: string | null;
    is_primary?: boolean;
  }> | null;
}): CandidateContact[] {
  const candidates: CandidateContact[] = [];
  const seen = new Set<string>();

  const add = (raw: string | null | undefined, label: string, isPrimary = false) => {
    if (!raw) return;
    const normalized = normalizeWhatsappPhone(raw);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push({
      label,
      phone: normalized,
      rawPhone: raw,
      isPrimary,
    });
  };

  const cust = input.customer;
  if (cust?.whatsapp) {
    add(cust.whatsapp, `${cust.name || "Customer"} (WhatsApp)`, true);
  }
  if (cust?.primary_phone) {
    add(cust.primary_phone, `${cust.name || "Customer"} (Primary)`, !cust.whatsapp);
  }

  if (Array.isArray(input.contacts)) {
    for (const c of input.contacts) {
      const contactLabel = c.name
        ? `${c.name}${c.designation ? ` - ${c.designation}` : ""}`
        : "Contact";
      if (c.whatsapp) {
        add(c.whatsapp, `${contactLabel} (WhatsApp)`, c.is_primary);
      }
      if (c.phone) {
        add(c.phone, contactLabel, c.is_primary);
      }
    }
  }

  return candidates;
}
