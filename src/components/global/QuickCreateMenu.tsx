/** Universal '+' menu for creating any entity from anywhere. */
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Users,
  Building2,
  Factory,
  PackageSearch,
  ClipboardList,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  Receipt,
  Wallet,
  Truck,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS: ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Users;
  group: "Master" | "Sales" | "Ops";
}> = [
  { to: "/customers", label: "Customer", icon: Users, group: "Master" },
  { to: "/projects", label: "Project", icon: Building2, group: "Master" },
  { to: "/vendors", label: "Vendor", icon: Factory, group: "Master" },
  { to: "/products", label: "Product", icon: PackageSearch, group: "Master" },
  { to: "/enquiries", label: "Enquiry", icon: ClipboardList, group: "Sales" },
  { to: "/quotes/new", label: "Quotation", icon: FileText, group: "Sales" },
  { to: "/sales-orders/new", label: "Sales Order", icon: ShoppingCart, group: "Sales" },
  { to: "/invoices/new", label: "Invoice", icon: Receipt, group: "Sales" },
  { to: "/payments/new", label: "Payment", icon: Wallet, group: "Sales" },
  { to: "/purchase-orders/new", label: "Purchase Order", icon: ClipboardCheck, group: "Ops" },
  { to: "/inventory/new", label: "Inventory Item", icon: PackageSearch, group: "Ops" },
  { to: "/dispatch/new", label: "Dispatch", icon: Truck, group: "Ops" },
  { to: "/tasks", label: "Task", icon: CheckSquare, group: "Ops" },
];

export function QuickCreateMenu() {
  const groups: ReadonlyArray<"Master" | "Sales" | "Ops"> = ["Master", "Sales", "Ops"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((g, gi) => (
          <div key={g}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              {g}
            </DropdownMenuLabel>
            {ITEMS.filter((i) => i.group === g).map((i) => {
              const Icon = i.icon;
              return (
                <DropdownMenuItem key={i.to} asChild>
                  <Link to={i.to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {i.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
