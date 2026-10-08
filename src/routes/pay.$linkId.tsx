import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPaymentLinkByToken } from "@/lib/payment-links/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/pay/$linkId")({
  component: PayPage,
});

function PayPage() {
  const { linkId } = Route.useParams();
  const q = useQuery({ queryKey: ["pay", linkId], queryFn: () => getPaymentLinkByToken(linkId) });

  return (
    <div className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>STOS · Secure Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.isLoading && <p>Loading…</p>}
          {q.data == null && !q.isLoading && <p>This payment link is invalid or has expired.</p>}
          {q.data && (
            <>
              <div className="text-3xl font-semibold">{formatInr(Number(q.data.amount ?? 0))}</div>
              <p className="text-sm text-muted-foreground">
                Reference: {q.data.link_no ?? q.data.id}
              </p>
              <div className="rounded-md border p-4 text-sm space-y-1">
                <div className="font-medium">Bank transfer details</div>
                <div>Beneficiary: STOS</div>
                <div>Please email/whatsapp UTR after transfer to confirm.</div>
              </div>
              <p className="text-xs text-muted-foreground">Status: {q.data.status}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
