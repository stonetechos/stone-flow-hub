import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useRouterState } from "@tanstack/react-router";
import { useCustomNavRenames } from "@/lib/nav/custom-renames";
import { findNavItemForPath, NAV_ITEMS } from "@/lib/nav/config";

/**
 * PageHeader — the primary page title area.
 *
 * Typographic hero. No card, no divider, no shadow. Establishes hierarchy
 * with a large display heading, a muted subtitle, and right-aligned
 * actions. Renders responsively — actions wrap under the title on
 * narrow viewports.
 *
 * Automatically checks useCustomNavRenames so if any sidebar navigation tab
 * is renamed (e.g. "Purchase Invoices (Bills)" -> "Purchase Entries"),
 * that custom name displays as the page header title dynamically.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
  navId,
}: {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
  navId?: string;
}) {
  const { t } = useTranslation();
  const { renames } = useCustomNavRenames();

  let pathname = "";
  let searchStr = "";
  try {
    const loc = useRouterState({
      select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
    });
    pathname = loc.pathname;
    searchStr = loc.searchStr || "";
  } catch {
    if (typeof window !== "undefined") {
      pathname = window.location.pathname;
      searchStr = window.location.search || "";
    }
  }

  // 1. Explicit navId prop override if provided
  let customTitle: string | undefined = navId && renames[navId] ? renames[navId] : undefined;

  // 2. Derive from active navigation item matching the current page route
  if (!customTitle && pathname) {
    const cleanPath = pathname.split("?")[0].replace(/\/+$/, "") || "/";
    const fullCurrent = `${cleanPath}${searchStr}`;

    // Prefer exact match with query parameters (e.g. /vendors?view=directory or /payments?tab=customer)
    let matchingItem = NAV_ITEMS.find(
      (item) =>
        item.to === fullCurrent || item.to === `${cleanPath}?${searchStr.replace(/^\?/, "")}`,
    );

    // Fall back to exact base pathname match (only for main tab pages, NOT sub-paths like /new or /$id)
    if (!matchingItem) {
      matchingItem = NAV_ITEMS.find((item) => {
        const itemClean = item.to.split("?")[0].replace(/\/+$/, "") || "/";
        return itemClean === cleanPath && !item.to.includes("?");
      });
    }

    // Fall back to findNavItemForPath if exact base matches
    if (!matchingItem) {
      const best = findNavItemForPath(cleanPath);
      if (best) {
        const bestClean = best.to.split("?")[0].replace(/\/+$/, "") || "/";
        if (bestClean === cleanPath) {
          matchingItem = best;
        }
      }
    }

    if (matchingItem && renames[matchingItem.id]) {
      customTitle = renames[matchingItem.id];
    }
  }

  // 3. Fallback: match by title against renames dictionary or nav items
  if (!customTitle && typeof title === "string") {
    if (renames[title]) {
      customTitle = renames[title];
    } else {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug && renames[slug]) {
        customTitle = renames[slug];
      } else {
        const item = NAV_ITEMS.find(
          (ni) => ni.id === slug || ni.label.toLowerCase() === title.toLowerCase(),
        );
        if (item && renames[item.id]) {
          customTitle = renames[item.id];
        }
      }
    }
  }

  const baseTitle = customTitle || title;
  const displayTitle =
    typeof baseTitle === "string"
      ? t(
          `page.${baseTitle}`,
          t(
            `nav.items.${baseTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            t(`nav.items.${baseTitle.toLowerCase().replace(/\s+/g, "")}`, t(baseTitle, baseTitle)),
          ),
        )
      : baseTitle;
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
