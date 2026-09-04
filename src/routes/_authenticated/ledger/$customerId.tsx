import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getCustomer } from "@/lib/customers/api";
import { CustomerLedgerPanel } from "@/components/customer-ledger/CustomerLedgerPanel";

export const Route = createFileRoute("/_authenticated/ledger/$customerId")({
  ssr: false,
  component: LedgerPage,
});

function LedgerPage() {
  const { customerId } = Route.useParams();
  const cust = useQuery({
    queryKey: qk.customers.byId(customerId),
    queryFn: () => getCustomer(customerId),
  });

  if (cust.isLoading) return <LoadingBlock />;
  if (cust.error) return <ErrorBlock message={toUserMessage(cust.error)} />;

  return (
    <div>
      <PageHeader
        title={`Ledger — ${cust.data?.name ?? "Customer"}`}
        subtitle="Every invoice, receipt, credit/debit note and refund with a running balance."
      />
      <CustomerLedgerPanel customerId={customerId} />
    </div>
  );
}
