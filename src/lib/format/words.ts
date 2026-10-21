/**
 * Converts a numeric currency amount into Indian English words.
 * Follows the Indian numbering system: Lakhs, Crores, Thousands, Hundreds.
 * Example:
 *   14700 -> "Rupees Fourteen Thousand Seven Hundred Only"
 *   24200 -> "Rupees Twenty-Four Thousand Two Hundred Only"
 *   125670.50 -> "Rupees One Lakh Twenty-Five Thousand Six Hundred Seventy and Fifty Paise Only"
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 > 0 ? "-" + ONES[n % 10] : "");
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

export function amountToIndianWords(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num) || num === 0) return "Rupees Zero Only";

  const absolute = Math.abs(num);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  let words = "";

  const crore = Math.floor(rupees / 10000000);
  const remainderCrore = rupees % 10000000;

  const lakh = Math.floor(remainderCrore / 100000);
  const remainderLakh = remainderCrore % 100000;

  const thousand = Math.floor(remainderLakh / 1000);
  const remainderThousand = remainderLakh % 1000;

  const hundreds = remainderThousand;

  if (crore > 0) {
    words += convertBelowThousand(crore) + " Crore ";
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + " Thousand ";
  }
  if (hundreds > 0) {
    words += convertBelowThousand(hundreds) + " ";
  }

  words = words.trim();
  let result = "Rupees " + (words || "Zero");

  if (paise > 0) {
    result += " and " + convertBelowThousand(paise) + " Paise";
  }

  result += " Only";
  return num < 0 ? "Minus " + result : result;
}
