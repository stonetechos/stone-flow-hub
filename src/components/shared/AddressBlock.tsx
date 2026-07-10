/**
 * AddressBlock — shared address input & display block for customers,
 * vendors and projects. Two modes:
 *
 *   <AddressBlock value={addr} onChange={setAddr} />   // editable
 *   <AddressBlock value={addr} readOnly />             // read
 *
 * Fields intentionally match the shape used by customers/vendors/projects
 * schemas — line1, line2, city, state, postal_code, country. Callers own
 * validation; this component only owns layout.
 */
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/Field";
import { cn } from "@/lib/utils";

export interface AddressValue {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export function AddressBlock({
  value,
  onChange,
  readOnly,
  className,
  namePrefix = "address",
}: {
  value: AddressValue;
  onChange?: (patch: Partial<AddressValue>) => void;
  readOnly?: boolean;
  className?: string;
  namePrefix?: string;
}) {
  if (readOnly) {
    const lines = [
      value.line1,
      value.line2,
      [value.city, value.state, value.postal_code].filter(Boolean).join(", "),
      value.country,
    ].filter((s): s is string => !!s && s.trim().length > 0);
    if (lines.length === 0) {
      return <p className={cn("text-sm text-muted-foreground", className)}>No address on file.</p>;
    }
    return (
      <address className={cn("not-italic space-y-0.5 text-sm text-foreground", className)}>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </address>
    );
  }

  const set = (patch: Partial<AddressValue>) => onChange?.(patch);
  return (
    <div className={cn("grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2", className)}>
      <Field label="Address line 1" htmlFor={`${namePrefix}-line1`} className="md:col-span-2">
        <Input
          id={`${namePrefix}-line1`}
          value={value.line1 ?? ""}
          onChange={(e) => set({ line1: e.target.value })}
        />
      </Field>
      <Field label="Address line 2" htmlFor={`${namePrefix}-line2`} className="md:col-span-2">
        <Input
          id={`${namePrefix}-line2`}
          value={value.line2 ?? ""}
          onChange={(e) => set({ line2: e.target.value })}
        />
      </Field>
      <Field label="City" htmlFor={`${namePrefix}-city`}>
        <Input
          id={`${namePrefix}-city`}
          value={value.city ?? ""}
          onChange={(e) => set({ city: e.target.value })}
        />
      </Field>
      <Field label="State / Region" htmlFor={`${namePrefix}-state`}>
        <Input
          id={`${namePrefix}-state`}
          value={value.state ?? ""}
          onChange={(e) => set({ state: e.target.value })}
        />
      </Field>
      <Field label="Postal code" htmlFor={`${namePrefix}-postal`}>
        <Input
          id={`${namePrefix}-postal`}
          value={value.postal_code ?? ""}
          onChange={(e) => set({ postal_code: e.target.value })}
        />
      </Field>
      <Field label="Country" htmlFor={`${namePrefix}-country`}>
        <Input
          id={`${namePrefix}-country`}
          value={value.country ?? ""}
          onChange={(e) => set({ country: e.target.value })}
        />
      </Field>
    </div>
  );
}
