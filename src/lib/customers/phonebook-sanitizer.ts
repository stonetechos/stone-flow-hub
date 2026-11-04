/**
 * Sanitizes phone numbers imported from device address books.
 * Removes country code prefixes (+91, 0), spaces, dashes, and parentheses
 * to format a clean 10-digit mobile number for Indian operations.
 */
export function sanitizePhonebookNumber(raw: string): string {
  if (!raw) return "";
  // Strip non-digits
  const digits = raw.replace(/\D/g, "");
  // If 12 digits starting with 91, strip 91
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // If 11 digits starting with 0, strip 0
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  // If exactly 10 digits, return as is
  if (digits.length === 10) {
    return digits;
  }
  // Otherwise return whatever digits or original trimmed
  return digits || raw.trim();
}
