/** Global RFQ browser — every RFQ across every enquiry, filterable + navigable. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { ColumnsMenu, type ColumnDef } from "@/components/data/ColumnsMenu";
import { DensityMenu } from "@/components/data/DensityMenu";
import { useTablePrefs } from "@/hooks/use-table-prefs";
import { toUserMessage } from "@/lib/errors";
import { listRfqs, type RfqStatus } from "@/lib/rfqs/api";

const STATUSES: RfqStatus[] = [
  "draft", "sent", "partially_received", "fully_received", "closed", "cancelled",
];

export const Route = createFileRoute("/_authenticated/rfqs/")({
  ssr: false,
  component: RfqsPage,
  validateSearch: (s: Record<string, unknown>): { status?: string; q?: string } => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
});

function RfqsPage() {
  const nav = useNavigate();
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const dq = useDebouncedValue(q, 250);
  const status = search.status ?? "";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { prefs, setDensity, toggleColumn, isHidden } = useTablePrefs("rfqs");

  const columnDefs: ColumnDef[] = useMemo(
    () => [
      { key: "no", label: "RFQ No.", required: true },
      { key: "enquiry", label: "Enquiry" },
      { key: "project", label: "Project" },
      { key: "status", label: "Status" },
      { key: "responses", label: "Responses" },
      { key: "due", label: "Due" },
    ],
    [],
  );

  const query = useQuery({ queryKey: ["rfqs", "list", dq, status], queryFn: () => listRfqs(dq, status) });
  useEffect(() => setPage(1), [dq, status]);

  function setStatus(v: string) {
    nav({ to: "/rfqs", search: { status: v || undefined, q: dq || undefined } });
  }
  function commitSearch(v: string) {
    setQ(v);
    nav({ to: "/rfqs", search: { status: status || undefined, q: v || undefined } });
  }

  const rows = query.data ?? [];
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <PageHeader title="RFQs" subtitle="Every request-for-quote sent to vendors, across all enquiries." />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={commitSearch}
        searchPlaceholder="Search RFQ no…"
        primaryFilter={
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        columns={<ColumnsMenu columns={columnDefs} isHidden={isHidden} onToggle={toggleColumn} />}
        density={<DensityMenu density={prefs.density} onChange={setDensity} />}
      />

      {query.isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Send className="h-6 w-6" />}
          title="No RFQs match"
          message="RFQs are created from an enquiry. Open an enquiry and click Send RFQ."
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
                {!isHidden("no") && <TableHead>RFQ No.</TableHead>}
                {!isHidden("enquiry") && <TableHead>Enquiry</TableHead>}
                {!isHidden("project") && <TableHead>Project</TableHead>}
                {!isHidden("status") && <TableHead>Status</TableHead>}
                {!isHidden("responses") && <TableHead>Responses</TableHead>}
                {!isHidden("due") && <TableHead>Due</TableHead>}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id}>
                  {!isHidden("no") && (
                    <TableCell className="font-mono text-xs">
                      <Link to="/rfqs/$rfqId" params={{ rfqId: r.id }} className="text-primary hover:underline">
                        {r.rfq_no}
                      </Link>
                    </TableCell>
                  )}
                  {!isHidden("enquiry") && (
                    <TableCell className="font-mono text-xs">
                      {r.enquiry ? (
                        <Link to="/enquiries/$enquiryId" params={{ enquiryId: r.enquiry.id }} className="text-primary hover:underline">
                          {r.enquiry.enquiry_no}
                        </Link>
                      ) : "—"}
                    </TableCell>
                  )}
                  {!isHidden("project") && <TableCell>{r.project?.name ?? "—"}</TableCell>}
                  {!isHidden("status") && (
                    <TableCell><Badge variant="outline" className="capitalize">{r.status.replace(/_/g, " ")}</Badge></TableCell>
                  )}
                  {!isHidden("responses") && <TableCell className="tabular-nums">{r.response_count} / {r.vendor_count}</TableCell>}
                  {!isHidden("due") && <TableCell>{r.due_date ?? "—"}</TableCell>}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => nav({ to: "/rfqs/$rfqId", params: { rfqId: r.id } })}
                      aria-label="Open RFQ"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </div>
  );
}
