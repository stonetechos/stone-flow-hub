import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
  const query = useQuery({
    queryKey: qk.estimates.list(dq),
    queryFn: () => listEstimates(dq),
  });
  const rows = query.data ?? [];
  const totals = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.total ?? 0), 0),
    [rows],
  );

  return (
    <div>
      <PageHeader
        title="Estimation Studio"
        subtitle="Stone-industry estimates: material, installation, custom articles, and turnkey manufacturing."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New estimate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
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
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search estimate #, notes…"
          className="max-w-sm"
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {rows.length} shown • Pipeline value {formatInr(totals)}
        </span>
      </div>

      {query.isLoading ? (
        <SkeletonTable />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No estimates yet"
          description="Create your first stone estimate — pick a template above."
        />
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estimate #</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Customer / Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      to="/estimates/$estimateId"
                      params={{ estimateId: r.id }}
                      className="font-medium hover:underline"
                    >
                      {r.estimate_no}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {ESTIMATE_TEMPLATES[r.template].label}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{r.customer?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.project?.name ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatInr(r.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
