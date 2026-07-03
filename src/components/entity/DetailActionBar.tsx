import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FavoriteButton } from "@/components/entity/FavoriteButton";

export interface OverflowAction {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  separatorBefore?: boolean;
}

interface Props {
  /** Primary action buttons rendered inline. */
  primary?: ReactNode;
  /** Overflow items rendered in the ⋮ menu. */
  overflow?: OverflowAction[];
  /** Optional pin target — shown as a star icon button. */
  pin?: { entityType: string; entityId: string; label?: string };
}

/**
 * Consistent action bar for entity detail pages.
 * Renders primary actions inline, an optional pin, and an overflow menu.
 */
export function DetailActionBar({ primary, overflow, pin }: Props) {
  const hasOverflow = overflow && overflow.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {primary}
      {pin && (
        <FavoriteButton
          entityType={pin.entityType}
          entityId={pin.entityId}
          label={pin.label}
          size="sm"
        />
      )}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {overflow!.map((a, i) => (
              <div key={`${a.label}-${i}`}>
                {a.separatorBefore && <DropdownMenuSeparator />}
                {a.href ? (
                  <DropdownMenuItem asChild>
                    <a href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined}>
                      {a.icon && <span className="mr-2 inline-flex">{a.icon}</span>}
                      {a.label}
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      a.onSelect?.();
                    }}
                    className={a.destructive ? "text-destructive focus:text-destructive" : ""}
                  >
                    {a.icon && <span className="mr-2 inline-flex">{a.icon}</span>}
                    {a.label}
                  </DropdownMenuItem>
                )}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
