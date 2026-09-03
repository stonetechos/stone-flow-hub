/** Vendor profile summary (read-only in this milestone). */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVendorContext } from "@/lib/vendor-portal/session";
import { toUserMessage } from "@/lib/errors";

export const Route = createFileRoute("/vendor/profile")({
  component: VendorProfile,
});

function VendorProfile() {
  const q = useQuery({ queryKey: ["vendor", "context"], queryFn: getVendorContext });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error) return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data) return null;
  const { vendor } = q.data;
  const rows: [string, string | null][] = [
    ["Company", vendor.company_name],
    ["Vendor code", vendor.vendor_code],
    ["City", vendor.city],
    ["State", vendor.state],
    ["GST", vendor.gst_number],
    ["Payment terms", vendor.payment_terms],
  ];
  return (
    <div>
      <PageHeader title="Company profile" subtitle="Contact STOS to update these details" />
      <Card className="max-w-2xl shadow-1">
        <CardHeader>
          <CardTitle className="text-sm">{vendor.company_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="text-sm">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
