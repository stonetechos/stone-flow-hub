/**
 * Purchase Ledger — vendor-side counterpart to the Sales Ledger (`/receipts`).
 *
 * Sales Ledger lists individual receipt transactions across customers; the
 * vendor-side equivalent transaction list (vendor payments) is its own,
 * separately-scoped Purchase Payments page (not built yet — see the plan
 * doc). This page instead lists every vendor with at least one ledger entry
 * and their running outstanding balance, which is what "a ledger" means at
 * the top level: one row per account, not one row per transaction. Each row
 * deep-links into that vendor's full chronological ledger at
 * `/vendors/$vendorId/ledger` (built earlier, unchanged here).
 *
 * See engineering/purchase-module-and-sidebar-restructure-plan-2026-09-04.md
 * §2–3 for the Sales Ledger / Purchase Ledger naming and scope.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { listVendors } from "@/lib/vendors/api";
import { listVendorLedgerSummaries } from "@/lib/vendors/ledger";
import { formatInr, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchase-ledger/")({
  ssr: false,
  component: PurchaseLedgerIndexPage,
});

function PurchaseLedgerIndexPage() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const vendorsQ = useQuery({
    queryKey: qk.vendors.list(dq),
    queryFn: () => listVendors(dq),
  });
  const summariesQ = useQuery({
    queryKey: qk.vendorLedger.allSummaries,
    queryFn: listVendorLedgerSummaries,
    staleTime: 30_000,
  });

  const isLoading = vendorsQ.isLoading || summariesQ.isLoading;
  const error = vendorsQ.error ?? summariesQ.error;

  const rows = useMemo(() => {
    const summaries = summariesQ.data;
    if (!vendorsQ.data || !summaries) return [];
    return vendorsQ.data
      .map((v) => ({ vendor: v, summary: summaries.get(v.id) }))
      .filter((r) => r.summary) // only vendors with at least one ledger entry
      .sort((a, b) => (b.summary!.outstanding ?? 0) - (a.summary!.outstanding ?? 0));
  }, [vendorsQ.data, summariesQ.data]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalOutstanding = rows.reduce((s, r) => s + (r.summary?.outstanding ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Purchase Ledger"
        subtitle="Running balance per vendor — purchase orders, material received, payments and debit/credit notes."
      />

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search vendor, code, GST…"
        extra={
          <span className="hidden text-xs text-muted-foreground md:inline">
            Total outstanding {formatInr(totalOutstanding)}
          </span>
        }
      />

      {isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : error ? (
        <ErrorBlock
          message={toUserMessage(error)}
          onRetry={() => {
            vendorsQ.refetch();
            summariesQ.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No ledger activity yet"
          message="Purchase orders, material received (GRN), vendor payments and debit/credit notes will populate vendor ledgers as they're posted."
        />
      ) : (
        <DataTableShell
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
                <TableHead>Vendor</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Total Debit</TableHead>
                <TableHead className="text-right">Total Credit</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ vendor, summary }) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <Link
                      to="/vendors/$vendorId/ledger"
                      params={{ vendorId: vendor.id }}
                      className="font-medium hover:underline"
                    >
                      {vendor.company_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {summary!.lastEntryAt ? formatDate(summary!.lastEntryAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(summary!.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInr(summary!.totalCredit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    <Badge
                      variant={summary!.outstanding > 0 ? "default" : "secondary"}
                      className="tabular-nums"
                    >
                      {formatInr(summary!.outstanding)}
                    </Badge>
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
