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
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CountryCodeSelect,
  parsePhoneWithCountry,
  formatPhoneWithCountry,
} from "./CountryCodeSelect";

type BaseProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "type"> & {
  value: string | null | undefined;
  onChange: (value: string) => void;
};

export interface PhoneInputProps extends BaseProps {
  defaultCountry?: string;
  hideCountrySelect?: boolean;
  containerClassName?: string;
}

/** Telephone / Mobile input with country code dropdown (+265 Malawi, +91 India, world codes). */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    value,
    onChange,
    maxLength = 20,
    placeholder,
    className,
    containerClassName,
    defaultCountry = "+91",
    hideCountrySelect = false,
    disabled,
    ...rest
  },
  ref,
) {
  const { t } = useTranslation();
  const parsed = React.useMemo(
    () => parsePhoneWithCountry(value, defaultCountry),
    [value, defaultCountry],
  );
  const [selectedCountry, setSelectedCountry] = React.useState<string>(
    parsed.countryCode || defaultCountry,
  );

  React.useEffect(() => {
    if (parsed.countryCode && parsed.countryCode !== selectedCountry) {
      if (value && (value.startsWith("+") || parsed.localNumber)) {
        setSelectedCountry(parsed.countryCode);
      }
    }
  }, [parsed.countryCode, parsed.localNumber, value, selectedCountry]);

  const activeCountry = selectedCountry || parsed.countryCode || defaultCountry;

  const handleCountryChange = (newCode: string) => {
    setSelectedCountry(newCode);
    const formatted = formatPhoneWithCountry(newCode, parsed.localNumber);
    onChange(formatted);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trimStart().startsWith("+")) {
      const reParsed = parsePhoneWithCountry(raw, activeCountry);
      setSelectedCountry(reParsed.countryCode);
      const formatted = formatPhoneWithCountry(reParsed.countryCode, reParsed.localNumber);
      onChange(formatted);
      return;
    }
    const clean = raw.replace(/[^\d\s-]/g, "");
    const formatted = formatPhoneWithCountry(activeCountry, clean);
    onChange(formatted);
  };

  if (hideCountrySelect) {
    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder ?? t("field.placeholders.mobile", "Mobile or +Country Code")}
        maxLength={maxLength}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          const hasLeadingPlus = raw.trimStart().startsWith("+");
          const digitsAndDelims = raw.replace(/[^\d\s-]/g, "");
          const withoutPlus = digitsAndDelims.replace(/\+/g, "");
          const cleaned = hasLeadingPlus ? `+${withoutPlus}` : withoutPlus;
          onChange(cleaned);
        }}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <div className={cn("flex items-center w-full", containerClassName)}>
      <CountryCodeSelect
        value={activeCountry}
        onChange={handleCountryChange}
        disabled={disabled}
        className="h-9 w-[92px] sm:w-[98px] rounded-r-none border-r-0 shrink-0 bg-muted/40 font-medium text-xs focus:ring-0 focus:ring-offset-0"
      />
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={
          placeholder ??
          (activeCountry === "+91"
            ? t("field.placeholders.mobileIndia", "98765 43210")
            : t("field.placeholders.mobileIntl", "Mobile number"))
        }
        maxLength={maxLength}
        value={parsed.localNumber}
        disabled={disabled}
        onChange={handleLocalChange}
        className={cn(
          "h-9 rounded-l-none border-l-0 text-xs font-medium focus-visible:ring-1 focus-visible:ring-primary/40",
          className,
        )}
        {...rest}
      />
    </div>
  );
});

/** GSTIN: uppercase, alphanumeric only, capped at 15 chars. */
export const GstInput = React.forwardRef<HTMLInputElement, BaseProps>(function GstInput(
  { value, onChange, placeholder, ...rest },
  ref,
) {
  const { t } = useTranslation();
  return (
    <Input
      ref={ref}
      inputMode="text"
      autoCapitalize="characters"
      spellCheck={false}
      placeholder={placeholder ?? t("field.placeholders.gstin", "15-character GSTIN")}
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
  { value, onChange, placeholder, ...rest },
  ref,
) {
  const { t } = useTranslation();
  return (
    <Input
      ref={ref}
      autoCapitalize="characters"
      spellCheck={false}
      placeholder={placeholder ?? t("field.placeholders.pan", "10-character PAN")}
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
  { value, onChange, placeholder, ...rest },
  ref,
) {
  const { t } = useTranslation();
  return (
    <Input
      ref={ref}
      inputMode="numeric"
      autoComplete="postal-code"
      placeholder={placeholder ?? t("field.placeholders.pincode", "6-digit pincode")}
      maxLength={6}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value.replace(/\D+/g, "").slice(0, 6))}
      {...rest}
    />
  );
});

/** Email: trims spaces and lowercases silently. */
export const EmailInput = React.forwardRef<HTMLInputElement, BaseProps>(function EmailInput(
  { value, onChange, placeholder, ...rest },
  ref,
) {
  const { t } = useTranslation();
  return (
    <Input
      ref={ref}
      type="email"
      inputMode="email"
      autoComplete="email"
      spellCheck={false}
      placeholder={placeholder ?? t("field.placeholders.email", "name@company.com")}
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
  {
    value,
    onChange,
    allowDecimal = true,
    allowNegative = false,
    min,
    max,
    placeholder = "0",
    onFocus,
    onClick,
    onMouseUp,
    ...rest
  },
  ref,
) {
  const innerRef = React.useRef<HTMLInputElement | null>(null);

  const handleRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const setCursorToEnd = (el: HTMLInputElement | null) => {
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        if (el.selectionStart !== el.selectionEnd) return;
        const len = el.value?.length ?? 0;
        el.setSelectionRange(len, len);
      } catch {
        // ignore if not supported by input type
      }
    });
  };

  return (
    <Input
      ref={handleRef}
      inputMode={allowDecimal ? "decimal" : "numeric"}
      placeholder={placeholder}
      value={value ?? ""}
      onFocus={(e) => {
        if (e.currentTarget.value === "0") {
          try {
            e.currentTarget.select();
          } catch {
            /* ignore */
          }
        } else {
          setCursorToEnd(e.currentTarget);
        }
        onFocus?.(e);
      }}
      onClick={(e) => {
        if (e.currentTarget.value === "0") {
          try {
            e.currentTarget.select();
          } catch {
            /* ignore */
          }
        } else {
          setCursorToEnd(e.currentTarget);
        }
        onClick?.(e);
      }}
      onMouseUp={(e) => {
        if (e.currentTarget.value === "0") {
          try {
            e.currentTarget.select();
          } catch {
            /* ignore */
          }
        } else {
          setCursorToEnd(e.currentTarget);
        }
        onMouseUp?.(e);
      }}
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
        // Strip unwanted leading zero(s) before other digits (e.g. "0410" -> "410", "04" -> "4", "-05" -> "-5")
        // but preserve valid decimals ("0.5", "0.") and standalone "0".
        v = v.replace(/^(-?)0+(?=\d)/, "$1");

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
