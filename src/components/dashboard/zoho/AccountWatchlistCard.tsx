import { useState } from "react";
import { Landmark, ArrowUpRight, MessageSquareText, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatInrFull } from "@/lib/dashboard/zoho-api";
import { listBankAccounts, type BankAccountRow } from "@/lib/banking/banking";
import { Button } from "@/components/ui/button";
import { TransactionMessageReaderModal } from "@/components/banking/TransactionMessageReaderModal";

export function AccountWatchlistCard({
  pettyCash = 0,
  incomingToday = 0,
}: {
  pettyCash?: number;
  incomingToday?: number;
}) {
  const [readerOpen, setReaderOpen] = useState(false);
  const accountsQuery = useQuery({
    queryKey: ["banking", "accounts"],
    queryFn: listBankAccounts,
  });

  const accounts = accountsQuery.data || [];

  return (
    <div className="card-3d-milky p-6">
      <div className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2 text-cyan-700 shadow-xs">
              <Landmark className="h-4 w-4" />
            </span>
            <span className="font-display text-base font-black text-engraved-title">
              Bank &amp; Cash Watchlist
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReaderOpen(true)}
              className="h-7 px-2.5 gap-1.5 text-xs font-semibold border-cyan-300 bg-cyan-50/50 text-cyan-800 hover:bg-cyan-100/60 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300"
            >
              <MessageSquareText className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Read UPI / SMS</span>
            </Button>

            <Link
              to="/receipts"
              className="flex items-center gap-1 text-xs font-bold text-engraved-blue transition-colors hover:scale-105"
            >
              <span>Banking &amp; Ledgers</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="space-y-2">
          {accounts.map((acc) => {
            const displayBalance =
              acc.account_type === "cash" && pettyCash > 0
                ? pettyCash
                : acc.account_type === "clearing" && incomingToday > 0
                  ? incomingToday
                  : acc.current_balance;

            return (
              <div
                key={acc.id || acc.name}
                className="engraved-well flex items-center justify-between rounded-xl p-3 text-xs transition-all hover:scale-[1.01]"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 dark:text-slate-100">{acc.name}</div>
                  <div className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {acc.bank_name || acc.account_type.toUpperCase()} • {acc.account_number}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-display font-black text-engraved-blue tabular-nums sm:text-sm">
                      {formatInrFull(displayBalance)}
                    </div>
                  </div>
                  <span className="engraved-well-glow rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-engraved-blue">
                    {acc.is_active ? "Active" : "Archived"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <TransactionMessageReaderModal open={readerOpen} onOpenChange={setReaderOpen} />
    </div>
  );
}
