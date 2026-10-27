import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, RefreshCw, Truck } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowActions } from "@/components/data/RowActions";
import { SafeDeleteDialog } from "@/components/mdm/SafeDeleteDialog";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteInvoice, listInvoices, type InvoiceListItem } from "@/lib/invoices/api";
import { getDispatchesForInvoices } from "@/lib/dispatch/api";
import { formatInr } from "@/lib/format";
import { invalidateInvoice } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/invoices/")({
  ssr: false,
  component: InvoicesPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function InvoicesPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const search = Route.useSearch();
  const statusFilter = search.status ?? "all";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<InvoiceListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = useQuery({ queryKey: qk.invoices.list(dq), queryFn: () => listInvoices(dq) });
  const del = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: (res) => {
      if (res?.action === "voided") {
        toast.info(res.message, { duration: 6000 });
      } else {
        toast.success(res?.message || "Invoice deleted");
      }
      invalidateInvoice(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("invoices");
  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Invoice / Customer", required: true },
      { key: "challan", label: "Delivery Challan" },
      { key: "customer", label: "Customer" },
      { key: "project", label: "Project" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total" },
      { key: "balance", label: "Balance" },
      { key: "due", label: "Due" },
    ],
    [],
  );

  const setStatusFilter = (v: string) =>
    nav({
      to: "/invoices",
      search: { status: v === "all" ? undefined : v, q: dq || undefined },
    });
  const commitSearch = (v: string) => {
    setQ(v);
    setPage(1);
    nav({
      to: "/invoices",
      search: { status: statusFilter === "all" ? undefined : statusFilter, q: v || undefined },
    });
  };
  const rows = (query.data ?? []).filter(
    (r) => statusFilter === "all" || r.status === statusFilter,
  );
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const pageRowIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const dispatchesQ = useQuery({
    queryKey: ["invoices", "dispatches-for-list", pageRowIds],
    queryFn: () => getDispatchesForInvoices(pageRows),
    enabled: pageRows.length > 0,
    staleTime: 60_000,
  });
  const dispatchesByInvoice = dispatchesQ.data ?? {};

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dq]);

  return (
    <div>
      <PageHeader
        title="Sales Invoices"
        subtitle="Collect payments — Razorpay links or manual entries."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search by invoice no…"
        primaryFilter={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Issued / Sent</SelectItem>
              <SelectItem value="partially_paid">Partially paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="void">Void</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite && (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/invoices/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("invoices.newInvoice", "New invoice")}
            </Button>
          )
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title="No invoices yet"
          message="Convert an accepted quote to create your first invoice."
          action={
            <Button onClick={() => nav({ to: "/invoices/new" })}>
              <Plus className="mr-2 h-4 w-4" /> {t("invoices.newInvoice", "New invoice")}
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
                {!isHidden("no") && <TableHead>Invoice / Customer</TableHead>}
                {!isHidden("challan") && <TableHead>Delivery Challan</TableHead>}
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("project") && <TableHead>Project</TableHead>}
                {!isHidden("date") && <TableHead>Date</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("total") && <TableHead className="text-right">Total</TableHead>}
                {!isHidden("balance") && <TableHead className="text-right">Balance</TableHead>}
                {!isHidden("due") && <TableHead>Due</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="text-xs">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground text-xs truncate max-w-[160px] sm:max-w-none">
                          {r.customer?.name ?? "—"}
                        </span>
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: r.id }}
                          className="font-mono text-[11px] text-primary hover:underline truncate"
                        >
                          {r.invoice_no}
                        </Link>
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("challan") && (
                    <TableCell className="text-xs">
                      {(() => {
                        const challans = dispatchesByInvoice[r.id] ?? [];
                        const primaryChallan = challans[0];
                        const challanNo = primaryChallan?.dispatch_no || r.lr_no;
                        if (primaryChallan) {
                          return (
                            <Link
                              to="/dispatch/$id"
                              params={{ id: primaryChallan.id }}
                              className="font-mono text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                              title={`Delivery Challan ${primaryChallan.dispatch_no} (${primaryChallan.dispatch_date})`}
                            >
                              <Truck className="h-3 w-3 text-muted-foreground shrink-0" />
                              {primaryChallan.dispatch_no}
                            </Link>
                          );
                        }
                        if (challanNo) {
                          return (
                            <span className="font-mono text-muted-foreground inline-flex items-center gap-1">
                              <Truck className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                              {challanNo}
                            </span>
                          );
                        }
                        return <span className="text-muted-foreground/50">—</span>;
                      })()}
                    </TableCell>
                  )}
                  {!isHidden("customer") && <TableCell>{r.customer?.name ?? "—"}</TableCell>}
                  {!isHidden("project") && <TableCell>{r.project?.name ?? "—"}</TableCell>}
                  {!isHidden("date") && (
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.issue_date ?? "—"}
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell>
                      {r.status === "void" ? (
                        <Badge
                          variant="destructive"
                          className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 font-bold text-[10px]"
                        >
                          VOID
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {r.status === "sent" ? "Issued / Sent" : r.status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  {!isHidden("total") && (
                    <TableCell className="text-right tabular-nums">{formatInr(r.total)}</TableCell>
                  )}
                  {!isHidden("balance") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.balance_due)}
                    </TableCell>
                  )}
                  {!isHidden("due") && <TableCell>{r.due_date ?? "—"}</TableCell>}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      {(r.status === "void" || r.status === "cancelled") && (
                        <Button
                          asChild
                          size="xs"
                          variant="outline"
                          className="h-7 px-2 text-xs font-semibold gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <Link to="/invoices/new" search={{ reuseInvoiceId: r.id }}>
                            <RefreshCw className="h-3 w-3 text-amber-600" />
                            <span>Reuse</span>
                          </Link>
                        </Button>
                      )}
                      <RowActions
                        extra={
                          r.status === "void" || r.status === "cancelled" ? (
                            <DropdownMenuItem asChild>
                              <Link to="/invoices/new" search={{ reuseInvoiceId: r.id }}>
                                <RefreshCw className="mr-2 h-4 w-4 text-amber-600" /> Reuse Invoice
                                Number
                              </Link>
                            </DropdownMenuItem>
                          ) : undefined
                        }
                        onEdit={() =>
                          nav({ to: "/invoices/$invoiceId/edit", params: { invoiceId: r.id } })
                        }
                        onDelete={() => setToDelete(r)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <SafeDeleteDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entityType="invoice"
        entityId={toDelete?.id ?? null}
        entityLabel={toDelete ? toDelete.invoice_no : ""}
        busy={del.isPending}
        onConfirmDelete={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
