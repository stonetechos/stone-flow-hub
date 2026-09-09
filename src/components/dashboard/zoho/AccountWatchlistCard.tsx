import { Landmark, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInrFull } from "@/lib/dashboard/zoho-api";

export function AccountWatchlistCard({
  pettyCash = 0,
  incomingToday = 0,
}: {
  pettyCash?: number;
  incomingToday?: number;
}) {
  const accounts = [
    {
      name: "Stone Tech Operations (Current A/c)",
      type: "Bank Account",
      accountNumber: "••• 4912",
      balance: 13566203.01,
      status: "Active",
    },
    {
      name: "Petty Cash & Site Float",
      type: "Cash on Hand",
      accountNumber: "Cash Drawer",
      balance: pettyCash || 50000,
      status: "Reconciled",
    },
    {
      name: "Customer Collections Clearing",
      type: "Clearing Account",
      accountNumber: "Daily Inflow",
      balance: incomingToday,
      status: "Active",
    },
  ];

  return (
    <Card className="border border-border/80 shadow-xs bg-card">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <span className="p-1 rounded-full border border-border bg-muted text-foreground inline-flex">
              <Landmark className="h-3.5 w-3.5" />
            </span>
            <span>Bank & Cash Accounts</span>
          </CardTitle>

          <Link
            to="/receipts"
            className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <span>Banking & Ledgers</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-3">
        <div className="divide-y divide-border/60">
          {accounts.map((acc) => (
            <div
              key={acc.name}
              className="py-2.5 flex items-center justify-between text-xs first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground">{acc.name}</div>
                <div className="text-muted-foreground text-[11px]">
                  {acc.type} • {acc.accountNumber}
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-foreground tabular-nums">
                  {formatInrFull(acc.balance)}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {acc.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
