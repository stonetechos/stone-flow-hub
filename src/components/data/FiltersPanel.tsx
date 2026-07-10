import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

/**
 * FiltersPanel — right-side slide-over housing every advanced filter.
 *
 * Keep the always-visible search + a small "primary" filter on the toolbar;
 * push everything else in here so the workspace stays calm. The trigger shows
 * an active-count badge when `activeCount > 0`.
 */
export function FiltersPanel({
  title = "Filters",
  description,
  activeCount = 0,
  children,
  onReset,
}: {
  title?: string;
  description?: string;
  activeCount?: number;
  children: ReactNode;
  onReset?: () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
          <Filter className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-0.5 h-4 min-w-4 px-1 text-[10px] font-medium"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-4 space-y-4">{children}</div>
        {onReset && (
          <div className="mt-6 flex justify-end">
            <Button size="sm" variant="ghost" onClick={onReset}>
              Reset all
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
