import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BusinessTimeline } from "@/components/timeline/BusinessTimeline";
import { getVendor } from "@/lib/vendors/api";
import { getVendorTimeline } from "@/lib/vendors/timeline";

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

      {/* Rendered by the shared BusinessTimeline component */}
      <BusinessTimeline
        events={timelineQ.data}
        isLoading={timelineQ.isLoading}
        error={timelineQ.error}
        onRetry={() => timelineQ.refetch()}
        emptyTitle="No activity yet"
        emptyMessage="Send an RFQ or create a purchase order for this vendor to start building history."
      />
    </div>
  );
}
