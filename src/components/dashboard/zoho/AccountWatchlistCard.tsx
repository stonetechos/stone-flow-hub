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
    <Card className="rounded-2xl border border-blue-100/80 bg-white/95 shadow-[0_4px_20px_rgba(30,58,138,0.04)] backdrop-blur-xs transition-all duration-300 hover:border-blue-200 hover:shadow-[0_8px_30px_rgba(30,58,138,0.08)]">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
            <span className="inline-flex rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600 shadow-xs">
              <Landmark className="h-4 w-4" />
            </span>
            <span>Bank & Cash Watchlist</span>
          </CardTitle>

          <Link
            to="/receipts"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
          >
            <span>Banking & Ledgers</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 p-6 pt-3">
        <div className="space-y-1.5">
          {accounts.map((acc) => (
            <div
              key={acc.name}
              className="flex items-center justify-between rounded-xl p-3 text-xs transition-colors hover:bg-blue-50/50"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-900">{acc.name}</div>
                <div className="text-[11px] text-slate-500">
                  {acc.type} • {acc.accountNumber}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="font-display font-bold text-slate-900 tabular-nums">
                    {formatInrFull(acc.balance)}
                  </div>
                </div>
                <span className="rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase text-blue-700">
                  {acc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
