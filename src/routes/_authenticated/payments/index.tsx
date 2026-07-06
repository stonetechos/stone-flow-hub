import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
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

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="All customer payments recorded against invoices."
        actions={
          roles.canWrite && (
            <Button onClick={() => nav({ to: "/payments/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New payment
            </Button>
          )
        }
      />


      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search payment or reference…"
          className="max-w-md"
        />
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No payments yet"
          message="Record a payment received against an invoice."
          action={
            <Button onClick={() => nav({ to: "/payments/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New payment
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/payments/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.payment_no}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.invoice?.invoice_no ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.method.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.reference_no ?? "—"}</TableCell>
                  <TableCell>{new Date(r.paid_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(r.amount).toFixed(2)}
                  </TableCell>
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
        </div>
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
