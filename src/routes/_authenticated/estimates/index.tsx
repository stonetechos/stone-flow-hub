import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listEstimates } from "@/lib/estimates/api";
import { formatInr } from "@/lib/format";
import { ESTIMATE_TEMPLATE_LIST, ESTIMATE_TEMPLATES } from "@/lib/estimates/templates";

export const Route = createFileRoute("/_authenticated/estimates/")({
  ssr: false,
  component: EstimatesListPage,
});

function EstimatesListPage() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("estimates");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "Estimate #", required: true },
      { key: "template", label: "Template" },
      { key: "customer", label: "Customer / Project" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.estimates.list(dq), queryFn: () => listEstimates(dq) });
  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [dq]);
  const totals = useMemo(() => rows.reduce((sum, r) => sum + Number(r.total ?? 0), 0), [rows]);

  const newButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New estimate
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {ESTIMATE_TEMPLATE_LIST.map((t) => (
          <DropdownMenuItem key={t.key} asChild>
            <Link to="/estimates/new" search={{ template: t.key }} className="flex flex-col items-start gap-0.5">
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.tagline}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeader
        title="Estimation Studio"
        subtitle="Stone-industry estimates: material, installation, custom articles, and turnkey manufacturing."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search estimate #, notes…"
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            Pipeline value {formatInr(totals)}
          </span>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
        action={newButton}
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No estimates yet"
          message="Create your first stone estimate — pick a template above."
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
                {!isHidden("no") && <TableHead>Estimate #</TableHead>}
                {!isHidden("template") && <TableHead>Template</TableHead>}
                {!isHidden("customer") && <TableHead>Customer / Project</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("total") && <TableHead className="text-right">Total</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell>
                      <Link to="/estimates/$estimateId" params={{ estimateId: r.id }} className="font-medium hover:underline">
                        {r.estimate_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("template") && <TableCell className="text-sm">{ESTIMATE_TEMPLATES[r.template].label}</TableCell>}
                  {!isHidden("customer") && (
                    <TableCell className="text-sm">
                      <div>{r.customer?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.project?.name ?? "—"}</div>
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell><Badge variant="outline" className="capitalize">{r.status}</Badge></TableCell>
                  )}
                  {!isHidden("total") && <TableCell className="text-right font-medium tabular-nums">{formatInr(r.total)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
