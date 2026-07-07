import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getReceipt, getReceiptAllocations, voidReceipt } from "@/lib/receipts/api";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/$receiptId")({
  ssr: false,
  component: ReceiptDetailPage,
});

function ReceiptDetailPage() {
  const { receiptId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: qk.receipts.byId(receiptId),
    queryFn: () => getReceipt(receiptId),
  });
  const allocs = useQuery({
    queryKey: qk.receipts.allocations(receiptId),
    queryFn: () => getReceiptAllocations(receiptId),
  });

  const voidMut = useMutation({
    mutationFn: () => voidReceipt(receiptId),
    onSuccess: () => {
      toast.success("Receipt voided");
      invalidateReceipt(qc, receiptId, query.data?.customer_id);
      query.refetch();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  if (query.isLoading) return <LoadingBlock />;
  if (query.error) return <ErrorBlock message={toUserMessage(query.error)} />;
  if (!query.data) return <ErrorBlock message="Receipt not found" />;
  const r = query.data;

  return (
    <div>
      <PageHeader
        title={`Receipt ${r.receipt_no}`}
        subtitle={r.customer?.name ?? "—"}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav({ to: "/receipts" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {r.status !== "void" && (
              <Button variant="destructive" size="sm" onClick={() => voidMut.mutate()} disabled={voidMut.isPending}>
                <Ban className="mr-2 h-4 w-4" /> Void
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-1 md:col-span-2">
          <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Field k="Received on" v={formatDate(r.received_at)} />
            <Field k="Method" v={r.method.toUpperCase()} />
            <Field k="Bank" v={r.bank_name ?? "—"} />
            <Field k="Account" v={r.account_used ?? "—"} />
            <Field k="UTR / Ref" v={r.reference_no ?? "—"} />
            <Field k="Cheque #" v={r.cheque_no ?? "—"} />
            <Field k="Cheque date" v={r.cheque_date ? formatDate(r.cheque_date) : "—"} />
            <Field k="Status" v={<Badge variant={r.status === "void" ? "destructive" : "outline"} className="capitalize">{r.status}</Badge>} />
            <Field k="Remarks" v={r.remarks ?? "—"} full />
          </CardContent>
        </Card>

        <Card className="shadow-1">
          <CardHeader><CardTitle className="text-sm">Amounts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line k="Gross" v={formatInr(r.amount)} />
            <Line k="TDS" v={formatInr(-Number(r.tds_amount))} />
            <Line k="Bank charges" v={formatInr(-Number(r.bank_charges))} />
            <Line k="Net" v={formatInr(r.net_amount)} bold />
            <hr className="my-2 border-border" />
            <Line k="Allocated" v={formatInr(r.allocated_amount)} />
            <Line k="Unallocated" v={formatInr(r.unallocated_amount)} bold />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 shadow-1">
        <CardHeader><CardTitle className="text-sm">Allocations</CardTitle></CardHeader>
        <CardContent>
          {allocs.isLoading ? (
            <LoadingBlock />
          ) : (allocs.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Unallocated advance — apply to invoices from the customer ledger.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Invoice total</TableHead>
                  <TableHead className="text-right">Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(allocs.data ?? []).map((a) => {
                  const inv = (a as { invoice: { id: string; invoice_no: string; total: number; issue_date: string } | null }).invoice;
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        {inv ? (
                          <Link to="/invoices/$id" params={{ id: inv.id }} className="hover:underline font-mono text-xs">
                            {inv.invoice_no}
                          </Link>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{inv ? formatDate(inv.issue_date) : "—"}</TableCell>
                      <TableCell className="text-right">{inv ? formatInr(inv.total) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatInr(a.amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ k, v, full }: { k: string; v: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div>{v}</div>
    </div>
  );
}
function Line({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-semibold" : ""}>{v}</span>
    </div>
  );
}
