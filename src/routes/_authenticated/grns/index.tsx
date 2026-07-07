import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
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
import { RowActions } from "@/components/data/RowActions";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { StatusPill } from "@/components/entity/StatusPill";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteGrn, listGrns, type GrnListItem } from "@/lib/grns/api";
import { invalidateGrn } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/grns/")({
  ssr: false,
  component: GrnsPage,
});

function GrnsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const roles = useRoles();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<GrnListItem | null>(null);

  const query = useQuery({
    queryKey: qk.grns.list(dq),
    queryFn: () => listGrns(dq),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteGrn(id),
    onSuccess: () => {
      toast.success("GRN deleted");
      invalidateGrn(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  return (
    <div>
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Receive material against purchase orders, capture batches and inspection."
        actions={
          roles.canWrite && (
            <Button onClick={() => nav({ to: "/grns/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New GRN
            </Button>
          )
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GRN no, challan, vehicle…"
          className="max-w-md"
        />
      </div>
      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title="No GRNs yet"
          message="Receive material against a purchase order to create your first GRN."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/grns/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New GRN
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>PO</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acceptance</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/grns/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.grn_no}
                    </Link>
                  </TableCell>
                  <TableCell>{r.vendor?.company_name ?? "—"}</TableCell>
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
                  <TableCell>{r.received_date}</TableCell>
                  <TableCell>
                    <StatusPill status={r.status} />
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {r.overall_acceptance.replace(/_/g, " ")}
                  </TableCell>
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
        title="Delete GRN?"
        description={
          toDelete
            ? `${toDelete.grn_no} will be removed. Inventory and ledger entries are reversed automatically.`
            : ""
        }
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
