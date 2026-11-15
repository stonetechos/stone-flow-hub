import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CountryCode {
  code: string; // e.g. "+91"
  iso: string; // e.g. "IN"
  name: string; // e.g. "India"
  flag: string; // e.g. "🇮🇳"
}

export const COMMON_COUNTRIES: CountryCode[] = [
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳" },
  { code: "+265", iso: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+1", iso: "US", name: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+254", iso: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+255", iso: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "+256", iso: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "+260", iso: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", iso: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
  { code: "+234", iso: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+233", iso: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "+230", iso: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "+258", iso: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "+267", iso: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "+27", iso: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+974", iso: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "+968", iso: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "+965", iso: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "+973", iso: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+60", iso: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+64", iso: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+977", iso: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "+880", iso: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+94", iso: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷" },
  { code: "+39", iso: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+34", iso: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+31", iso: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+41", iso: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+32", iso: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+66", iso: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+62", iso: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "+81", iso: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+82", iso: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+852", iso: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+20", iso: "EG", name: "Egypt", flag: "🇪🇬" },
];

export interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CountryCodeSelect({
  value,
  onChange,
  className,
  disabled,
}: CountryCodeSelectProps) {
  const current = COMMON_COUNTRIES.find((c) => c.code === value) || {
    code: value || "+91",
    iso: "XX",
    name: "International",
    flag: "🌐",
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={`h-9 px-2.5 bg-muted/40 border-r-0 rounded-r-none focus:ring-0 focus:ring-offset-0 ${
          className || "w-[96px]"
        }`}
        aria-label="Country Dial Code"
      >
        <SelectValue>
          <div className="flex items-center gap-1.5 font-medium text-xs">
            <span>{current.flag}</span>
            <span className="font-semibold">{current.code}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64 overflow-y-auto">
        {COMMON_COUNTRIES.map((c) => (
          <SelectItem key={`${c.iso}-${c.code}`} value={c.code} className="text-xs">
            <div className="flex items-center gap-2">
              <span>{c.flag}</span>
              <span className="font-bold text-primary">{c.code}</span>
              <span className="text-muted-foreground truncate">{c.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Parses any phone string into its dial code and national/local number.
 * Supports:
 *   - "+265995429998" -> { countryCode: "+265", localNumber: "995429998" }
 *   - "265995429998"  -> { countryCode: "+265", localNumber: "995429998" }
 *   - "+919876543210" -> { countryCode: "+91", localNumber: "9876543210" }
 *   - "9876543210"    -> { countryCode: "+91", localNumber: "9876543210" }
 */
export function parsePhoneWithCountry(
  phone?: string | null,
  defaultCountry: string = "+91",
): { countryCode: string; localNumber: string } {
  if (!phone) {
    return { countryCode: defaultCountry, localNumber: "" };
  }

  const trimmed = phone.trim();

  // If starts with + (e.g. "+265995429998", "+919876543210")
  if (trimmed.startsWith("+")) {
    const sorted = [...COMMON_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const country of sorted) {
      if (trimmed.startsWith(country.code)) {
        const local = trimmed
          .slice(country.code.length)
          .replace(/[^\d\s-]/g, "")
          .trim();
        return { countryCode: country.code, localNumber: local };
      }
    }
    const match = trimmed.match(/^(\+\d{1,4})(.*)$/);
    if (match) {
      return { countryCode: match[1], localNumber: match[2].trim() };
    }
    return { countryCode: defaultCountry, localNumber: trimmed.replace(/\D/g, "") };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return { countryCode: defaultCountry, localNumber: "" };
  }

  // Check if digits start with a non-domestic country dial code (e.g. 265995429998 -> +265)
  const nonDomestic = COMMON_COUNTRIES.filter((c) => c.code !== "+91").sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const c of nonDomestic) {
    const rawCode = c.code.replace("+", "");
    if (digits.startsWith(rawCode) && digits.length >= rawCode.length + 6) {
      return { countryCode: c.code, localNumber: digits.slice(rawCode.length) };
    }
  }

  // Indian numbers with 91 or leading 0
  if (digits.length === 12 && digits.startsWith("91")) {
    return { countryCode: "+91", localNumber: digits.slice(2) };
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return { countryCode: "+91", localNumber: digits.slice(1) };
  }

  return { countryCode: defaultCountry, localNumber: digits };
}

/**
 * Formats country dial code + local digits for storage.
 * Domestic Indian numbers (+91) remain 10 digits for full backward compatibility,
 * while international numbers include +countryCode (e.g. +265995429998).
 */
export function formatPhoneWithCountry(countryCode: string, localNumber: string): string {
  const digits = localNumber.replace(/[^\d]/g, "");
  if (!digits) return "";

  if (countryCode === "+91") {
    if (digits.length === 10) {
      return digits;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }
    return digits;
  }

  return `${countryCode}${digits}`;
}
