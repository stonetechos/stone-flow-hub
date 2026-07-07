import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/entity/StatusPill";
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
  const query = useQuery({
    queryKey: qk.installations.list(dq, status),
    queryFn: () => listInstallations(dq, status),
  });

  return (
    <div>
      <PageHeader
        title="Installations"
        subtitle="Site installations auto-generated from Supply + Installation sales orders."
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search installation, site…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INSTALLATION_ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Link to="/installation-teams"><Button variant="outline" size="sm">Teams</Button></Link>
          <Link to="/dashboards/installation"><Button variant="outline" size="sm">Dashboard</Button></Link>
          <Link to="/sales-orders/new"><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New from SO</Button></Link>
        </div>
      </div>
      {query.isLoading ? <SkeletonTable /> :
        query.error ? <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} /> :
        !query.data?.length ? <EmptyState icon={Wrench} title="No installations yet" description="Set a sales order supply scope to Supply + Installation to auto-create one." /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Installation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Sales order</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => nav({ to: "/installations/$id", params: { id: r.id } })}>
                <TableCell className="font-medium">{r.installation_no}</TableCell>
                <TableCell>{r.customer?.name ?? "—"}</TableCell>
                <TableCell>{r.project?.name ?? "—"}</TableCell>
                <TableCell>{r.sales_order?.so_no ?? "—"}</TableCell>
                <TableCell>{r.team?.name ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  {r.planned_start_date ?? "—"} → {r.planned_end_date ?? "—"}
                </TableCell>
                <TableCell>{Number(r.progress_pct).toFixed(0)}%</TableCell>
                <TableCell><StatusPill value={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
