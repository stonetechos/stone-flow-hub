import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Truck, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { OrderTrackingWhatsappDialog } from "@/components/orders/OrderTrackingWhatsappDialog";
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
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { deleteDispatch, listDispatches, type DispatchListItem } from "@/lib/dispatch/api";
import { listQuotes } from "@/lib/quotes/api";
import { formatInr } from "@/lib/format";
import { DISPATCH_STATUSES } from "@/lib/dispatch/schema";
import { invalidateDispatch } from "@/lib/query-invalidation";
import { useRoles } from "@/hooks/use-roles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "lucide-react";
import { LocalCartingView } from "../local-carting";

export const Route = createFileRoute("/_authenticated/dispatch/")({
  ssr: false,
  component: DispatchPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function DispatchPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const search = Route.useSearch();
  const status = search.status ?? "";
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<DispatchListItem | null>(null);
  const [trackingTarget, setTrackingTarget] = useState<DispatchListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("dispatch");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: t("dispatch.columns.dispatchNo", "Dispatch / Customer"), required: true },
      { key: "customer", label: t("common.customer", "Customer") },
      { key: "so", label: t("dispatch.columns.so", "Sales Order") },
      { key: "carrier", label: t("dispatch.columns.carrier", "Carrier") },
      { key: "tracking", label: t("dispatch.columns.tracking", "Tracking") },
      { key: "amount", label: t("common.amount", "Total Amount") },
      { key: "date", label: t("common.date", "Date") },
      { key: "status", label: t("common.status", "Status") },
    ],
    [t],
  );

  const query = useQuery({
    queryKey: qk.dispatch.list(dq, status),
    queryFn: () => listDispatches(dq, status),
  });
  const quotesList = useQuery({
    queryKey: qk.quotes.list(""),
    queryFn: () => listQuotes(""),
  });
  useEffect(() => setPage(1), [dq, status]);

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

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dispatch.title", "Dispatches & Carting")}
        subtitle={t(
          "dispatch.subtitle",
          "Outbound deliveries, vehicle tracking, delivery paperwork, and local carting agencies.",
        )}
      />

      <Tabs defaultValue="dispatches" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="dispatches" className="gap-2">
            <Truck className="h-4 w-4" />
            <span>{t("dispatch.tabs.dispatches", "Dispatches")}</span>
          </TabsTrigger>
          <TabsTrigger value="carting" className="gap-2">
            <Navigation className="h-4 w-4" />
            <span>{t("dispatch.tabs.localCarting", "Local Carting")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dispatches" className="space-y-4">
          <DataToolbar
            count={rows.length}
            search={q}
            onSearchChange={commitSearch}
            searchPlaceholder={t(
              "dispatch.searchPlaceholder",
              "Search dispatch, carrier, tracking…",
            )}
            primaryFilter={
              <Select
                value={status || "all"}
                onValueChange={(v) => setStatus(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue placeholder={t("common.allStatuses", "All statuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatuses", "All statuses")}</SelectItem>
                  {DISPATCH_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            columns={
              <ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />
            }
            density={<DensityMenu density={prefs.density} onChange={setDensity} />}
            action={
              roles.canWrite ? (
                <Button size="sm" className="h-8" onClick={() => nav({ to: "/dispatch/new" })}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />{" "}
                  {t("dispatch.actions.newDeliveryChallan", "New delivery challan")}
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
              icon={<Truck className="h-6 w-6" />}
              title={t("dispatch.empty.title", "No dispatches yet")}
              message={t(
                "dispatch.empty.message",
                "Create a dispatch to plan an outbound shipment.",
              )}
              action={
                roles.canWrite ? (
                  <Button onClick={() => nav({ to: "/dispatch/new" })}>
                    <Plus className="mr-2 h-4 w-4" />{" "}
                    {t("dispatch.actions.newDispatch", "New dispatch")}
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
                    {!isHidden("no") && (
                      <TableHead>
                        {t("dispatch.columns.dispatchNo", "Dispatch / Customer")}
                      </TableHead>
                    )}
                    {!isHidden("customer") && (
                      <TableHead>{t("common.customer", "Customer")}</TableHead>
                    )}
                    {!isHidden("so") && (
                      <TableHead>{t("dispatch.columns.so", "Sales Order")}</TableHead>
                    )}
                    {!isHidden("carrier") && (
                      <TableHead>{t("dispatch.columns.carrier", "Carrier")}</TableHead>
                    )}
                    {!isHidden("tracking") && (
                      <TableHead>{t("dispatch.columns.tracking", "Tracking")}</TableHead>
                    )}
                    {!isHidden("amount") && (
                      <TableHead className="text-right">
                        {t("common.amount", "Total Amount")}
                      </TableHead>
                    )}
                    {!isHidden("date") && <TableHead>{t("common.date", "Date")}</TableHead>}
                    {!isHidden("status") && <TableHead>{t("common.status", "Status")}</TableHead>}
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const matchedQuote = (quotesList.data ?? []).find(
                      (q) =>
                        (r.notes && r.notes.includes(q.quote_no)) ||
                        (r.customer_id && q.customer_id === r.customer_id),
                    );
                    const totalAmt =
                      (matchedQuote ? Number(matchedQuote.total) : 0) +
                      Number(r.carting_charge ?? 0);
                    return (
                      <TableRow key={r.id}>
                        {!isHidden("no") && (
                          <TableCell className="text-xs">
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-foreground text-xs truncate max-w-[160px] sm:max-w-none">
                                {r.customer?.name ?? "—"}
                              </span>
                              <Link
                                to="/dispatch/$id"
                                params={{ id: r.id }}
                                className="font-mono text-[11px] text-primary hover:underline truncate"
                              >
                                {r.dispatch_no}
                              </Link>
                            </div>
                          </TableCell>
                        )}
                        {!isHidden("customer") && (
                          <TableCell className="text-xs font-medium">
                            {r.customer?.name ?? "—"}
                          </TableCell>
                        )}
                        {!isHidden("so") && (
                          <TableCell className="font-mono text-xs">
                            {r.sales_order?.so_no ?? "—"}
                          </TableCell>
                        )}
                        {!isHidden("carrier") && <TableCell>{r.carrier ?? "—"}</TableCell>}
                        {!isHidden("tracking") && <TableCell>{r.tracking_no ?? "—"}</TableCell>}
                        {!isHidden("amount") && (
                          <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                            {totalAmt > 0 ? formatInr(totalAmt) : "—"}
                          </TableCell>
                        )}
                        {!isHidden("date") && <TableCell>{r.dispatch_date}</TableCell>}
                        {!isHidden("status") && (
                          <TableCell>
                            <StatusPill status={r.status} />
                          </TableCell>
                        )}
                        <TableCell>
                          <RowActions
                            onEdit={() => nav({ to: "/dispatch/$id/edit", params: { id: r.id } })}
                            onDelete={() => setToDelete(r)}
                            extra={
                              <DropdownMenuItem onSelect={() => setTrackingTarget(r)}>
                                <MessageSquare className="mr-2 h-4 w-4 text-emerald-600 fill-current" />
                                Send WhatsApp Tracking
                              </DropdownMenuItem>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          )}

          <ConfirmDialog
            open={!!toDelete}
            onOpenChange={(o) => !o && setToDelete(null)}
            title="Delete dispatch?"
            description={toDelete ? `${toDelete.dispatch_no} will be removed.` : ""}
            busy={del.isPending}
            tone="danger"
            onConfirm={() => toDelete && del.mutate(toDelete.id)}
          />
        </TabsContent>

        <TabsContent value="carting">
          <LocalCartingView />
        </TabsContent>
      </Tabs>

      {trackingTarget && (
        <OrderTrackingWhatsappDialog
          open={Boolean(trackingTarget)}
          onOpenChange={(o) => !o && setTrackingTarget(null)}
          orderNo={trackingTarget.sales_order?.so_no || trackingTarget.dispatch_no}
          customerName={trackingTarget.customer?.name}
          customerPhone={
            trackingTarget.customer?.primary_phone || trackingTarget.customer?.whatsapp
          }
          orderDate={trackingTarget.dispatch_date}
          deliveryDate={trackingTarget.sales_order?.delivery_date || trackingTarget.dispatch_date}
          status={trackingTarget.status}
          dispatches={[
            {
              dispatch_no: trackingTarget.dispatch_no,
              status: trackingTarget.status,
              dispatch_date: trackingTarget.dispatch_date,
              carrier: trackingTarget.carrier,
              vehicle_no: trackingTarget.vehicle_no,
            },
          ]}
        />
      )}
    </div>
  );
}
