/** Lead Analytics Hub — source, lost reasons, product/vendor/city/architect etc. */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { toUserMessage } from "@/lib/errors";
import { BarCard, DonutCard } from "@/components/dashboard/ChartCards";
import {
  getLeadSourceBreakdown,
  getLostReasonBreakdown,
  getRevenueByCity,
  getRevenueByArchitect,
  getRevenueByContractor,
  getInteriorDesignerBreakdown,
  getTopProducts,
  getRevenueByProductCategory,
  getRevenueByVendor,
} from "@/lib/lead-analytics/api";

export const Route = createFileRoute("/_authenticated/dashboards/lead-analytics")({
  ssr: false,
  component: LeadAnalyticsHub,
});

function LeadAnalyticsHub() {
  const source = useQuery({
    queryKey: ["la", "source"],
    queryFn: getLeadSourceBreakdown,
    staleTime: 60_000,
  });
  const lost = useQuery({
    queryKey: ["la", "lost"],
    queryFn: getLostReasonBreakdown,
    staleTime: 60_000,
  });
  const city = useQuery({ queryKey: ["la", "city"], queryFn: getRevenueByCity, staleTime: 60_000 });
  const architect = useQuery({
    queryKey: ["la", "architect"],
    queryFn: getRevenueByArchitect,
    staleTime: 60_000,
  });
  const contractor = useQuery({
    queryKey: ["la", "contractor"],
    queryFn: getRevenueByContractor,
    staleTime: 60_000,
  });
  const designer = useQuery({
    queryKey: ["la", "designer"],
    queryFn: getInteriorDesignerBreakdown,
    staleTime: 60_000,
  });
  const products = useQuery({
    queryKey: ["la", "products"],
    queryFn: getTopProducts,
    staleTime: 60_000,
  });
  const category = useQuery({
    queryKey: ["la", "category"],
    queryFn: getRevenueByProductCategory,
    staleTime: 60_000,
  });
  const vendors = useQuery({
    queryKey: ["la", "vendors"],
    queryFn: getRevenueByVendor,
    staleTime: 60_000,
  });

  const anyLoading = [
    source,
    lost,
    city,
    architect,
    contractor,
    designer,
    products,
    category,
    vendors,
  ].some((q) => q.isLoading || !q.data);
  const firstError = [
    source,
    lost,
    city,
    architect,
    contractor,
    designer,
    products,
    category,
    vendors,
  ].find((q) => q.error);
  if (anyLoading)
    return (
      <>
        <PageHeader title="Lead Analytics" />
        <LoadingBlock />
      </>
    );
  if (firstError)
    return (
      <>
        <PageHeader title="Lead Analytics" />
        <ErrorBlock message={toUserMessage(firstError.error)} />
      </>
    );

  const toDonut = (rows: Array<{ label: string; count: number }>) =>
    rows.slice(0, 8).map((r) => ({ label: r.label, value: r.count }));
  const toBar = (rows: Array<{ label: string; revenueInr: number }>) =>
    rows.slice(0, 10).map((r) => ({ label: r.label, value: r.revenueInr }));

  return (
    <div>
      <PageHeader
        title="Lead Analytics"
        subtitle="Source, lost reasons, geography, partners, products — every angle."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <DonutCard
          title="Lead source analysis"
          data={toDonut(source.data!)}
          valueLabel="Leads"
          formatValue={(v) => String(v)}
        />
        <DonutCard
          title="Lost reasons"
          data={toDonut(lost.data!)}
          valueLabel="Leads"
          formatValue={(v) => String(v)}
        />
        <BarCard title="Revenue by city" data={toBar(city.data!)} />
        <BarCard title="Revenue by architect" data={toBar(architect.data!)} />
        <BarCard title="Revenue by contractor" data={toBar(contractor.data!)} />
        <BarCard title="Revenue by interior designer" data={toBar(designer.data!)} />
        <BarCard title="Most-sold products (top 10)" data={toBar(products.data!)} />
        <BarCard title="Revenue by product category" data={toBar(category.data!)} />
        <BarCard title="Vendor spend" data={toBar(vendors.data!)} />
      </div>
    </div>
  );
}
