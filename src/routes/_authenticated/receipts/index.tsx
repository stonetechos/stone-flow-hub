import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Wallet, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
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
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { EditReceiptDialog } from "@/components/receipts/EditReceiptDialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listReceipts, deleteReceipt, type ReceiptListItem } from "@/lib/receipts/api";
import { invalidateReceipt } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";
import { TransactionMessageReaderModal } from "@/components/banking/TransactionMessageReaderModal";

export const Route = createFileRoute("/_authenticated/receipts/")({
  ssr: false,
  component: ReceiptsListPage,
});

function ReceiptsListPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [readerOpen, setReaderOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<ReceiptListItem | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("receipts");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: t("receipts.receiptNo", "Receipt #"), required: true },
      { key: "date", label: t("common.date", "Date") },
      { key: "customer", label: t("common.customer", "Customer") },
      { key: "method", label: t("receipts.method", "Method") },
      { key: "reference", label: t("receipts.reference", "Reference") },
      { key: "amount", label: t("common.amount", "Amount") },
      { key: "unallocated", label: t("receipts.unallocated", "Unallocated") },
      { key: "status", label: t("common.status", "Status") },
    ],
    [t],
  );

  const query = useQuery({ queryKey: qk.receipts.list(dq), queryFn: () => listReceipts(dq) });

  const del = useMutation({
    mutationFn: async (id: string) => deleteReceipt(id),
    onSuccess: () => {
      toast.success("Receipt deleted successfully");
      invalidateReceipt(qc, toDelete?.id, toDelete?.customer_id);
      void qc.invalidateQueries({ queryKey: qk.paymentRegister.all });
      void qc.invalidateQueries({ queryKey: ["customer-ledger-summaries"] });
      setToDelete(null);
      void query.refetch();
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [dq]);

  const totalReceived = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const totalUnalloc = rows.reduce((s, r) => s + Number(r.unallocated_amount ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={t("receipts.customerReceipts", "Customer Receipts")}
        subtitle={t(
          "receipts.customerReceiptsSubtitle",
          "Advance receipts, invoice payments, TDS, bank charges and refunds — with full allocation history.",
        )}
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder={t("receipts.searchPlaceholder", "Search receipt #, UTR, cheque…")}
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            {t("receipts.received", "Received")} {formatInr(totalReceived)} ·{" "}
            {t("receipts.unallocated", "Unallocated")} {formatInr(totalUnalloc)}
          </span>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              onClick={() => setReaderOpen(true)}
            >
              <MessageSquareText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t("banking.readUpiSms", "Read UPI / SMS")}</span>
            </Button>
            <Button size="sm" className="h-8" asChild>
              <Link to="/receipts/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("receipts.newReceipt", "New receipt")}
              </Link>
            </Button>
          </div>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title={t("receipts.emptyTitle", "No receipts yet")}
          message={t(
            "receipts.emptyMessage",
            "Record your first customer receipt to start tracking payments and ledger balances.",
          )}
          action={
            <Button asChild>
              <Link to="/receipts/new">
                <Plus className="mr-2 h-4 w-4" /> {t("receipts.newReceipt", "New receipt")}
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
                {!isHidden("no") && <TableHead>{t("receipts.receiptNo", "Receipt #")}</TableHead>}
                {!isHidden("date") && <TableHead>{t("common.date", "Date")}</TableHead>}
                {!isHidden("customer") && <TableHead>{t("common.customer", "Customer")}</TableHead>}
                {!isHidden("method") && <TableHead>{t("receipts.method", "Method")}</TableHead>}
                {!isHidden("reference") && (
                  <TableHead>{t("receipts.reference", "Reference")}</TableHead>
                )}
                {!isHidden("amount") && (
                  <TableHead className="text-right">{t("common.amount", "Amount")}</TableHead>
                )}
                {!isHidden("unallocated") && (
                  <TableHead className="text-right">
                    {t("receipts.unallocated", "Unallocated")}
                  </TableHead>
                )}
                {!isHidden("status") && <TableHead>{t("common.status", "Status")}</TableHead>}
                <TableHead className="w-12" />
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
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => setEditingReceipt(r)}
                      onDelete={() => setToDelete(r)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {editingReceipt && (
        <EditReceiptDialog
          open={!!editingReceipt}
          onOpenChange={(open) => !open && setEditingReceipt(null)}
          receipt={editingReceipt}
          onSuccess={() => {
            invalidateReceipt(qc, editingReceipt.id, editingReceipt.customer_id);
            void qc.invalidateQueries({ queryKey: qk.receipts.all });
            void qc.invalidateQueries({ queryKey: qk.paymentRegister.all });
            void qc.invalidateQueries({ queryKey: ["customer-ledger-summaries"] });
            void query.refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("receipts.deleteTitle", "Delete Receipt")}
        description={
          toDelete
            ? t(
                "receipts.deleteConfirm",
                `Are you sure you want to delete receipt ${toDelete.receipt_no}? Any allocations to invoices will be reversed and the invoice balance updated.`,
              )
            : ""
        }
        confirmLabel={t("common.delete", "Delete")}
        tone="danger"
        busy={del.isPending}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id);
        }}
      />

      <TransactionMessageReaderModal open={readerOpen} onOpenChange={setReaderOpen} />
    </div>
  );
}
