/**
 * Dropdown items that switch a master record between lifecycle states.
 * Meant to be embedded via `RowActions extra={...}` or a standalone menu.
 * The admin-only "Purge permanently" item runs the server-side dependency
 * guard again before the row is removed.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowUpCircle, Ban, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRoles } from "@/hooks/use-roles";
import { toUserMessage } from "@/lib/errors";
import {
  purgeEntity,
  setLifecycleStatus,
  type LifecycleStatus,
} from "@/lib/mdm/lifecycle";
import type { MdmEntityType } from "@/lib/mdm/dependencies";
import { invalidateCustomer, invalidateProject, invalidateProduct, invalidateVendor } from "@/lib/query-invalidation";

interface Props {
  entityType: MdmEntityType;
  entityId: string;
  currentStatus: LifecycleStatus | string | null | undefined;
  /** When true, the "Purge permanently" item is shown to admins. */
  allowPurge?: boolean;
  onPurged?: () => void;
}

export function LifecycleMenuItems({
  entityType,
  entityId,
  currentStatus,
  allowPurge = true,
  onPurged,
}: Props) {
  const qc = useQueryClient();
  const { isAdmin } = useRoles();
  const s = (currentStatus ?? "active") as LifecycleStatus;

  const invalidate = () => {
    if (entityType === "customer") invalidateCustomer(qc);
    else if (entityType === "vendor") invalidateVendor(qc);
    else if (entityType === "project") invalidateProject(qc);
    else if (entityType === "product") invalidateProduct(qc);
  };

  const setMut = useMutation({
    mutationFn: (next: LifecycleStatus) => setLifecycleStatus(entityType, entityId, next),
    onSuccess: (_, next) => {
      toast.success(`Marked as ${next}`);
      invalidate();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const purgeMut = useMutation({
    mutationFn: () => purgeEntity(entityType, entityId),
    onSuccess: () => {
      toast.success("Permanently purged");
      invalidate();
      onPurged?.();
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const busy = setMut.isPending || purgeMut.isPending;

  return (
    <>
      {s !== "active" && (
        <DropdownMenuItem disabled={busy} onSelect={() => setMut.mutate("active")}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpCircle className="mr-2 h-4 w-4" />}
          Reactivate
        </DropdownMenuItem>
      )}
      {s !== "inactive" && (
        <DropdownMenuItem disabled={busy} onSelect={() => setMut.mutate("inactive")}>
          <Ban className="mr-2 h-4 w-4" /> Mark inactive
        </DropdownMenuItem>
      )}
      {s !== "archived" && (
        <DropdownMenuItem disabled={busy} onSelect={() => setMut.mutate("archived")}>
          <Archive className="mr-2 h-4 w-4" /> Archive
        </DropdownMenuItem>
      )}
      {s !== "deleted" && (
        <DropdownMenuItem
          disabled={busy}
          onSelect={() => setMut.mutate("deleted")}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Soft delete
        </DropdownMenuItem>
      )}
      {isAdmin && allowPurge && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={busy}
            onSelect={() => purgeMut.mutate()}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Purge permanently (admin)
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
