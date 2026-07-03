/** Vendor "Today" — one screen answering "what do I need to do?" */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox, FilePlus2, CheckCircle2, ThumbsUp, Package, Truck, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/layout/States";
import { getVendorKpis } from "@/lib/vendor-portal/dashboard";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/dashboard")({
  component: VendorDashboard,
});

interface CardDef {
  label: string;
  value: number;
  to: "/vendor/rfqs" | "/vendor/orders";
  // TanStack search inference: allow either shape
  search?: { filter?: "new" | "draft" | "submitted" | "overdue" };
  icon: typeof Inbox;
  tone: "primary" | "warn" | "ok" | "info";
  helper: string;
}

function toneClasses(tone: CardDef["tone"]): string {
  switch (tone) {
    case "primary":
      return "border-primary/40 bg-primary/5";
    case "warn":
      return "border-warning/40 bg-warning/5";
    case "ok":
      return "border-success/40 bg-success/5";
    case "info":
    default:
      return "border-border bg-card";
  }
}

function VendorDashboard() {
  const q = useQuery({ queryKey: ["vendor", "kpis"], queryFn: getVendorKpis });
  if (q.isLoading) return <LoadingBlock />;
  if (q.error)
    return <ErrorBlock message={toUserMessage(q.error)} onRetry={() => q.refetch()} />;
  const k = q.data!;

  const cards: CardDef[] = [
    {
      label: "New RFQs",
      value: k.newRfqs,
      to: "/vendor/rfqs",
      search: { filter: "new" },
      icon: Inbox,
      tone: "primary",
      helper: "Waiting for you to open",
    },
    {
      label: "Awaiting submission",
      value: k.awaitingSubmission,
      to: "/vendor/rfqs",
      search: { filter: "draft" },
      icon: FilePlus2,
      tone: "warn",
      helper: "Send your quote",
    },
    {
      label: "Submitted quotes",
      value: k.submitted,
      to: "/vendor/rfqs",
      search: { filter: "submitted" },
      icon: CheckCircle2,
      tone: "info",
      helper: "Under review",
    },
    {
      label: "Approved quotes",
      value: k.approved,
      to: "/vendor/rfqs",
      search: { filter: "submitted" },
      icon: ThumbsUp,
      tone: "ok",
      helper: "Ready to fulfil",
    },
    {
      label: "Orders",
      value: k.orders,
      to: "/vendor/orders",
      icon: Package,
      tone: "info",
      helper: "Confirmed purchase orders",
    },
    {
      label: "Dispatch due",
      value: k.dispatchDue,
      to: "/vendor/orders",
      icon: Truck,
      tone: "warn",
      helper: "Delivery expected today or overdue",
    },
  ];

  return (
    <div>
      <PageHeader title="Today" subtitle="What needs your attention right now" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              search={c.search as never}
              className={cn(
                "group flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-2",
                toneClasses(c.tone),
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {c.label}
                </div>
                <div className="mt-1 font-display text-3xl font-bold text-foreground">
                  {c.value}
                </div>
                <div className="text-xs text-muted-foreground">{c.helper}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
