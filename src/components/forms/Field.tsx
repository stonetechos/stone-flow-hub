import { Label } from "@/components/ui/label";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { autoTranslate } from "@/lib/i18n/auto-translator";

/** Labelled field with error slot — keeps form markup terse. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const rawLabel = t(`field.${label}`, t(`label.${label}`, t(label, label)));
  const displayLabel = typeof rawLabel === "string" ? autoTranslate(rawLabel) : rawLabel;
  const rawHint = hint ? t(`hint.${hint}`, t(hint, hint)) : null;
  const displayHint = typeof rawHint === "string" ? autoTranslate(rawHint) : rawHint;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {displayLabel}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{t(error, error)}</p>
      ) : displayHint ? (
        <p className="text-xs text-muted-foreground">{displayHint}</p>
      ) : null}
    </div>
  );
}
