import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { qk } from "@/lib/query-keys";
import { toUserMessage } from "@/lib/errors";
import { getCustomer } from "@/lib/customers/api";
import { CustomerLedgerPanel } from "@/components/customer-ledger/CustomerLedgerPanel";
import { openProjectCompletionWhatsapp } from "@/lib/projects/projectCompletionWhatsapp";

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
        actions={
          cust.data ? (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={() => {
                openProjectCompletionWhatsapp({
                  customerName: cust.data?.name || "Customer",
                  projectName: "Current Project & Ledger Balance",
                  customerPhone: cust.data?.primary_phone,
                  customerWhatsapp: cust.data?.whatsapp,
                });
              }}
            >
              <MessageCircle className="h-4 w-4" /> Notify Customer (WhatsApp)
            </Button>
          ) : undefined
        }
      />
      <CustomerLedgerPanel customerId={customerId} />
    </div>
  );
}
