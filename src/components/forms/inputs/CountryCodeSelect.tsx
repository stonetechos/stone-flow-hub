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

const COMMON_COUNTRIES: CountryCode[] = [
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳" },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+1", iso: "US", name: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+974", iso: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "+968", iso: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "+965", iso: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "+973", iso: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷" },
  { code: "+39", iso: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+60", iso: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+977", iso: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "+27", iso: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+64", iso: "NZ", name: "New Zealand", flag: "🇳🇿" },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export function CountryCodeSelect({ value, onChange, className }: CountryCodeSelectProps) {
  const current = COMMON_COUNTRIES.find((c) => c.code === value) || COMMON_COUNTRIES[0];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={`h-10 px-2.5 bg-muted/30 border-r-0 rounded-r-none focus:ring-0 focus:ring-offset-0 ${
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
      <SelectContent className="max-h-64">
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
