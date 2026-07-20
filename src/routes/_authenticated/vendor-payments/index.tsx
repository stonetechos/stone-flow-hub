import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Banknote } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  deleteVendorPayment,
  listVendorPayments,
  type VendorPaymentListItem,
} from "@/lib/vendor-payments/api";
import { invalidateVendorPayment } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/vendor-payments/")({
  ssr: false,
  component: VendorPaymentsPage,
});

function VendorPaymentsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<VendorPaymentListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("vendor-payments");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Payment #", required: true },
      { key: "vendor", label: "Vendor" },
      { key: "po", label: "PO" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount" },
      { key: "paid", label: "Paid on" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.vendorPayments.list(dq),
    queryFn: () => listVendorPayments(dq),
  });
  useEffect(() => setPage(1), [dq]);

  const del = useMutation({
    mutationFn: (id: string) => deleteVendorPayment(id),
    onSuccess: () => {
      toast.success("Payment removed");
      invalidateVendorPayment(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Vendor Payments"
        subtitle="Advance, part, full, retention, credit / debit note and refund posts."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search payment no or reference…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" className="h-8" onClick={() => nav({ to: "/vendor-payments/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Record payment
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
          icon={<Banknote className="h-6 w-6" />}
          title="No vendor payments yet"
          message="Record an advance, part or full payment to a vendor."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/vendor-payments/new" })}>
                <Plus className="mr-2 h-4 w-4" /> Record payment
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
                {!isHidden("no") && <TableHead>Payment #</TableHead>}
                {!isHidden("vendor") && <TableHead>Vendor</TableHead>}
                {!isHidden("po") && <TableHead>PO</TableHead>}
                {!isHidden("type") && <TableHead>Type</TableHead>}
                {!isHidden("amount") && <TableHead className="text-right">Amount</TableHead>}
                {!isHidden("paid") && <TableHead>Paid on</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">{r.payment_no}</TableCell>
                  )}
                  {!isHidden("vendor") && (
                    <TableCell>
                      {r.vendor ? (
                        <Link
                          to="/vendors/$vendorId"
                          params={{ vendorId: r.vendor.id }}
                          className="text-primary hover:underline"
                        >
                          {r.vendor.company_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {!isHidden("po") && (
                    <TableCell>
                      {r.purchase_order ? (
                        <Link
                          to="/purchase-orders/$id"
                          params={{ id: r.purchase_order.id }}
                          className="text-primary hover:underline"
                        >
                          {r.purchase_order.po_no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {!isHidden("type") && (
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {r.payment_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("amount") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      ₹ {Number(r.amount).toLocaleString("en-IN")}
                    </TableCell>
                  )}
                  {!isHidden("paid") && <TableCell>{r.paid_at}</TableCell>}
                  <TableCell>
                    <RowActions onDelete={() => setToDelete(r)} />
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
        title="Delete vendor payment?"
        description={
          toDelete ? `${toDelete.payment_no} will be reversed from the vendor ledger.` : ""
        }
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
