import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, ShoppingCart, ClipboardList, LayoutDashboard } from "lucide-react";
import { useRoles } from "@/hooks/use-roles";
import { SkeletonTable } from "@/components/layout/States";
import { Button } from "@/components/ui/button";

interface AccountingGuardProps {
  children: ReactNode;
  moduleName?: string;
}

export function AccountingGuard({
  children,
  moduleName = "Accounting & Finance",
}: AccountingGuardProps) {
  const roles = useRoles();

  if (!roles.isReady) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  // Only Platform Super Admin (Owner) is authorized to access main accounting
  if (!roles.isSuperAdmin) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <div className="relative max-w-lg w-full rounded-2xl border border-border/80 bg-surface-card p-6 sm:p-8 shadow-e3 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-8 ring-amber-500/5">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Super Admin Privilege Required
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {moduleName} Restricted
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Company financial ledgers, payment registries, liabilities, and business expenses are
              strictly reserved for the <strong>Platform Super Admin (Owner)</strong> profile.
            </p>
            <p className="text-xs text-muted-foreground/80">
              Your profile has full access to operational administrative workflows including Sales,
              Purchase, Inventory, and Workforce Management.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Button asChild variant="default" size="sm" className="w-full sm:w-auto gap-2">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto gap-2">
              <Link to="/sales-orders">
                <ShoppingCart className="h-4 w-4" />
                <span>Sales Orders</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto gap-2">
              <Link to="/purchase-orders">
                <ClipboardList className="h-4 w-4" />
                <span>Purchase Orders</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
