import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listReceipts } from "@/lib/receipts/api";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts/")({
  ssr: false,
  component: ReceiptsListPage,
});

function ReceiptsListPage() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("receipts");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Receipt #", required: true },
      { key: "date", label: "Date" },
      { key: "customer", label: "Customer" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
      { key: "amount", label: "Amount" },
      { key: "unallocated", label: "Unallocated" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.receipts.list(dq), queryFn: () => listReceipts(dq) });
  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [dq]);

  const totalReceived = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalUnalloc = rows.reduce((s, r) => s + Number(r.unallocated_amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Customer Receipts"
        subtitle="Advance receipts, invoice payments, TDS, bank charges and refunds — with full allocation history."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search receipt #, UTR, cheque…"
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            Received {formatInr(totalReceived)} · Unallocated {formatInr(totalUnalloc)}
          </span>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button size="sm" className="h-8" asChild>
            <Link to="/receipts/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New receipt
            </Link>
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No receipts yet"
          message="Record your first customer receipt to start tracking payments and ledger balances."
          action={
            <Button asChild>
              <Link to="/receipts/new">
                <Plus className="mr-2 h-4 w-4" /> New receipt
              </Link>
            </Button>
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
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("no") && <TableHead>Receipt #</TableHead>}
                {!isHidden("date") && <TableHead>Date</TableHead>}
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("method") && <TableHead>Method</TableHead>}
                {!isHidden("reference") && <TableHead>Reference</TableHead>}
                {!isHidden("amount") && <TableHead className="text-right">Amount</TableHead>}
                {!isHidden("unallocated") && (
                  <TableHead className="text-right">Unallocated</TableHead>
                )}
                {!isHidden("status") && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell>
                      <Link
                        to="/receipts/$receiptId"
                        params={{ receiptId: r.id }}
                        className="font-medium hover:underline"
                      >
                        {r.receipt_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("date") && (
                    <TableCell className="text-sm">{formatDate(r.received_at)}</TableCell>
                  )}
                  {!isHidden("customer") && (
                    <TableCell className="text-sm">{r.customer?.name ?? "—"}</TableCell>
                  )}
                  {!isHidden("method") && (
                    <TableCell className="text-sm uppercase">{r.method}</TableCell>
                  )}
                  {!isHidden("reference") && (
                    <TableCell className="text-sm">
                      {r.reference_no ?? r.cheque_no ?? "—"}
                    </TableCell>
                  )}
                  {!isHidden("amount") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.amount)}
                    </TableCell>
                  )}
                  {!isHidden("unallocated") && (
                    <TableCell className="text-right tabular-nums">
                      {formatInr(r.unallocated_amount)}
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell>
                      <Badge
                        variant={r.status === "void" ? "destructive" : "outline"}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
