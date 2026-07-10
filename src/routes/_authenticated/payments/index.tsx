import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deletePayment, listPayments, type PaymentListItem } from "@/lib/payments/crud";
import { invalidatePayment } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/payments/")({
  ssr: false,
  component: PaymentsPage,
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function PaymentsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<PaymentListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("payments");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "invoice", label: "Invoice" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
      { key: "date", label: "Date" },
      { key: "amount", label: "Amount" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.paymentsAll.list(dq), queryFn: () => listPayments(dq) });
  const del = useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      toast.success("Payment deleted");
      invalidatePayment(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });
  const commitSearch = (v: string) => {
    setQ(v);
    nav({ to: "/payments", search: { q: v || undefined } });
  };
  useEffect(() => setPage(1), [dq]);

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader title="Payments" subtitle="All customer payments recorded against invoices." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search payment or reference…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/payments/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New payment
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No payments yet"
          message="Record a payment received against an invoice."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/payments/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("no") && <TableHead>No.</TableHead>}
                {!isHidden("invoice") && <TableHead>Invoice</TableHead>}
                {!isHidden("method") && <TableHead>Method</TableHead>}
                {!isHidden("reference") && <TableHead>Reference</TableHead>}
                {!isHidden("date") && <TableHead>Date</TableHead>}
                {!isHidden("amount") && <TableHead className="text-right">Amount</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link to="/payments/$id" params={{ id: r.id }} className="text-primary hover:underline">
                        {r.payment_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("invoice") && <TableCell className="font-mono text-xs">{r.invoice?.invoice_no ?? "—"}</TableCell>}
                  {!isHidden("method") && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{r.method.replace(/_/g, " ")}</Badge>
                    </TableCell>
                  )}
                  {!isHidden("reference") && <TableCell>{r.reference_no ?? "—"}</TableCell>}
                  {!isHidden("date") && <TableCell>{new Date(r.paid_at).toLocaleDateString()}</TableCell>}
                  {!isHidden("amount") && <TableCell className="text-right font-mono tabular-nums">{Number(r.amount).toFixed(2)}</TableCell>}
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/payments/$id/edit", params: { id: r.id } })}
                      onDelete={() => setToDelete(r)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete payment?"
        description={toDelete ? `${toDelete.payment_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
