import { Landmark, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
    <div className="card-3d-milky p-6">
      <div className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="inline-flex rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600 shadow-xs">
              <Landmark className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-black text-engraved-title">
              Bank &amp; Cash Watchlist
            </span>
          </div>

          <Link
            to="/receipts"
            className="flex items-center gap-1 text-xs font-bold text-engraved-blue transition-colors hover:scale-105"
          >
            <span>Banking &amp; Ledgers</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.name}
              className="engraved-well flex items-center justify-between rounded-xl p-3 text-xs transition-all hover:scale-[1.01]"
            >
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800">{acc.name}</div>
                <div className="font-mono text-[11px] font-medium text-slate-500">
                  {acc.type} • {acc.accountNumber}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="font-display font-black text-engraved-blue tabular-nums sm:text-sm">
                    {formatInrFull(acc.balance)}
                  </div>
                </div>
                <span className="engraved-well-glow rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-engraved-blue">
                  {acc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
