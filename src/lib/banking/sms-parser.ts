/**
 * Smart Transaction SMS & UPI Message Parser for Stone Tech OS.
 *
 * Automatically parses credit and debit transaction notifications from:
 * - Paytm (Merchant QR, Wallet, Payments Bank)
 * - Google Pay (GPay Business, UPI)
 * - PhonePe
 * - Indian Commercial Banks (SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, IndusInd)
 */

export interface ParsedTransaction {
  raw: string;
  source: "paytm" | "gpay" | "phonepe" | "bank_sms" | "manual";
  transaction_type: "credit" | "debit";
  amount: number;
  utr_number: string | null;
  counterparty_name: string | null;
  account_last4: string | null;
  date: string | null;
  confidence: number;
}

export function parseTransactionMessage(text: string): ParsedTransaction | null {
  if (!text || typeof text !== "string") return null;
  const clean = text.trim();
  if (clean.length < 10) return null;

  // 1. Detect Source
  let source: ParsedTransaction["source"] = "manual";
  const lower = clean.toLowerCase();

  if (lower.includes("paytm")) {
    source = "paytm";
  } else if (lower.includes("google pay") || lower.includes("gpay")) {
    source = "gpay";
  } else if (lower.includes("phonepe") || lower.includes("phone pe")) {
    source = "phonepe";
  } else if (
    lower.includes("bank") ||
    lower.includes("sbi") ||
    lower.includes("hdfc") ||
    lower.includes("icici") ||
    lower.includes("axis") ||
    lower.includes("kotak") ||
    lower.includes("pnb") ||
    lower.includes("bob") ||
    lower.includes("a/c") ||
    lower.includes("acct") ||
    lower.includes("upi")
  ) {
    source = "bank_sms";
  }

  // 2. Detect Transaction Type (Credit vs Debit)
  let transaction_type: "credit" | "debit" = "credit";
  const isDebit =
    /(?:debited|spent|paid to|sent to|withdrawn|dr\b|purchase of)/i.test(clean) &&
    !/(?:refund|reversal|credited back)/i.test(clean);
  const isCredit = /(?:credited|received|deposited|cr\b|inward|transferred to your)/i.test(clean);

  if (isDebit && !isCredit) {
    transaction_type = "debit";
  } else {
    transaction_type = "credit";
  }

  // 3. Extract Amount
  // Matches: ₹ 45,000.00, INR 45000, Rs. 1,50,000.50, Rs 50000, etc.
  let amount = 0;
  const amountRegexes = [
    /(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?))/i,
    /(?:credited|debited|received|deposited|for|by)\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
  ];

  for (const rx of amountRegexes) {
    const m = clean.match(rx);
    if (m && m[1]) {
      const numStr = m[1].replace(/,/g, "");
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0) {
        amount = val;
        break;
      }
    }
  }

  if (amount <= 0) {
    return null;
  }

  // 4. Extract UTR / UPI Reference / Transaction ID
  let utr_number: string | null = null;
  const utrPatterns = [
    /(?:upi\s*(?:ref|reference)?\s*(?:no\.?|id|num)?[:\s-]*|ref\s*no\.?[:\s-]*|utr\s*(?:no\.?)?[:\s-]*|txn\s*(?:id)?[:\s-]*)(\d{10,18}|[A-Z0-9]{10,22})/i,
    /UPI\/[^/]+\/(\d{10,18})/i,
    /UPI\/(\d{10,18})/i,
    /(?:UPI|NEFT|RTGS|IMPS)[-\s]*([A-Z0-9]{10,22})/i,
  ];

  for (const rx of utrPatterns) {
    const m = clean.match(rx);
    if (m && m[1]) {
      utr_number = m[1].trim();
      break;
    }
  }

  // 5. Extract Counterparty / Sender / Payer Name
  let counterparty_name: string | null = null;
  const partyPatterns = [
    /from\s+UPI\/([^/]+)\/\d+/i,
    /(?:from|by)\s+(?:UPI\/[\d]+\/)?([A-Za-z\s.]{3,35})(?:\s+(?:on|via|ref|upi|dated|\(|$))/i,
    /(?:from|payer:?)\s+([A-Za-z\s.]{3,35})(?:\s*\(|\s+on|\s+dated|$|\.)/i,
    /(?:towards|info:?)\s+([A-Za-z0-9*_\s.]{3,35})/i,
  ];

  for (const rx of partyPatterns) {
    const m = clean.match(rx);
    if (m && m[1]) {
      const candidate = m[1].trim().replace(/[.,;]$/, "");
      // Filter out common false positives like "UPI", "NEFT", "SBI", "your A/C"
      if (!/^(upi|neft|rtgs|imps|sbi|hdfc|icici|axis|your|bank)$/i.test(candidate)) {
        counterparty_name = candidate;
        break;
      }
    }
  }

  // 6. Extract Account last 4 digits
  let account_last4: string | null = null;
  const accMatch = clean.match(/(?:a\/c|acct|account|ending|card)[^\d]*(\d{4})\b/i);
  if (accMatch && accMatch[1]) {
    account_last4 = accMatch[1];
  }

  // 7. Extract Date
  let date: string | null = null;
  const dateMatch = clean.match(/\b(\d{1,2}[-/.](?:[A-Za-z]{3}|\d{1,2})[-/.]\d{2,4})\b/);
  if (dateMatch && dateMatch[1]) {
    date = dateMatch[1];
  }

  // Calculate confidence score
  let confidence = 0.5;
  if (amount > 0) confidence += 0.2;
  if (utr_number) confidence += 0.2;
  if (counterparty_name) confidence += 0.1;

  return {
    raw: clean,
    source,
    transaction_type,
    amount,
    utr_number,
    counterparty_name,
    account_last4,
    date,
    confidence: Math.min(confidence, 1),
  };
}

/**
 * Splits multiple messages if pasted together (e.g. separated by blank lines or headers)
 */
export function parseMultipleTransactionMessages(text: string): ParsedTransaction[] {
  if (!text) return [];
  // Split on double newlines or common SMS dividers
  const chunks = text
    .split(
      /\n\s*\n|(?=Dear\s+[A-Za-z]+\s*User)|(?=Update!|HDFC\s*Bank:|Google\s*Pay:|Paytm:|PhonePe:)/gi,
    )
    .map((c) => c.trim())
    .filter((c) => c.length > 15);

  const results: ParsedTransaction[] = [];
  for (const chunk of chunks) {
    const parsed = parseTransactionMessage(chunk);
    if (parsed) {
      results.push(parsed);
    }
  }

  // If chunking didn't produce results, try parsing the whole block
  if (results.length === 0) {
    const single = parseTransactionMessage(text);
    if (single) results.push(single);
  }

  return results;
}
