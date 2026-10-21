/**
 * Financial Year Invoice Numbering & Sequence Helpers
 *
 * Implements:
 * - Indian Financial Year (April 1 to March 31) code generation (e.g. 2627 for FY 2026-27)
 * - Invoice numbering format: INV-YY(YY+1)-XXXX (e.g. INV-2627-0005, INV-2728-0001)
 * - Safe void vs delete classification
 * - Void reuse date boundary calculations
 */

export function getFinancialYearCode(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  const startCode = String(startYear % 100).padStart(2, "0");
  const endCode = String(endYear % 100).padStart(2, "0");

  return `${startCode}${endCode}`;
}

export function formatInvoiceNumber(fyCode: string, sequenceNumber: number): string {
  const padded = String(sequenceNumber).padStart(4, "0");
  return `INV-${fyCode}-${padded}`;
}

export function parseInvoiceNumber(invoiceNo: string): {
  isFyFormat: boolean;
  fyCode: string | null;
  sequenceNumber: number | null;
} {
  const match = invoiceNo.match(/^INV-(\d{4})-(\d+)$/);
  if (match) {
    return {
      isFyFormat: true,
      fyCode: match[1],
      sequenceNumber: parseInt(match[2], 10),
    };
  }

  const legacyMatch = invoiceNo.match(/^INV-(\d+)$/);
  if (legacyMatch) {
    return {
      isFyFormat: false,
      fyCode: null,
      sequenceNumber: parseInt(legacyMatch[1], 10),
    };
  }

  return {
    isFyFormat: false,
    fyCode: null,
    sequenceNumber: null,
  };
}

/**
 * Calculates the next invoice number for a given list of existing invoice numbers in that FY.
 * Mandate:
 * For FY 2627, start from 5 (INV-2627-0005) if no higher exists.
 * For future FYs (e.g. 2728), start from 1 (INV-2728-0001).
 */
export function calculateNextInvoiceNumber(
  existingInvoiceNumbers: string[],
  dateInput?: Date | string | null,
): string {
  const fyCode = getFinancialYearCode(dateInput);

  let maxNum = 0;
  for (const invNo of existingInvoiceNumbers) {
    const parsed = parseInvoiceNumber(invNo);
    if (parsed.isFyFormat && parsed.fyCode === fyCode && parsed.sequenceNumber) {
      if (parsed.sequenceNumber > maxNum) {
        maxNum = parsed.sequenceNumber;
      }
    }
  }

  let nextNum: number;
  if (fyCode === "2627") {
    nextNum = maxNum < 4 ? 5 : maxNum + 1;
  } else {
    nextNum = maxNum + 1;
  }

  return formatInvoiceNumber(fyCode, nextNum);
}

/**
 * Determines whether an invoice is the latest in its sequence or in the middle.
 * Middle invoices must be VOIDED rather than hard deleted to prevent sequence gaps.
 */
export function canHardDeleteInvoice(
  targetInvoiceNo: string,
  allExistingInvoiceNumbers: string[],
): { canDelete: boolean; higherInvoicesExist: boolean } {
  const parsed = parseInvoiceNumber(targetInvoiceNo);
  if (!parsed.sequenceNumber) {
    return { canDelete: true, higherInvoicesExist: false };
  }

  const fy = parsed.fyCode;
  const num = parsed.sequenceNumber;

  let hasHigher = false;
  for (const otherNo of allExistingInvoiceNumbers) {
    if (otherNo === targetInvoiceNo) continue;
    const otherParsed = parseInvoiceNumber(otherNo);
    if (parsed.isFyFormat) {
      if (
        otherParsed.isFyFormat &&
        otherParsed.fyCode === fy &&
        otherParsed.sequenceNumber &&
        otherParsed.sequenceNumber > num
      ) {
        hasHigher = true;
        break;
      }
    } else {
      if (
        !otherParsed.isFyFormat &&
        otherParsed.sequenceNumber &&
        otherParsed.sequenceNumber > num
      ) {
        hasHigher = true;
        break;
      }
    }
  }

  return {
    canDelete: !hasHigher,
    higherInvoicesExist: hasHigher,
  };
}
