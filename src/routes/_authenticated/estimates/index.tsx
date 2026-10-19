import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Sparkles, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      { key: "no", label: "Estimate / Customer", required: true },
      { key: "template", label: "Template" },
      { key: "customer", label: "Customer / Project" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total" },
    ],
    [],
  );

  const query = useQuery({ queryKey: qk.estimates.list(dq), queryFn: () => listEstimates(dq) });
  const rows = useMemo(() => query.data ?? [], [query.data]);
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
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Contract Templates
        </div>
        {ESTIMATE_TEMPLATE_LIST.map((t) => (
          <DropdownMenuItem key={t.key} asChild>
            <Link
              to="/estimates/new"
              search={{ template: t.key }}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted-foreground">{t.tagline}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Interactive Studios
        </div>
        <DropdownMenuItem asChild>
          <Link
            to="/quotes"
            search={{ new: "1", studio: "mural" }}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className="font-medium flex items-center gap-1.5 text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Stone Mural Studio
            </span>
            <span className="text-xs text-muted-foreground">
              Calculate mural slabs, CNC job work, and installation costing.
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/quotes"
            search={{ new: "1", studio: "cladding" }}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <span className="font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Wall Cladding Studio
            </span>
            <span className="text-xs text-muted-foreground">
              Wall coverage, stone panels, adhesive & sealer calculator.
            </span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeader
        title="Estimation Studio"
        subtitle="Stone-industry estimates: material, installation, stone murals, and turnkey manufacturing."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link to="/quotes" search={{ new: "1", studio: "mural" }}>
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Stone Mural Studio
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <Link to="/quotes" search={{ new: "1", studio: "cladding" }}>
                <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Wall Cladding Studio
              </Link>
            </Button>
          </div>
        }
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
                {!isHidden("no") && <TableHead>Estimate / Customer</TableHead>}
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
                    <TableCell className="text-xs">
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground text-xs truncate max-w-[160px] sm:max-w-none">
                          {r.customer?.name ?? "—"}
                        </span>
                        <Link
                          to="/estimates/$estimateId"
                          params={{ estimateId: r.id }}
                          className="font-mono text-[11px] text-primary hover:underline truncate"
                        >
                          {r.estimate_no}
                        </Link>
                      </div>
                    </TableCell>
                  )}
                  {!isHidden("template") && (
                    <TableCell className="text-sm">
                      {ESTIMATE_TEMPLATES[r.template].label}
                    </TableCell>
                  )}
                  {!isHidden("customer") && (
                    <TableCell className="text-sm">
                      <div>{r.customer?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.project?.name ?? "—"}</div>
                    </TableCell>
                  )}
                  {!isHidden("status") && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                  )}
                  {!isHidden("total") && (
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatInr(r.total)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
