/**
 * SafeDeleteDialog
 *
 * Composes the shared ConfirmDialog foundation with a dependency scan.
 * Behaviour preserved from the previous implementation:
 *   - refuses the delete when any blocking FK reference exists and lists them
 *     with clickable shortcuts;
 *   - warns about cascading references (CASCADE / SET NULL);
 *   - allows the delete when nothing blocks;
 *   - `staleTime: 0` + `refetchOnMount: "always"` guarantees a fresh scan.
 *
 * The visual chrome (AlertDialog shell, footer buttons, keyboard handling)
 * comes from ConfirmDialog so SafeDelete stays consistent with every other
 * confirmation surface in the app.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, ShieldAlert, CheckCircle2, Info } from "lucide-react";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
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
  entityType: MdmEntityType;
  entityId: string | null;
  entityLabel: string;
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
  const noun = entityLabelHeading(entityType);

  const title = scan.isLoading
    ? `Delete ${noun}?`
    : canDelete
      ? `Delete ${noun}?`
      : `Cannot delete ${noun}`;

  // SafeDelete needs a contextual icon reflecting the scan result (check /
  // shield). We hide ConfirmDialog's tone icon and render our own inside the
  // description slot so the title stays clean.
  const leadingIcon = scan.isLoading ? null : canDelete ? (
    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
  ) : (
    <ShieldAlert className="h-5 w-5 text-amber-600" />
  );

  const description = (
    <span className="inline-flex items-center gap-2">
      {leadingIcon}
      <span>
        <span className="font-medium text-foreground">{entityLabel}</span>{" "}
        {scan.isLoading
          ? "— checking for linked records…"
          : !canDelete
            ? "is currently referenced by other business records. Remove or reassign the records below first, or archive this record instead."
            : cascadingRows.length > 0
              ? "will be permanently removed. Some linked child records will be removed or detached automatically (listed below)."
              : "has no linked records. This will permanently remove it."}
      </span>
    </span>
  );

  const body = (
    <>
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
    </>
  );

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      body={body}
      tone="danger"
      hideIcon
      size="lg"
      cancelLabel="Close"
      confirmLabel={canDelete ? "Delete permanently" : "Delete blocked"}
      confirmDisabled={scan.isLoading || !canDelete}
      busy={busy}
      onConfirm={onConfirmDelete}
    />
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
    case "enquiry":        return "enquiry";
    case "invoice":        return "invoice";
    default:               return t;
  }
}
