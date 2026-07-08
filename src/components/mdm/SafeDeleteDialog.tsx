/**
 * SafeDeleteDialog
 *
 * Runs the shared `dependency_summary` scanner (same one `purge_entity` uses
 * server-side) and:
 *
 *  - refuses the delete when any blocking FK reference exists (RESTRICT /
 *    NO ACTION) and lists them with clickable shortcuts;
 *  - warns about cascading references (CASCADE / SET NULL) so the user knows
 *    what will be removed or detached;
 *  - allows the delete when nothing blocks.
 *
 * `staleTime: 0` + `refetchOnMount: "always"` guarantees a fresh scan every
 * time the dialog opens, and mutations across the app invalidate
 * `["mdm","dependencies"]` so the next open sees up-to-date counts.
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
import { Loader2, ExternalLink, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import {
  scanDependencies,
  type MdmEntityType,
  type DependencyReport,
  type DependencyRow,
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
  /** Fired only when the scan reports no blocking references and the user confirms. */
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const report = scan.data;
  const blockingRows = useMemo(() => report?.blockingRows ?? [], [report]);
  const cascadingRows = useMemo(() => report?.cascadingRows ?? [], [report]);
  const canDelete = !!report && report.canDelete;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {scan.isLoading ? (
              <>Delete {entityLabelHeading(entityType)}?</>
            ) : canDelete ? (
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
              ? "— checking for linked records…"
              : !canDelete
                ? "is currently referenced by other business records. Remove or reassign the records below first, or archive this record instead."
                : cascadingRows.length > 0
                  ? "will be permanently removed. Some linked child records will be removed or detached automatically (listed below)."
                  : "has no linked records. This will permanently remove it."}
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

          {!scan.isLoading && !scan.error && blockingRows.length > 0 && (
            <Section
              title="Blocking references"
              tone="danger"
              rows={blockingRows}
              onNavigate={() => onOpenChange(false)}
            />
          )}

          {!scan.isLoading && !scan.error && cascadingRows.length > 0 && (
            <Section
              title={
                canDelete
                  ? "Will be removed or detached automatically"
                  : "Will be removed or detached once blockers are cleared"
              }
              tone="info"
              rows={cascadingRows}
              onNavigate={() => onOpenChange(false)}
            />
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Close</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || scan.isLoading || !canDelete}
            onClick={(e) => {
              e.preventDefault();
              if (canDelete) onConfirmDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {canDelete ? "Delete permanently" : "Delete blocked"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Section({
  title,
  tone,
  rows,
  onNavigate,
}: {
  title: string;
  tone: "danger" | "info";
  rows: DependencyRow[];
  onNavigate: () => void;
}) {
  const border = tone === "danger" ? "border-destructive/40" : "border-border";
  const Icon = tone === "danger" ? ShieldAlert : Info;
  const iconTone = tone === "danger" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className={`rounded-md border ${border}`}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${iconTone}`} />
        {title}
      </div>
      <ul className="divide-y">
        {rows.map((row) => (
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
                onClick={onNavigate}
              >
                Open <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Linked</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function entityLabelHeading(t: MdmEntityType): string {
  switch (t) {
    case "customer":       return "customer";
    case "vendor":         return "vendor";
    case "project":        return "project";
    case "product":        return "product";
    case "estimate":       return "estimate";
    case "quote":          return "quotation";
    case "sales_order":    return "sales order";
    case "purchase_order": return "purchase order";
    default:               return t;
  }
}
