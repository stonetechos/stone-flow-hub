import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Banknote } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const query = useQuery({
    queryKey: qk.vendorPayments.list(dq),
    queryFn: () => listVendorPayments(dq),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteVendorPayment(id),
    onSuccess: () => {
      toast.success("Payment removed");
      invalidateVendorPayment(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Vendor Payments"
        subtitle="Advance, part, full, retention, credit / debit note and refund posts."
        actions={
          roles.canWrite && (
            <Button onClick={() => nav({ to: "/vendor-payments/new" })}>
              <Plus className="mr-2 h-4 w-4" /> Record payment
            </Button>
          )
        }
      />
      <div className="mb-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search payment no or reference…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
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
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.payment_no}</TableCell>
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
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {r.payment_type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹ {Number(r.amount).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{r.paid_at}</TableCell>
                  <TableCell>
                    <RowActions onDelete={() => setToDelete(r)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete vendor payment?"
        description={
          toDelete
            ? `${toDelete.payment_no} will be reversed from the vendor ledger.`
            : ""
        }
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
