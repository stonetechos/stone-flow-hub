/**
 * SafeDeleteDialog
 *
 * Replaces the raw "Delete?" confirm across masters (customers, vendors,
 * projects, products). Scans dependent business records via the
 * `dependency_summary` RPC and:
 *
 *  - blocks the delete when transactional records exist (projects, invoices,
 *    quotes, POs, receipts, credit/debit notes, refunds, RFQ requests,
 *    production orders, etc.) and lists them with clickable shortcuts;
 *  - allows the delete when no blocking references exist.
 *
 * Zero schema/API removal: this only wraps the existing delete mutation with
 * a smarter pre-check and a business-friendly explanation.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
  scanDependencies,
  type MdmEntityType,
  type DependencyReport,
} from "@/lib/mdm/dependencies";
import { toUserMessage } from "@/lib/errors";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Master entity kind — routed through the Postgres scanner. */
  entityType: MdmEntityType;
  /** Master record id. When null, the dialog stays idle. */
  entityId: string | null;
  /** Human label used in headings / copy, e.g. "ABC Builders". */
  entityLabel: string;
  /** Fired only when the scan returns no blocking records and the user confirms. */
  onConfirmDelete: () => void;
  busy?: boolean;
}

export function SafeDeleteDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
  onConfirmDelete,
  busy,
}: Props) {
  const scan = useQuery<DependencyReport>({
    queryKey: ["mdm", "dependencies", entityType, entityId],
    queryFn: () => scanDependencies(entityType, entityId as string),
    enabled: open && !!entityId,
    staleTime: 15_000,
  });

  const report = scan.data;
  const blocking = useMemo(
    () => (report?.rows ?? []).filter((r) => r.count > 0),
    [report],
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {report?.canDelete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Delete {entityLabelHeading(entityType)}?
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Cannot delete {entityLabelHeading(entityType)}
              </>
            )}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{entityLabel}</span>{" "}
            {scan.isLoading
              ? "— checking for linked business records…"
              : report?.canDelete
                ? "has no linked business transactions. This will permanently remove the record."
                : "is currently referenced by other business records. Archive it, or remove/reassign the records below first."}
          </p>

          {scan.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Scanning dependencies…
            </div>
          )}

          {scan.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
              {toUserMessage(scan.error)}
            </div>
          )}

          {!scan.isLoading && !scan.error && blocking.length > 0 && (
            <ul className="divide-y rounded-md border">
              {blocking.map((row) => (
                <li
                  key={row.module}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">
                      {row.count}
                    </Badge>
                    <span>{row.module}</span>
                  </div>
                  {row.route ? (
                    <Link
                      to={row.route}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Linked</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Close</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || scan.isLoading || !report?.canDelete}
            onClick={(e) => {
              e.preventDefault();
              if (report?.canDelete) onConfirmDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {report?.canDelete ? "Delete permanently" : "Delete blocked"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function entityLabelHeading(t: MdmEntityType): string {
  switch (t) {
    case "customer":
      return "customer";
    case "vendor":
      return "vendor";
    case "project":
      return "project";
    case "product":
      return "product";
  }
}
