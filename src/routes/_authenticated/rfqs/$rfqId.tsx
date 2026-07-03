/** Vendor quote comparison — procurement decision workspace. Staff-only. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Star,
  Trophy,
  Zap,
  Award,
  Sparkles,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { signedUrl } from "@/lib/attachments/api";
import {
  approveVendorQuote,
  getRfqComparison,
  rejectVendorQuote,
  requestQuoteRevision,
  type QuoteComparisonRow,
} from "@/lib/quotes/comparison";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rfqs/$rfqId")({
  ssr: false,
  component: CompareRfqPage,
});

function CompareRfqPage() {
  const { rfqId } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["rfq-compare", rfqId],
    queryFn: () => getRfqComparison(rfqId),
  });

  const [revisionFor, setRevisionFor] = useState<QuoteComparisonRow | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rfq-compare", rfqId] });

  const approveMut = useMutation({
    mutationFn: (quoteId: string) => approveVendorQuote(quoteId),
    onSuccess: () => {
      toast.success("Vendor approved");
      setApprovingId(null);
      invalidate();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const rejectMut = useMutation({
    mutationFn: (quoteId: string) => rejectVendorQuote(quoteId),
    onSuccess: () => {
      toast.success("Quote rejected");
      setRejectingId(null);
      invalidate();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const reviseMut = useMutation({
    mutationFn: (p: { requestId: string; note: string }) =>
      requestQuoteRevision(p.requestId, p.note),
    onSuccess: () => {
      toast.success("Revision requested");
      setRevisionFor(null);
      invalidate();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error)
    return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="RFQ not found." />;

  const bundle = q.data;
  const submittedCount = bundle.rows.filter((r) => !!r.quote?.submitted_at).length;

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/enquiries"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to enquiries
        </Link>
      </div>

      <PageHeader
        title={`Compare quotes · ${bundle.rfqNo}`}
        subtitle={`${bundle.projectName ?? "—"} · ${bundle.rows.length} vendor${bundle.rows.length === 1 ? "" : "s"} · ${submittedCount} submitted${bundle.dueDate ? ` · due ${bundle.dueDate}` : ""}`}
      />

      {bundle.rows.length === 0 ? (
        <Card className="shadow-1">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No vendors have been sent this RFQ.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-1">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <Th>Vendor</Th>
                    <Th className="text-right">Price (₹)</Th>
                    <Th className="text-right">Freight (₹)</Th>
                    <Th>GST</Th>
                    <Th className="text-right">Dispatch</Th>
                    <Th>Stock</Th>
                    <Th className="text-right">Lead</Th>
                    <Th>Rating</Th>
                    <Th>Performance</Th>
                    <Th className="text-right">Total Cost (₹)</Th>
                    <Th>Remarks</Th>
                    <Th>Quote</Th>
                    <Th>Submitted</Th>
                    <Th className="text-right">Response</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.rows.map((r) => (
                    <ComparisonRow
                      key={r.request.id}
                      row={r}
                      onApprove={() => setApprovingId(r.quote?.id ?? null)}
                      onReject={() => setRejectingId(r.quote?.id ?? null)}
                      onRequestRevision={() => setRevisionFor(r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <Legend icon={<Sparkles className="h-3 w-3 text-primary" />} label="Recommended" />
        <Legend icon={<Trophy className="h-3 w-3 text-success" />} label="Lowest price" />
        <Legend icon={<Zap className="h-3 w-3 text-warning" />} label="Fastest dispatch" />
        <Legend icon={<Star className="h-3 w-3 text-warning" />} label="Preferred vendor" />
        <Legend icon={<Award className="h-3 w-3 text-primary" />} label="Highest rating" />
      </div>

      {/* Approve confirm */}
      <ConfirmDialog
        open={!!approvingId}
        onOpenChange={(o) => !o && setApprovingId(null)}
        title="Approve this vendor?"
        description="The vendor will be notified. Other submitted quotes remain visible but this one becomes the approved choice."
        confirmLabel="Approve"
        onConfirm={() => approvingId && approveMut.mutate(approvingId)}
        loading={approveMut.isPending}
      />

      {/* Reject confirm */}
      <ConfirmDialog
        open={!!rejectingId}
        onOpenChange={(o) => !o && setRejectingId(null)}
        title="Reject this quote?"
        description="The vendor will be notified that their quote was not selected."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={() => rejectingId && rejectMut.mutate(rejectingId)}
        loading={rejectMut.isPending}
      />

      {/* Revision dialog */}
      <RevisionDialog
        row={revisionFor}
        onOpenChange={(o) => !o && setRevisionFor(null)}
        onSubmit={(note) =>
          revisionFor && reviseMut.mutate({ requestId: revisionFor.request.id, note })
        }
        loading={reviseMut.isPending}
      />
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("border-b border-border px-3 py-2 font-medium", className)}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-border/60 px-3 py-2 align-middle", className)}>{children}</td>;
}

function ComparisonRow({
  row,
  onApprove,
  onReject,
  onRequestRevision,
}: {
  row: QuoteComparisonRow;
  onApprove: () => void;
  onReject: () => void;
  onRequestRevision: () => void;
}) {
  const q = row.quote;
  const submitted = !!q?.submitted_at;
  const approved = !!q?.is_approved;
  const rejected = !!q?.rejected_at;

  return (
    <tr
      className={cn(
        "transition-colors",
        row.highlights.recommended && "bg-primary/5",
        approved && "bg-success/5",
        rejected && "opacity-60",
      )}
    >
      <Td>
        <div className="flex items-start gap-1.5">
          <div className="min-w-0">
            <Link
              to="/vendors/$vendorId"
              params={{ vendorId: row.vendor.id }}
              className="truncate font-medium text-foreground hover:text-primary"
            >
              {row.vendor.company_name}
            </Link>
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {row.highlights.recommended && (
                <Badge className="h-4 gap-0.5 px-1 text-[10px]">
                  <Sparkles className="h-2.5 w-2.5" /> Recommended
                </Badge>
              )}
              {row.highlights.preferred && (
                <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[10px]">
                  <Star className="h-2.5 w-2.5 text-warning" /> Preferred
                </Badge>
              )}
              {approved && (
                <Badge className="h-4 bg-success px-1 text-[10px] text-success-foreground">
                  Approved
                </Badge>
              )}
              {rejected && (
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  Rejected
                </Badge>
              )}
              {!submitted && !rejected && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
                  Awaiting
                </Badge>
              )}
              {row.request.revision_requested_at && (
                <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[10px]">
                  <RotateCcw className="h-2.5 w-2.5" /> Revision requested
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Td>
      <Td className={cn("text-right tabular-nums", row.highlights.lowestPrice && "font-semibold text-success")}>
        {q ? Number(q.total_inr ?? 0).toLocaleString("en-IN") : "—"}
      </Td>
      <Td className="text-right tabular-nums">
        {q?.freight_inr != null ? Number(q.freight_inr).toLocaleString("en-IN") : "—"}
      </Td>
      <Td>{q ? (q.gst_included ? "Incl." : "Excl.") : "—"}</Td>
      <Td className={cn("text-right tabular-nums", row.highlights.fastestDispatch && "font-semibold text-warning")}>
        {q?.dispatch_days != null ? `${q.dispatch_days}d` : "—"}
      </Td>
      <Td>
        {q ? (
          q.stock_available ? (
            <Badge variant="outline" className="h-4 px-1 text-[10px] text-success">
              In stock
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Made to order</span>
          )
        ) : (
          "—"
        )}
      </Td>
      <Td className="text-right tabular-nums text-xs text-muted-foreground">
        {row.vendor.lead_time_days != null ? `${row.vendor.lead_time_days}d` : "—"}
      </Td>
      <Td>
        <div className={cn("flex items-center gap-1", row.highlights.topRated && "font-semibold")}>
          <Star className="h-3 w-3 text-warning" />
          {row.vendor.rating != null ? Number(row.vendor.rating).toFixed(1) : "—"}
        </div>
      </Td>
      <Td className="text-xs">
        {row.perf ? (
          <div className="text-muted-foreground">
            <div>
              Score:{" "}
              <span className="font-semibold text-foreground">
                {row.perf.score != null ? Number(row.perf.score).toFixed(0) : "—"}
              </span>
            </div>
            <div>
              {row.perf.orders_count ?? 0} orders · {row.perf.approval_pct != null ? Math.round(Number(row.perf.approval_pct)) : 0}% approved
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">New vendor</span>
        )}
      </Td>
      <Td
        className={cn(
          "text-right font-semibold tabular-nums",
          row.highlights.recommended && "text-primary",
        )}
      >
        {q ? row.totalCost.toLocaleString("en-IN") : "—"}
      </Td>
      <Td className="max-w-[220px] text-xs text-muted-foreground">
        <div className="truncate" title={q?.remarks ?? undefined}>
          {q?.remarks ?? "—"}
        </div>
      </Td>
      <Td>
        {row.pdf ? (
          <PdfLink fileId={row.pdf.id} bucket={row.pdf.bucket} path={row.pdf.object_path} name={row.pdf.file_name} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </Td>
      <Td className="whitespace-nowrap text-xs text-muted-foreground">
        {q?.submitted_at
          ? new Date(q.submitted_at).toLocaleDateString("en-IN", { dateStyle: "medium" })
          : "—"}
      </Td>
      <Td className="text-right text-xs tabular-nums text-muted-foreground">
        {row.responseHours != null ? `${row.responseHours.toFixed(1)}h` : "—"}
      </Td>
      <Td className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={!submitted || approved}
            onClick={onApprove}
            title="Approve"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={!q || rejected}
            onClick={onRequestRevision}
            title="Request revision"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={!q || rejected}
            onClick={onReject}
            title="Reject"
          >
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </Td>
    </tr>
  );
}

function PdfLink({
  fileId,
  bucket,
  path,
  name,
}: {
  fileId: string;
  bucket: string;
  path: string;
  name: string;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      onClick={async () => {
        setLoading(true);
        try {
          // Reuse the attachments signedUrl helper by passing a minimal FileRow shape.
          const url = await signedUrl(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { id: fileId, bucket, object_path: path } as any,
            600,
          );
          window.open(url, "_blank", "noopener,noreferrer");
        } finally {
          setLoading(false);
        }
      }}
      title={name}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
      Open
      <ExternalLink className="h-3 w-3" />
    </button>
  );
}

function Legend({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon} {label}
    </span>
  );
}

function RevisionDialog({
  row,
  onOpenChange,
  onSubmit,
  loading,
}: {
  row: QuoteComparisonRow | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note: string) => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");
  const initial = useMemo(() => row?.request.revision_note ?? "", [row]);
  return (
    <Dialog
      open={!!row}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setNote("");
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request revision</DialogTitle>
          <DialogDescription>
            {row?.vendor.company_name} will be notified and can update their quote.
          </DialogDescription>
        </DialogHeader>
        {initial && (
          <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Previous request:</span> {initial}
          </div>
        )}
        <Textarea
          placeholder="What needs to change? e.g. reduce dispatch to 5 days, share revised price..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(note)} disabled={loading || !note.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
