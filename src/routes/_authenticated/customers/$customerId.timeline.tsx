import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getCustomerTimeline, getCustomerHeader } from "@/lib/customer-timeline/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/States";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers/$customerId/timeline")({
  component: TimelinePage,
});

function TimelinePage() {
  const { customerId } = Route.useParams();
  const header = useQuery({
    queryKey: ["customer-header", customerId],
    queryFn: () => getCustomerHeader(customerId),
  });
  const q = useQuery({
    queryKey: ["customer-timeline", customerId],
    queryFn: () => getCustomerTimeline(customerId),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Link
        to="/customers/$customerId"
        params={{ customerId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to customer
      </Link>
      <PageHeader
        title={`${header.data?.name ?? "Customer"} — Timeline`}
        subtitle="Every interaction, document, and message in one feed."
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!q.isLoading && (q.data ?? []).length === 0 && <EmptyState title="No activity yet." />}
          <ol className="relative border-l border-border pl-6 space-y-4">
            {(q.data ?? []).map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] mt-1 h-3 w-3 rounded-full bg-primary" />
                <div className="flex flex-wrap items-baseline gap-2">
                  <Badge variant="outline">{e.kind}</Badge>
                  <span className="font-medium">
                    {e.href ? <Link to={e.href}>{e.title}</Link> : e.title}
                  </span>
                  {e.status && <Badge variant="secondary">{e.status}</Badge>}
                  {e.amount != null && (
                    <span className="text-sm text-muted-foreground">{formatInr(e.amount)}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {e.at ? new Date(e.at).toLocaleString("en-IN") : ""}
                  </span>
                </div>
                {e.subtitle && <p className="mt-1 text-sm text-muted-foreground">{e.subtitle}</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
