import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRoles } from "@/hooks/use-roles";

export function RowActions({
  onEdit,
  onDelete,
  extra,
  canEdit,
  canDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
  /** Override default role check. Defaults to any staff role. */
  canEdit?: boolean;
  /** Override default role check. Defaults to admin/sales_manager only. */
  canDelete?: boolean;
}) {
  const roles = useRoles();
  const editVisible = onEdit && (canEdit ?? roles.canWrite);
  const deleteVisible = onDelete && (canDelete ?? roles.canDelete);
  if (!editVisible && !deleteVisible && !extra) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {extra}
        {editVisible && (
          <DropdownMenuItem onSelect={() => onEdit!()}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
        )}
        {deleteVisible && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete!()}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
