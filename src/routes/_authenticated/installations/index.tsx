import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/entity/StatusPill";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listInstallations, INSTALLATION_ORDER_STATUSES } from "@/lib/installation/orders";

export const Route = createFileRoute("/_authenticated/installations/")({
  ssr: false,
  component: InstallationsPage,
});

function InstallationsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("installations");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Installation", required: true },
      { key: "customer", label: "Customer" },
      { key: "project", label: "Project" },
      { key: "so", label: "Sales order" },
      { key: "team", label: "Team" },
      { key: "planned", label: "Planned" },
      { key: "progress", label: "Progress" },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const query = useQuery({
    queryKey: qk.installations.list(dq, status),
    queryFn: () => listInstallations(dq, status),
  });
  useEffect(() => setPage(1), [dq, status]);
  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader
        title="Installations"
        subtitle="Site installations auto-generated from Supply + Installation sales orders."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search installation, site…"
        primaryFilter={
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {INSTALLATION_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        extra={
          <>
            <Link to="/installation-teams"><Button variant="outline" size="sm" className="h-8">Teams</Button></Link>
            <Link to="/dashboards/installation"><Button variant="outline" size="sm" className="h-8">Dashboard</Button></Link>
          </>
        }
        action={
          <Link to="/sales-orders/new">
            <Button size="sm" className="h-8"><Plus className="mr-1.5 h-3.5 w-3.5" /> New from SO</Button>
          </Link>
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : !rows.length ? (
        <EmptyState
          icon={<Wrench className="h-6 w-6" />}
          title="No installations yet"
          message="Set a sales order supply scope to Supply + Installation to auto-create one."
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
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {!isHidden("no") && <TableHead>Installation</TableHead>}
                {!isHidden("customer") && <TableHead>Customer</TableHead>}
                {!isHidden("project") && <TableHead>Project</TableHead>}
                {!isHidden("so") && <TableHead>Sales order</TableHead>}
                {!isHidden("team") && <TableHead>Team</TableHead>}
                {!isHidden("planned") && <TableHead>Planned</TableHead>}
                {!isHidden("progress") && <TableHead>Progress</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => nav({ to: "/installations/$id", params: { id: r.id } })}>
                  {!isHidden("no") && <TableCell className="font-medium">{r.installation_no}</TableCell>}
                  {!isHidden("customer") && <TableCell>{r.customer?.name ?? "—"}</TableCell>}
                  {!isHidden("project") && <TableCell>{r.project?.name ?? "—"}</TableCell>}
                  {!isHidden("so") && <TableCell>{r.sales_order?.so_no ?? "—"}</TableCell>}
                  {!isHidden("team") && <TableCell>{r.team?.name ?? "—"}</TableCell>}
                  {!isHidden("planned") && (
                    <TableCell className="text-xs">{r.planned_start_date ?? "—"} → {r.planned_end_date ?? "—"}</TableCell>
                  )}
                  {!isHidden("progress") && <TableCell className="tabular-nums">{Number(r.progress_pct).toFixed(0)}%</TableCell>}
                  {!isHidden("status") && <TableCell><StatusPill status={r.status} /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
