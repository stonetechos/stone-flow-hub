import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users, Factory, HandCoins, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorBlock, SkeletonTable, EmptyState } from "@/components/layout/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataToolbar } from "@/components/data/DataToolbar";
import { DataTableShell } from "@/components/data/DataTableShell";
import { TablePagination } from "@/components/data/Pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { formatInr } from "@/lib/format";
import { listCustomers } from "@/lib/customers/api";
import { listCustomerLedgerSummaries } from "@/lib/customer-ledger/api";
import { listVendors } from "@/lib/vendors/api";
import { listVendorLedgerSummaries } from "@/lib/vendors/ledger";
import { listInstallationLedgerSummaries } from "@/lib/installation-ledger/api";

export const Route = createFileRoute("/_authenticated/ledger/")({
  ssr: false,
  component: UnifiedLedgersPage,
});

function UnifiedLedgersPage() {
  const [activeTab, setActiveTab] = useState<"sales" | "purchase" | "agency">("sales");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledgers"
        subtitle="Unified financial ledger statements and running balances across Customers, Vendors, and Agencies."
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "sales" | "purchase" | "agency")}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
          <TabsTrigger value="sales" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Sales Ledger (Customers)</span>
          </TabsTrigger>
          <TabsTrigger value="purchase" className="gap-2">
            <Factory className="h-4 w-4" />
            <span>Purchase Ledger (Vendors)</span>
          </TabsTrigger>
          <TabsTrigger value="agency" className="gap-2">
            <HandCoins className="h-4 w-4" />
            <span>Agency Ledger (Agencies)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesLedgerView />
        </TabsContent>

        <TabsContent value="purchase">
          <PurchaseLedgerView />
        </TabsContent>

        <TabsContent value="agency">
          <AgencyLedgerView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------------------------------------------------------------
// Sales Ledger View (Customers)
// ----------------------------------------------------------------------
function SalesLedgerView() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const customersQ = useQuery({
    queryKey: qk.customers.list(dq),
    queryFn: () => listCustomers(dq),
  });

  const summariesQ = useQuery({
    queryKey: ["customerLedger", "allSummaries"],
    queryFn: listCustomerLedgerSummaries,
    staleTime: 30_000,
  });

  const isLoading = customersQ.isLoading || summariesQ.isLoading;
  const error = customersQ.error ?? summariesQ.error;

  const rows = useMemo(() => {
    const summaries = summariesQ.data;
    if (!customersQ.data || !summaries) return [];
    return customersQ.data
      .map((c) => ({ customer: c, summary: summaries.get(c.id) }))
      .sort((a, b) => ((b.summary?.balance ?? 0) > (a.summary?.balance ?? 0) ? 1 : -1));
  }, [customersQ.data, summariesQ.data]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const totalInvoiced = rows.reduce((s, r) => s + (r.summary?.totalDebit ?? 0), 0);
  const totalReceived = rows.reduce((s, r) => s + (r.summary?.totalCredit ?? 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.summary?.balance ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Invoiced</div>
            <div className="text-xl font-bold">{formatInr(totalInvoiced)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Collected</div>
            <div className="text-xl font-bold text-emerald-600">{formatInr(totalReceived)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Net Receivables Due</div>
            <div className="text-xl font-bold text-amber-600">{formatInr(totalOutstanding)}</div>
          </CardContent>
        </Card>
      </div>

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search customer, phone, code…"
      />

      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : error ? (
        <ErrorBlock
          message={toUserMessage(error)}
          onRetry={() => {
            customersQ.refetch();
            summariesQ.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No customer transactions yet"
          message="Customer balances and ledger transactions will appear here once orders or receipts are recorded."
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ customer: c, summary }) => {
                const bal = summary?.balance ?? 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {c.customer_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.primary_phone || c.city || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatInr(summary?.totalDebit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">
                      {formatInr(summary?.totalCredit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      <span className={bal > 0 ? "text-amber-600" : ""}>{formatInr(bal)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" asChild>
                        <Link to="/ledger/$customerId" params={{ customerId: c.id }}>
                          <span>Statement</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DataTableShell>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Purchase Ledger View (Vendors)
// ----------------------------------------------------------------------
function PurchaseLedgerView() {
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
      .sort((a, b) => ((b.summary?.outstanding ?? 0) > (a.summary?.outstanding ?? 0) ? 1 : -1));
  }, [vendorsQ.data, summariesQ.data]);

  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const totalBilled = rows.reduce((s, r) => s + (r.summary?.totalDebit ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.summary?.totalCredit ?? 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + (r.summary?.outstanding ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Vendor Bills</div>
            <div className="text-xl font-bold">{formatInr(totalBilled)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Paid to Vendors</div>
            <div className="text-xl font-bold text-emerald-600">{formatInr(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Net Payables Due</div>
            <div className="text-xl font-bold text-amber-600">{formatInr(totalOutstanding)}</div>
          </CardContent>
        </Card>
      </div>

      <DataToolbar
        count={rows.length}
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search vendor, code, GST…"
      />

      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
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
          icon={<Factory className="h-6 w-6" />}
          title="No vendor transactions yet"
          message="Vendor ledger balances will appear here as purchase orders and payments are recorded."
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>GST / Code</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(({ vendor: v, summary }) => {
                const bal = summary?.outstanding ?? 0;
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{v.company_name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{v.city || "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.gst_number || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatInr(summary?.totalDebit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">
                      {formatInr(summary?.totalCredit ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      <span className={bal > 0 ? "text-amber-600" : ""}>{formatInr(bal)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" asChild>
                        <Link to="/vendors/$vendorId/ledger" params={{ vendorId: v.id }}>
                          <span>Statement</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DataTableShell>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Agency Ledger View (Agencies)
// ----------------------------------------------------------------------
function AgencyLedgerView() {
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 250);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const query = useQuery({
    queryKey: qk.installationLedger.summaries(),
    queryFn: listInstallationLedgerSummaries,
  });

  const rawRows = query.data;
  const filteredRows = useMemo(() => {
    const list = rawRows ?? [];
    if (!dq) return list;
    const term = dq.toLowerCase();
    return list.filter(
      (r) =>
        r.agency_name.toLowerCase().includes(term) || r.agency_code.toLowerCase().includes(term),
    );
  }, [rawRows, dq]);
  const allRows = query.data ?? [];

  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const totalCharged = allRows.reduce((s, r) => s + (r.total_debit ?? 0), 0);
  const totalPaid = allRows.reduce((s, r) => s + (r.total_credit ?? 0), 0);
  const totalBalance = allRows.reduce((s, r) => s + (r.balance ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Work Charged</div>
            <div className="text-xl font-bold">{formatInr(totalCharged)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Paid to Agencies</div>
            <div className="text-xl font-bold text-emerald-600">{formatInr(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Agency Balance Due</div>
            <div className="text-xl font-bold text-amber-600">{formatInr(totalBalance)}</div>
          </CardContent>
        </Card>
      </div>

      <DataToolbar
        count={filteredRows.length}
        search={q}
        onSearchChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        searchPlaceholder="Search agency, code…"
      />

      {query.isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : query.error ? (
        <ErrorBlock message={toUserMessage(query.error)} onRetry={() => query.refetch()} />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-6 w-6" />}
          title="No agency ledger entries"
          message="Installation and carting agency balances will appear here as jobs are completed and payments recorded."
        />
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.installation_agency_id}>
                  <TableCell className="font-medium text-foreground">{r.agency_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.agency_code}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatInr(r.total_debit)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {formatInr(r.total_credit)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    <span className={r.balance > 0 ? "text-amber-600" : ""}>
                      {formatInr(r.balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs" asChild>
                      <Link
                        to="/installation-ledger/$agencyId"
                        params={{ agencyId: r.installation_agency_id }}
                      >
                        <span>Statement</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={filteredRows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </DataTableShell>
      )}
    </div>
  );
}
