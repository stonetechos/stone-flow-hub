import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ColumnDef {
  key: string;
  label: string;
  /** If true, the column cannot be hidden (e.g. primary identifier). */
  required?: boolean;
}

/**
 * ColumnsMenu — dropdown to show/hide table columns.
 *
 * State is owned by the caller (usually via `useTablePrefs`). Required
 * columns render as disabled entries so users still see the full column
 * inventory.
 */
export function ColumnsMenu({
  columns,
  isHidden,
  onToggle,
}: {
  columns: ColumnDef[];
  isHidden: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
          <Columns3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Show columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.key}
            checked={!isHidden(c.key)}
            disabled={c.required}
            onCheckedChange={() => onToggle(c.key)}
            onSelect={(e) => e.preventDefault()}
          >
            {c.label}
            {c.required && (
              <span className="ml-auto text-[10px] uppercase text-muted-foreground">req</span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
