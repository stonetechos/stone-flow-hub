import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Truck,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  Layers,
  FileText,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useListPageState } from "@/hooks/use-list-page-state";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import {
  deletePurchaseTransportation,
  listPurchaseTransportation,
  type PurchaseTransportListItem,
} from "@/lib/purchase-transportation/api";
import { PURCHASE_TRANSPORT_STATUSES } from "@/lib/purchase-transportation/schema";
import { invalidatePurchaseTransport } from "@/lib/query-invalidation";
import { formatInr, formatDate } from "@/lib/format";
import { useRoles } from "@/hooks/use-roles";
import {
  listTransportPartners,
  deleteAssociatedPartner,
  type AssociatedPerson,
} from "@/lib/partners/directory";
import { PartnerEditDialog } from "@/components/partners/PartnerEditDialog";

export const Route = createFileRoute("/_authenticated/purchase-transport/")({
  ssr: false,
  component: PurchaseTransportPage,
  validateSearch: (
    s: Record<string, unknown>,
  ): { status?: string; q?: string; tab?: "partners" | "shipments" } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    tab: s.tab === "shipments" ? "shipments" : "partners",
  }),
});

function PurchaseTransportPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const currentTab = search.tab ?? "partners";

  const setTab = (tab: "partners" | "shipments") => {
    nav({
      to: "/purchase-transport",
      search: (prev) => ({ ...prev, tab }),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transport Partners & Cartings"
        subtitle="Carting agencies, truck freight providers, vehicle fleets, and inward shipment logistics."
      />

      {/* Top Segmented Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("partners")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
            currentTab === "partners"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Truck className="h-3.5 w-3.5" /> Transport Partners & Fleet Directory
        </button>

        <button
          type="button"
          onClick={() => setTab("shipments")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
            currentTab === "shipments"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Inward Shipments & Freight Log
        </button>
      </div>

      {currentTab === "partners" ? (
        <TransportPartnersDirectoryView />
      ) : (
        <PurchaseTransportView showHeader={false} />
      )}
    </div>
  );
}

/**
 * Transport Partners Directory View:
 * Lists all registered carting agencies and transport vendor partners with full customer-style editability.
 */
function TransportPartnersDirectoryView() {
  const qc = useQueryClient();
  const list = useListPageState("transport-partners");
  const dq = list.debouncedQuery;

  const [editing, setEditing] = useState<AssociatedPerson | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AssociatedPerson | null>(null);
  const { prefs, setDensity, toggleColumn, isHidden } = list;

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Transporter / Firm Name", required: true },
      { key: "contact", label: "Transporter / Driver" },
      { key: "phone", label: "Mobile / WhatsApp" },
      { key: "city", label: "Operational Hub / Base" },
      { key: "type", label: "Partner Category" },
      { key: "vehicle", label: "Vehicles & Fleet" },
      { key: "vehicleNo", label: "Vehicle Reg No." },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: ["transport-partners", dq],
    queryFn: () => listTransportPartners(dq),
  });

  const del = useMutation({
    mutationFn: (person: AssociatedPerson) => deleteAssociatedPartner(person),
    onSuccess: () => {
      toast.success("Transport partner removed");
      qc.invalidateQueries({ queryKey: ["transport-partners"] });
      qc.invalidateQueries({ queryKey: ["work-and-supply-directory"] });
      qc.invalidateQueries({ queryKey: qk.cartingAgencies.list() });
      qc.invalidateQueries({ queryKey: qk.vendors.all });
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = list.paginate(rows);

  return (
    <div className="space-y-4">
      <DataToolbar
        count={rows.length}
        search={list.query}
        onSearchChange={list.setQuery}
        searchPlaceholder="Search transporter, driver, phone, vehicle, or city…"
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Transport Partner
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : !rows.length ? (
        <EmptyState
          icon={<Truck className="h-7 w-7 text-muted-foreground" />}
          title="No transport partners found"
          message={
            list.query
              ? `No transport partners matching "${list.query}".`
              : "Register your carting agencies, truck transporters, and pickup delivery partners."
          }
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditDialogOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Add Transport Partner
            </Button>
          }
        />
      ) : (
        <DataTableShell
          density={prefs.density}
          footer={<TablePagination {...list.paginationProps(rows.length)} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("code") && <TableHead className="w-24">Code</TableHead>}
                {!isHidden("name") && <TableHead>Transporter / Firm Name</TableHead>}
                {!isHidden("contact") && <TableHead>Transporter / Driver</TableHead>}
                {!isHidden("phone") && <TableHead>Contact Number</TableHead>}
                {!isHidden("city") && <TableHead>Hub / Base</TableHead>}
                {!isHidden("type") && <TableHead>Type</TableHead>}
                {!isHidden("vehicle") && <TableHead>Vehicles & Fleet</TableHead>}
                {!isHidden("vehicleNo") && <TableHead>Vehicle Reg No.</TableHead>}
                {!isHidden("status") && <TableHead className="w-20">Status</TableHead>}
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((p) => {
                const phoneDigits = p.phone ? p.phone.replace(/\D/g, "") : "";
                const cleanPhone = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";

                return (
                  <TableRow key={`${p.sourceType}-${p.id}`}>
                    {!isHidden("code") && (
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.code}
                      </TableCell>
                    )}

                    {!isHidden("name") && (
                      <TableCell>
                        <div className="font-medium text-foreground">{p.name}</div>
                        {p.notes && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {p.notes}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {!isHidden("contact") && (
                      <TableCell>
                        <span className="text-sm font-medium">{p.contactPerson || "—"}</span>
                      </TableCell>
                    )}

                    {!isHidden("phone") && (
                      <TableCell>
                        {cleanPhone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{cleanPhone}</span>
                            <a
                              href={`tel:+91${cleanPhone}`}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                              title="Call"
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(
                                p.contactPerson || p.name,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 transition-colors p-1"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No phone</span>
                        )}
                      </TableCell>
                    )}

                    {!isHidden("city") && (
                      <TableCell className="text-xs text-muted-foreground">{p.city}</TableCell>
                    )}

                    {!isHidden("type") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.sourceType === "carting_agency"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-purple-50 text-purple-800 border-purple-200"
                          }
                        >
                          {p.sourceType === "carting_agency"
                            ? "Carting Agency"
                            : "Logistics Vendor"}
                        </Badge>
                      </TableCell>
                    )}

                    {!isHidden("vehicle") && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {p.skills.map((sk) => (
                            <span
                              key={sk}
                              className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    )}

                    {!isHidden("vehicleNo") && (
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.vehicleNo || "—"}
                      </TableCell>
                    )}

                    {!isHidden("status") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className="text-right">
                      <RowActions
                        onEdit={() => {
                          setEditing(p);
                          setEditDialogOpen(true);
                        }}
                        onDelete={() => setToDelete(p)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      {/* Customer-Style Edit & Create Dialog */}
      <PartnerEditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        partnerType="transport_partner"
      />

      {/* Delete / Remove Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Remove Transport Partner "${toDelete?.name ?? ""}"?`}
        description="Are you sure you want to remove this partner from transport records?"
        onConfirm={() => toDelete && del.mutate(toDelete)}
        confirmLabel="Remove Partner"
      />
    </div>
  );
}

/**
 * Purchase Transportation View (Inward Shipments Log)
 */
export function PurchaseTransportView({ showHeader = false }: { showHeader?: boolean } = {}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const roles = useRoles();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [toDelete, setToDelete] = useState<PurchaseTransportListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("purchase-transport");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "No.", required: true },
      { key: "po", label: "Purchase order" },
      { key: "vendor", label: "Vendor" },
      { key: "agency", label: "Carting agency" },
      { key: "date", label: "Transport date" },
      { key: "freight", label: "Freight" },
      { key: "balance", label: "Balance due" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.purchaseTransport.list(dq, status),
    queryFn: () => listPurchaseTransportation(dq, status),
  });
  useEffect(() => setPage(1), [dq, status]);

  const del = useMutation({
    mutationFn: (id: string) => deletePurchaseTransportation(id),
    onSuccess: (_void, id) => {
      toast.success("Purchase transportation entry deleted");
      invalidatePurchaseTransport(qc, id, toDelete?.vendor_id ?? undefined);
      setToDelete(null);
    },
    onError: (e) => toast.error(toUserMessage(e)),
  });

  const rows = query.data ?? [];
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return (
    <div>
      {showHeader && (
        <PageHeader
          title="Transport Partners & Cartings"
          subtitle="Logistics charges, carting agencies and freight tracking on purchase orders."
        />
      )}

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search transport no., PO, vendor, agency…"
        filters={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {PURCHASE_TRANSPORT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ").toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={
          roles.canWrite ? (
            <Button size="sm" onClick={() => nav({ to: "/purchase-transport/new" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Log shipment
            </Button>
          ) : null
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title="No inbound shipments logged yet"
          message="Log a shipment to track carting agency, driver, freight and amount paid against a purchase order."
          action={
            roles.canWrite ? (
              <Button onClick={() => nav({ to: "/purchase-transport/new" })}>
                <Plus className="mr-2 h-4 w-4" /> Log shipment
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
                {!isHidden("no") && <TableHead>No.</TableHead>}
                {!isHidden("po") && <TableHead>Purchase order</TableHead>}
                {!isHidden("vendor") && <TableHead>Vendor</TableHead>}
                {!isHidden("agency") && <TableHead>Carting agency</TableHead>}
                {!isHidden("date") && <TableHead>Transport date</TableHead>}
                {!isHidden("freight") && <TableHead className="text-right">Freight</TableHead>}
                {!isHidden("balance") && <TableHead className="text-right">Balance due</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/purchase-transport/$id"
                        params={{ id: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.transport_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("po") && (
                    <TableCell className="text-sm">
                      {r.purchase_order ? (
                        <Link
                          to="/purchase-orders/$id"
                          params={{ id: r.purchase_order.id }}
                          className="hover:underline"
                        >
                          {r.purchase_order.po_no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  {!isHidden("vendor") && <TableCell>{r.vendor?.company_name ?? "—"}</TableCell>}
                  {!isHidden("agency") && <TableCell>{r.carting_agency?.name ?? "—"}</TableCell>}
                  {!isHidden("date") && (
                    <TableCell className="text-sm">{formatDate(r.transport_date)}</TableCell>
                  )}
                  {!isHidden("freight") && (
                    <TableCell className="text-right tabular-nums">
                      {formatInr(r.freight_amount)}
                    </TableCell>
                  )}
                  {!isHidden("balance") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.balance_due)}
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell>
                      <StatusPill status={r.status} />
                    </TableCell>
                  )}
                  <TableCell>
                    <RowActions
                      onEdit={() =>
                        nav({ to: "/purchase-transport/$id/edit", params: { id: r.id } })
                      }
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
        title="Delete this shipment entry?"
        description={toDelete ? `${toDelete.transport_no} will be removed.` : ""}
        busy={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </div>
  );
}
