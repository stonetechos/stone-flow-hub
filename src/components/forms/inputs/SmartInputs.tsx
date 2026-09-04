/**
 * STOS — Intelligent Input primitives (UX Audit Phase 1).
 *
 * These wrappers around the shadcn <Input> component prevent invalid data
 * at the point of entry instead of relying on post-submit toasts. They are
 * drop-in replacements: same value/onChange contract, but with silent
 * sanitisation (digits only, uppercase, length cap, etc.).
 *
 * All variants:
 *   • forward refs (compatible with react-hook-form)
 *   • accept `inputMode` and mobile-friendly keyboards by default
 *   • never throw — invalid keystrokes are simply dropped
 */
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BaseProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "type"> & {
  value: string | null | undefined;
  onChange: (value: string) => void;
};

/** Digits-only input. Strips +91, spaces, dashes. Caps at 10 characters. */
export const PhoneInput = React.forwardRef<HTMLInputElement, BaseProps>(function PhoneInput(
  { value, onChange, maxLength = 10, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="10-digit mobile"
      maxLength={maxLength}
      value={value ?? ""}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D+/g, "").replace(/^0+/, "").slice(-10);
        onChange(digits);
      }}
      {...rest}
    />
  );
});

/** GSTIN: uppercase, alphanumeric only, capped at 15 chars. */
export const GstInput = React.forwardRef<HTMLInputElement, BaseProps>(function GstInput(
  { value, onChange, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      inputMode="text"
      autoCapitalize="characters"
      spellCheck={false}
      placeholder="15-character GSTIN"
      maxLength={15}
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          e.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 15),
        )
      }
      {...rest}
    />
  );
});

/** PAN: uppercase, alphanumeric only, capped at 10 chars. */
export const PanInput = React.forwardRef<HTMLInputElement, BaseProps>(function PanInput(
  { value, onChange, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      autoCapitalize="characters"
      spellCheck={false}
      placeholder="10-character PAN"
      maxLength={10}
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          e.target.value
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase()
            .slice(0, 10),
        )
      }
      {...rest}
    />
  );
});

/** Indian pincode: digits only, 6 characters. */
export const PincodeInput = React.forwardRef<HTMLInputElement, BaseProps>(function PincodeInput(
  { value, onChange, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      inputMode="numeric"
      autoComplete="postal-code"
      placeholder="6-digit pincode"
      maxLength={6}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value.replace(/\D+/g, "").slice(0, 6))}
      {...rest}
    />
  );
});

/** Email: trims spaces and lowercases silently. */
export const EmailInput = React.forwardRef<HTMLInputElement, BaseProps>(function EmailInput(
  { value, onChange, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="email"
      inputMode="email"
      autoComplete="email"
      spellCheck={false}
      placeholder="name@company.com"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value.replace(/\s+/g, "").toLowerCase())}
      {...rest}
    />
  );
});

/** Numeric input: allows digits + one decimal point + optional negative. */
export const NumericInput = React.forwardRef<
  HTMLInputElement,
  Omit<BaseProps, "min" | "max"> & {
    allowDecimal?: boolean;
    allowNegative?: boolean;
    min?: number;
    max?: number;
  }
>(function NumericInput(
  { value, onChange, allowDecimal = true, allowNegative = false, min, max, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={value ?? ""}
      onChange={(e) => {
        let v = e.target.value;
        // Strip anything that isn't a digit, dot, or leading minus.
        v = v.replace(allowDecimal ? /[^\d.-]/g : /[^\d-]/g, "");
        if (!allowNegative) v = v.replace(/-/g, "");
        else v = v.replace(/(?!^)-/g, "");
        if (allowDecimal) {
          // keep only the first dot
          const firstDot = v.indexOf(".");
          if (firstDot !== -1) {
            v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
          }
        }
        if (v === "" || v === "-" || v === ".") {
          onChange(v);
          return;
        }
        const n = Number(v);
        if (Number.isFinite(n)) {
          if (typeof max === "number" && n > max) return;
          if (typeof min === "number" && n < min) return;
        }
        onChange(v);
      }}
      {...rest}
    />
  );
});

/** Percentage — capped 0..100 by default. */
export const PercentInput = React.forwardRef<HTMLInputElement, Omit<BaseProps, "min" | "max">>(
  function PercentInput(props, ref) {
    return <NumericInput ref={ref} min={0} max={100} {...props} />;
  },
);

/**
 * Currency amount input — ₹-prefixed money field (Rishi: "use Rupee Symbol
 * prefixed wherever we need to enter currency amount"). Built on
 * NumericInput (decimal, non-negative by default) with a fixed "₹" glyph
 * rendered inside the field's left edge, so the amount box always reads
 * like "₹ 12,000" is being typed even though the raw value is a plain
 * unformatted numeric string (no thousands separators while editing — those
 * would fight cursor position; use `formatInr()` from `@/lib/format` for
 * read-only display elsewhere).
 *
 * Scope note: this is for NEW forms only (Liabilities, Business Expenses,
 * and anything built after 2026-09-04). The many existing money inputs
 * across the app (Purchase Invoices, Quotes, GRNs, etc.) keep their current
 * plain `<Input type="number">` — retrofitting every existing amount field
 * to this component is a separate, larger follow-up not attempted here.
 */
export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  Omit<BaseProps, "min" | "max"> & { allowNegative?: boolean; min?: number; max?: number }
>(function CurrencyInput({ className, allowNegative = false, min = 0, max, ...rest }, ref) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground"
      >
        ₹
      </span>
      <NumericInput
        ref={ref}
        allowDecimal
        allowNegative={allowNegative}
        min={min}
        max={max}
        inputMode="decimal"
        className={cn("pl-7", className)}
        {...rest}
      />
    </div>
  );
});
