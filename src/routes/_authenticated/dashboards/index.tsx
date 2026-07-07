import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ShoppingCart,
  Factory,
  Briefcase,
  Truck,
  CalendarClock,
  Sparkles,
  CircleDollarSign,
  Wrench,
  Crown,
  LineChart as LineChartIcon,
  Wallet,
  Users,
  AlertTriangle,
  Gauge,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboards/")({
  ssr: false,
  component: DashboardsIndex,
});

const ROLES = [
  {
    to: "/dashboards/executive",
    title: "Executive",
    desc: "Owner KPI cockpit — pipeline, cash, ops, deep-links to every module.",
    icon: Crown,
  },
  {
    to: "/dashboards/control-centre",
    title: "Control Centre",
    desc: "One-screen: sales, finance, procurement, production, installation, alerts.",
    icon: Gauge,
  },
  {
    to: "/dashboards/analytics",
    title: "Business Analytics",
    desc: "Interactive charts — trends, aging, revenue mix, custom date range.",
    icon: LineChartIcon,
  },
  {
    to: "/dashboards/business-intelligence",
    title: "AI Business Intelligence",
    desc: "Daily / weekly / monthly briefs with sourced numbers and actions.",
    icon: Sparkles,
  },
  {
    to: "/dashboards/forecast",
    title: "Cash Forecast",
    desc: "Inflow, outflow, net position with confidence over 30–180 days.",
    icon: Wallet,
  },
  {
    to: "/dashboards/profitability",
    title: "Project Profitability",
    desc: "Per-project P&L: estimate, sales, costs, gross, net, margin %.",
    icon: Briefcase,
  },
  {
    to: "/dashboards/customer-intelligence",
    title: "Customer Intelligence",
    desc: "Top, profitable, repeat, at-risk, inactive, potential high-value.",
    icon: Users,
  },
  {
    to: "/dashboards/vendor-intelligence",
    title: "Vendor Intelligence",
    desc: "Reliability, quality, cost, risk, dependency analysis.",
    icon: AlertTriangle,
  },
  {
    to: "/dashboards/sales",
    title: "Sales",
    desc: "Pipeline, conversion, follow-ups, quotes.",
    icon: BarChart3,
  },
  {
    to: "/dashboards/purchase",
    title: "Purchase",
    desc: "Open RFQs, vendor performance, POs.",
    icon: ShoppingCart,
  },
  {
    to: "/dashboards/production",
    title: "Production",
    desc: "Live status, QC, delays, installation.",
    icon: Factory,
  },
  {
    to: "/dashboards/management",
    title: "Management",
    desc: "Revenue, outstanding, project profit.",
    icon: Briefcase,
  },
  {
    to: "/dashboards/procurement",
    title: "Procurement",
    desc: "RFQ pipeline, PO deliveries, vendor payments.",
    icon: Truck,
  },
  {
    to: "/dashboards/procurement-calendar",
    title: "Procurement Calendar",
    desc: "Follow-ups, commitments, arrivals, payments, dispatch.",
    icon: CalendarClock,
  },
  {
    to: "/dashboards/procurement-health",
    title: "AI Procurement Health",
    desc: "AI grades vendor reliability, quality, cash flow, risk.",
    icon: Sparkles,
  },
  {
    to: "/dashboards/collections",
    title: "Collections",
    desc: "Customer payment schedules, overdue, AI collection priority.",
    icon: CircleDollarSign,
  },
  {
    to: "/dashboards/installation",
    title: "Installation",
    desc: "Active sites, teams, delays, material shortages, sign-offs.",
    icon: Wrench,
  },
] as const;


function DashboardsIndex() {
  return (
    <div>
      <PageHeader
        title="Role Dashboards"
        subtitle="Focused KPI views per role — pick a workspace."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <Link key={r.to} to={r.to} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <r.icon className="h-4 w-4 text-primary" /> {r.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{r.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
