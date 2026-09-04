import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { MASTER_CONFIGS } from "@/lib/masters/config";
import { Layers, Truck, HardHat } from "lucide-react";

// Carting Agencies (Task #40) and Installation Agencies (Task #47) are
// bespoke pages, not driven by MASTER_CONFIGS — see the note in
// src/lib/masters/config.ts for why (brand-new tables, not yet in the
// generated Database type). Listed here by hand so they're still
// discoverable from the Masters index.
const EXTRA_MASTERS = [
  {
    route: "carting-agencies",
    title: "Carting Agencies",
    description: "Transporters used for inbound vendor shipments.",
    icon: Truck,
  },
  {
    route: "installation-agencies",
    title: "Installation Agencies",
    description: "Third-party crews who handle installation on approved quotations.",
    icon: HardHat,
  },
];

export const Route = createFileRoute("/_authenticated/masters/")({
  component: MastersIndex,
});

function MastersIndex() {
  return (
    <div>
      <PageHeader
        title="Masters"
        subtitle="Stone-industry reference data used everywhere in the ERP."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MASTER_CONFIGS.map((m) => (
          <Link key={m.route} to={`/masters/${m.route}` as string} className="group">
            <Card className="flex items-start gap-3 p-4 transition-colors hover:border-primary/60 hover:bg-accent/40">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary">
                  {m.title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
              </div>
            </Card>
          </Link>
        ))}
        {EXTRA_MASTERS.map((m) => (
          <Link key={m.route} to={`/masters/${m.route}` as string} className="group">
            <Card className="flex items-start gap-3 p-4 transition-colors hover:border-primary/60 hover:bg-accent/40">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <m.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary">
                  {m.title}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
