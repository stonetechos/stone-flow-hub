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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { deleteDispatch, listDispatches, type DispatchListItem } from "@/lib/dispatch/api";
import { DISPATCH_STATUSES } from "@/lib/dispatch/schema";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/dispatch/")({
  ssr: false,
  component: DispatchPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function DispatchPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const status = search.status ?? "";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<DispatchListItem | null>(null);

  const query = useQuery({
    queryKey: qk.dispatch.list(dq, status),
    queryFn: () => listDispatches(dq, status),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteDispatch(id),
    onSuccess: () => {
      toast.success("Dispatch deleted");
      invalidateDispatch(qc);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const setStatus = (v: string) =>
    nav({ to: "/dispatch", search: { status: v || undefined, q: dq || undefined } });
  const commitSearch = (v: string) => {
    setQ(v);
    nav({ to: "/dispatch", search: { status: status || undefined, q: v || undefined } });
  };

  return (
    <div>
      <PageHeader
        title="Dispatch"
        subtitle="Outbound shipments against sales orders."
        actions={
          roles.canWrite && (
            <Button onClick={() => nav({ to: "/dispatch/new" })}>
              <Plus className="mr-2 h-4 w-4" /> New dispatch
            </Button>
          )
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => commitSearch(e.target.value)}
          placeholder="Search dispatch, carrier, tracking…"
          className="max-w-md"
        />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DISPATCH_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title="No dispatches yet"
          message="Create a dispatch to plan an outbound shipment."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/dispatch/new" })}>
                <Plus className="mr-2 h-4 w-4" /> New dispatch
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border border-border bg-card shadow-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Sales Order</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data!.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/dispatch/$id"
                      params={{ id: r.id }}
                      className="text-primary hover:underline"
                    >
                      {r.dispatch_no}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.sales_order?.so_no ?? "—"}</TableCell>
                  <TableCell>{r.carrier ?? "—"}</TableCell>
                  <TableCell>{r.tracking_no ?? "—"}</TableCell>
                  <TableCell>{r.dispatch_date}</TableCell>
                  <TableCell>
                    <StatusPill status={r.status} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      onEdit={() => nav({ to: "/dispatch/$id/edit", params: { id: r.id } })}
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
        title="Delete dispatch?"
        description={toDelete ? `${toDelete.dispatch_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
