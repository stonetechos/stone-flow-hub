import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
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
  return (
    <div className={cn("mb-3 flex flex-wrap items-center gap-2", className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {title && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{title}</span>
            {typeof count === "number" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {count.toLocaleString()}
              </span>
            )}
          </div>
        )}
        {onSearchChange && (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 pr-8 text-sm"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
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
