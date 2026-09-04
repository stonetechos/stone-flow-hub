import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { listInstallationLedgerSummaries } from "@/lib/installation-ledger/api";

/**
 * Installation Agency Ledger — index (Task #48). Manual entries only
 * (Rishi's explicit decision, via AskUserQuestion) — nothing here posts
 * automatically from Approved Quotations (Task #49) or anywhere else.
 * Mirrors purchase-ledger/index.tsx's shape: one row per agency with a
 * running balance, linking through to the full entry list.
 */
export const Route = createFileRoute("/_authenticated/installation-ledger/")({
  ssr: false,
  component: InstallationLedgerIndex,
});

function InstallationLedgerIndex() {
  const query = useQuery({
    queryKey: qk.installationLedger.summaries(),
    queryFn: listInstallationLedgerSummaries,
  });

  const rows = query.data ?? [];

  return (
    <div>
      <PageHeader
        title="Installation Agency Ledger"
        subtitle="Manual charge/payment entries for installation agencies — recorded by hand, same as vendor payments."
      />

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={4} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No installation agencies yet"
          message="Add an installation agency under Masters, then record entries against it here."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Total charged</TableHead>
                <TableHead>Total paid</TableHead>
                <TableHead>Balance due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.installation_agency_id}>
                  <TableCell>
                    <Link
                      to="/installation-ledger/$agencyId"
                      params={{ agencyId: r.installation_agency_id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.agency_name}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {r.agency_code}
                    </span>
                  </TableCell>
                  <TableCell>{formatInr(r.total_debit)}</TableCell>
                  <TableCell>{formatInr(r.total_credit)}</TableCell>
                  <TableCell className="font-semibold">{formatInr(r.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
