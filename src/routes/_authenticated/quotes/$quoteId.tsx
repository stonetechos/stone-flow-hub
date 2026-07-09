import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  ArrowRightCircle,
  Pencil,
  Trash2,
  ShoppingCart,
  Printer,
  Share2,
  FolderOpen,
  History,
  UserCheck,
  Copy,
} from "lucide-react";
import { TransferOwnershipDialog } from "@/components/ownership/TransferOwnershipDialog";
import { ReassignCustomerDialog } from "@/components/quotes/ReassignCustomerDialog";
import { useRoles } from "@/hooks/use-roles";
import { DetailActionBar } from "@/components/entity/DetailActionBar";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { GuidedNextStep } from "@/components/guided-workflow/GuidedNextStep";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { AttachmentsPanel, NotesPanel, TimelinePanel } from "@/components/entity/DetailPanels";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  convertQuoteToInvoice,
  deleteQuote,
  getQuote,
  getQuoteItems,
  reviseQuote,
  setQuoteStatus,
} from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import type { DbTable } from "@/lib/types";
import { invalidateQuote, invalidateInvoice } from "@/lib/query-invalidation";

type QuoteStatus = DbTable<"quotes">["status"];

export const Route = createFileRoute("/_authenticated/quotes/$quoteId")({
  ssr: false,
  component: QuoteDetailPage,
});

function QuoteDetailPage() {
  const { quoteId } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [confirmDel, setConfirmDel] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const roles = useRoles();
  const canReassign = roles.isAdmin || roles.isSalesManager;

  const q = useQuery({ queryKey: qk.quotes.byId(quoteId), queryFn: () => getQuote(quoteId) });
  const items = useQuery({
    queryKey: qk.quotes.items(quoteId),
    queryFn: () => getQuoteItems(quoteId),
  });

  const statusMut = useMutation({
    mutationFn: (s: QuoteStatus) => setQuoteStatus(quoteId, s),
    onSuccess: () => {
      toast.success("Status updated");
      invalidateQuote(qc, quoteId);
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const convertMut = useMutation({
    mutationFn: () => convertQuoteToInvoice({ quote_id: quoteId }),
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_no} created`);
      invalidateQuote(qc, quoteId); invalidateInvoice(qc);
      nav({ to: "/invoices/$invoiceId", params: { invoiceId: inv.id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const delMut = useMutation({
    mutationFn: () => deleteQuote(quoteId),
    onSuccess: () => {
      toast.success("Quote deleted");
      qc.invalidateQueries({ queryKey: qk.quotes.all });
      nav({ to: "/quotes" });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  const reviseMut = useMutation({
    mutationFn: () => reviseQuote(quoteId),
    onSuccess: (rev) => {
      toast.success(`Revision ${rev.quote_no} created as draft`);
      qc.invalidateQueries({ queryKey: qk.quotes.all });
      nav({ to: "/quotes/$quoteId/edit", params: { quoteId: rev.id } });
    },
    onError: (err) => toast.error(toUserMessage(err)),
  });

  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return <ErrorBlock message="Quote not found." />;

  const quote = q.data;
  const canConvert = quote.status === "accepted";
  const isDraft = quote.status === "draft";
  const isAccepted = quote.status === "accepted";

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/quotes"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to quotes
        </Link>
      </div>

      <PageHeader
        title={quote.quote_no}
        subtitle={`${quote.project?.name ?? "—"} • ${quote.customer?.name ?? "—"}`}
        actions={
          <DetailActionBar
            pin={{ entityType: "quote", entityId: quoteId, label: quote.quote_no }}
            primary={
              <>
                <Button
                  size="sm"
                  onClick={() => nav({ to: "/quotes/$quoteId/edit", params: { quoteId } })}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Link
                  to="/sales-orders/new"
                  search={{
                    quote: quoteId,
                    ...(quote.project_id ? { project: quote.project_id } : {}),
                    ...(quote.customer_id ? { customer: quote.customer_id } : {}),
                  }}
                >
                  <Button size="sm" variant="outline">
                    <ShoppingCart className="mr-2 h-4 w-4" /> Sales order
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={() => convertMut.mutate()}
                  disabled={!canConvert || convertMut.isPending}
                >
                  {convertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to invoice
                </Button>
              </>
            }
            overflow={[
              {
                label: "Print",
                icon: <Printer className="h-4 w-4" />,
                onSelect: () => window.print(),
              },
              {
                label: "Share link",
                icon: <Share2 className="h-4 w-4" />,
                onSelect: async () => {
                  await navigator.clipboard.writeText(window.location.href);
                },
              },
              {
                label: "Documents",
                icon: <FolderOpen className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("quote-documents")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              {
                label: "Timeline",
                icon: <History className="h-4 w-4" />,
                onSelect: () =>
                  document
                    .getElementById("quote-timeline")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              },
              ...(canReassign
                ? [
                    {
                      label: "Change customer",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setReassignOpen(true),
                      separatorBefore: true,
                    },
                    {
                      label: "Transfer ownership (wizard)",
                      icon: <UserCheck className="h-4 w-4" />,
                      onSelect: () => setTransferOpen(true),
                    },
                  ]
                : []),
              {
                label: "Delete quote",
                icon: <Trash2 className="h-4 w-4" />,
                onSelect: () => setConfirmDel(true),
                destructive: true,
                separatorBefore: true,
              },
            ]}
          />
        }
      />

      <GuidedNextStep entity="quote" entityId={quoteId} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items.data ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.description}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell>{it.unit ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatInr(it.unit_price)}</TableCell>
                    <TableCell className="text-right">{it.tax_pct}%</TableCell>
                    <TableCell className="text-right">{formatInr(it.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div>
                Subtotal: <span className="font-medium">{formatInr(quote.subtotal)}</span>
              </div>
              <div>
                Tax: <span className="font-medium">{formatInr(quote.tax_amount)}</span>
              </div>
              <div className="text-base font-semibold">Total: {formatInr(quote.total)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="capitalize">
              {quote.status}
            </Badge>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Change status</label>
              <Select
                value={quote.status}
                onValueChange={(v) => statusMut.mutate(v as QuoteStatus)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {!canConvert && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Mark as <span className="font-medium">Accepted</span> to convert into an invoice.
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              <div>Valid until: {quote.valid_until ?? "—"}</div>
              {quote.notes && <div className="mt-2 whitespace-pre-line">{quote.notes}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <NotesPanel
          table="quotes"
          id={quoteId}
          value={quote.notes ?? null}
          invalidateKey={qk.quotes.byId(quoteId)}
        />
        <div id="quote-documents">
          <AttachmentsPanel entityType="quote" entityId={quoteId} />
        </div>
        <div id="quote-timeline">
          <TimelinePanel entityType="quote" entityId={quoteId} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete quote?"
        description={`${quote.quote_no} will be removed.`}
        busy={delMut.isPending}
        onConfirm={() => delMut.mutate()}
      />

      {canReassign && (
        <ReassignCustomerDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          quoteId={quoteId}
          quoteNo={quote.quote_no}
          currentCustomerId={quote.customer_id}
        />
      )}

      {canReassign && quote.customer_id && (
        <TransferOwnershipDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          sourceType="quote"
          sourceId={quoteId}
          sourceLabel={quote.quote_no}
          fromCustomerId={quote.customer_id}
        />
      )}
    </div>
  );
}
