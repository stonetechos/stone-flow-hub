import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * DataToolbar — canonical toolbar for every data workspace.
 *
 * Layout:
 *   [ title · count · search ]                  [ filters · columns · density · export · action ]
 *
 * Slots are optional. Callers decide which controls to expose; the visual
 * grammar stays constant across the app.
 */
export function DataToolbar({
  title,
  count,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  primaryFilter,
  filters,
  columns,
  density,
  extra,
  action,
  className,
}: {
  title?: ReactNode;
  count?: number | null;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  primaryFilter?: ReactNode;
  filters?: ReactNode;
  columns?: ReactNode;
  density?: ReactNode;
  extra?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const displayTitle =
    typeof title === "string"
      ? t(`page.${title}`, t(`nav.items.${title.toLowerCase()}`, title))
      : title;
  const resolvedPlaceholder =
    typeof searchPlaceholder === "string"
      ? t(`field.${searchPlaceholder}`, t(searchPlaceholder, searchPlaceholder))
      : searchPlaceholder;

  return (
    <div className={cn("mb-3.5 flex flex-wrap items-center gap-2.5", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {displayTitle && (
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-engraved-title">
              {displayTitle}
            </span>
            {typeof count === "number" && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-blue-700 shadow-2xs">
                {count.toLocaleString()}
              </span>
            )}
          </div>
        )}
        {onSearchChange && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-600/70" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={resolvedPlaceholder}
              className="h-8.5 rounded-xl border-blue-200/70 bg-white/90 pl-8 pr-8 text-xs font-medium shadow-2xs transition-colors focus:border-blue-500 focus:bg-white"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                onClick={() => onSearchChange("")}
                aria-label={t("actions.clearSearch", "Clear search")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        {primaryFilter}
      </div>
      <div className="flex items-center gap-1.5">
        {filters}
        {columns}
        {density}
        {extra}
        {action}
      </div>
    </div>
  );
}
