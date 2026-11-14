import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const STANDARD_UNITS = [
  { value: "ft", label: "ft (Feet)" },
  { value: "in", label: "in (Inches)" },
  { value: "mm", label: "mm (Millimeters)" },
  { value: "running ft", label: "running ft (Rft)" },
  { value: "sqft", label: "sqft (Sq. Ft)" },
  { value: "sqm", label: "sqm (Sq. Meter)" },
  { value: "mtr", label: "mtr (Meters)" },
  { value: "nos", label: "nos (Count)" },
  { value: "pcs", label: "pcs (Pieces)" },
  { value: "box", label: "box (Boxes)" },
  { value: "bag", label: "bag (Bags)" },
  { value: "ton", label: "ton (Tons)" },
  { value: "lot", label: "lot (Lot)" },
  { value: "set", label: "set (Set)" },
  { value: "ltr", label: "ltr (Litres)" },
  { value: "trip", label: "trip (Trips)" },
] as const;

export type StandardUnit = (typeof STANDARD_UNITS)[number]["value"];

interface UnitPickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function UnitPicker({
  value,
  onChange,
  className,
  placeholder = "Select unit",
  disabled = false,
}: UnitPickerProps) {
  const normalizedValue = value?.toLowerCase().trim() || "sqft";

  // Check if current value exists in standard units list
  const isStandard = STANDARD_UNITS.some((u) => u.value.toLowerCase() === normalizedValue);

  return (
    <Select
      value={isStandard ? normalizedValue : value || "sqft"}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("h-8 text-xs font-medium", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60 z-50">
        {!isStandard && value && (
          <SelectItem value={value} className="text-xs font-semibold">
            {value} (Custom)
          </SelectItem>
        )}
        {STANDARD_UNITS.map((u) => (
          <SelectItem key={u.value} value={u.value} className="text-xs">
            {u.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
