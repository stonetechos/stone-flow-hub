import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

/**
 * PageHeader — the primary page title area.
 *
 * Typographic hero. No card, no divider, no shadow. Establishes hierarchy
 * with a large display heading, a muted subtitle, and right-aligned
 * actions. Renders responsively — actions wrap under the title on
 * narrow viewports.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const displayTitle =
    typeof title === "string"
      ? t(
          `page.${title}`,
          t(
            `nav.items.${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            t(`nav.items.${title.toLowerCase().replace(/\s+/g, "")}`, t(title, title)),
          ),
        )
      : title;
  const displaySubtitle =
    typeof subtitle === "string" ? t(`subtitle.${subtitle}`, t(subtitle, subtitle)) : subtitle;

  return (
    <div
      className={cn(
        "mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-engraved-kicker">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-black tracking-tight text-engraved-title sm:text-[28px] break-words text-balance">
          {displayTitle}
        </h1>
        {displaySubtitle && (
          <p className="mt-1 break-words text-xs sm:text-sm font-medium text-slate-500">
            {displaySubtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
