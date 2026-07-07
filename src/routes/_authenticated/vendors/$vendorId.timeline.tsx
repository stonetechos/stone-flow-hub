import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  FileText,
  History,
  Send,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorBlock, SkeletonTable } from "@/components/layout/States";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toUserMessage } from "@/lib/errors";
import { getVendor } from "@/lib/vendors/api";
import { getVendorTimeline, type TimelineEvent } from "@/lib/vendors/timeline";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendors/$vendorId/timeline")({
  ssr: false,
  component: VendorTimelinePage,
});

function VendorTimelinePage() {
  const { vendorId } = Route.useParams();
  const vendorQ = useQuery({
    queryKey: ["vendor", vendorId, "row"],
    queryFn: () => getVendor(vendorId),
  });
  const timelineQ = useQuery({
    queryKey: ["vendor", vendorId, "timeline"],
    queryFn: () => getVendorTimeline(vendorId),
    staleTime: 30_000,
  });

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to vendor
        </Link>
      </div>
      <PageHeader
        title={vendorQ.data ? `${vendorQ.data.company_name} · Timeline` : "Vendor Timeline"}
        subtitle="RFQs, quotes, purchase orders and ledger events for this vendor, newest first."
      />

      {timelineQ.isLoading ? (
        <SkeletonTable rows={6} columns={2} />
      ) : timelineQ.error ? (
        <ErrorBlock message={toUserMessage(timelineQ.error)} onRetry={() => timelineQ.refetch()} />
      ) : (timelineQ.data ?? []).length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="No activity yet"
          message="Send an RFQ or create a purchase order for this vendor to start building history."
        />
      ) : (
        <ol className="relative ml-3 space-y-4 border-l border-border pl-6">
          {timelineQ.data!.map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </ol>
      )}
    </div>
  );
}

function EventCard({ ev }: { ev: TimelineEvent }) {
  const icon = kindIcon(ev.kind);
  const at = new Date(ev.at);
  return (
    <li className="relative">
      <span className="absolute -left-[34px] mt-1 grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-muted-foreground">
        {icon}
      </span>
      <Card className="shadow-1">
        <CardContent className="flex flex-col gap-1 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {ev.route ? (
                <Link to={ev.route} className="hover:underline">
                  {ev.title}
                </Link>
              ) : (
                ev.title
              )}
            </span>
            {ev.status && <Badge variant="outline">{ev.status}</Badge>}
            {ev.amount != null && ev.amount !== 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {formatMoney(ev.amount, "INR")}
              </Badge>
            )}
          </div>
          {ev.detail && (
            <p className="text-sm text-muted-foreground">{ev.detail}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {at.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </li>
  );
}

function kindIcon(kind: TimelineEvent["kind"]) {
  switch (kind) {
    case "rfq_sent":       return <Send className="h-3 w-3" />;
    case "vendor_quote":   return <FileText className="h-3 w-3" />;
    case "purchase_order": return <ShoppingCart className="h-3 w-3" />;
    case "ledger":         return <Wallet className="h-3 w-3" />;
    case "activity":
    default:               return <Activity className="h-3 w-3" />;
  }
}
