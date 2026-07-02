import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteInvoice, listInvoices, type InvoiceListItem } from "@/lib/invoices/api";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoices/")({
  ssr: false,
  component: InvoicesPage,
});

function InvoicesPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toDelete, setToDelete] = useState<InvoiceListItem | null>(null);
  const nav = useNavigate();
  const qc = useQueryClient();
  const query = useQuery({ queryKey: qk.invoices.list(q), queryFn: () => listInvoices(q) });
  const del = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => { toast.success("Invoice deleted"); qc.invalidateQueries({ queryKey: qk.invoices.all }); setToDelete(null); },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const rows = (query.data ?? []).filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Collect payments — Razorpay links or manual entries."
        actions={<Button onClick={() => nav({ to: "/invoices/new" })}><Plus className="mr-2 h-4 w-4" /> New invoice</Button>}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by invoice no…" className="max-w-md" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="partially_paid">Partially paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No invoices yet"
          message="Convert an accepted quote to create your first invoice."
          action={<Button onClick={() => nav({ to: "/invoices/new" })}><Plus className="mr-2 h-4 w-4" /> New invoice</Button>}
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to="/invoices/$invoiceId" params={{ invoiceId: r.id }} className="text-primary hover:underline">
                      {r.invoice_no}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell>{r.project?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-right">{formatInr(r.total)}</TableCell>
                  <TableCell className="text-right font-medium">{formatInr(r.balance_due)}</TableCell>
                  <TableCell>{r.due_date ?? "—"}</TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId: r.id } })}
                      onDelete={() => setToDelete(r)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete invoice?" description={toDelete ? `${toDelete.invoice_no} will be removed.` : ""}
        busy={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id)} />
    </div>
  );
}
