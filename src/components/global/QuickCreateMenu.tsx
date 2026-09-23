/** Universal '+' menu for creating any entity from anywhere. */
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Users,
  Factory,
  PackageSearch,
  ClipboardList,
  FileText,
  FileCheck,
  Receipt,
  Wallet,
  CreditCard,
  Truck,
  Navigation,
  Landmark,
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

type MenuCategory = "Sales" | "Purchase" | "Inventory" | "Finance" | "People";

const ITEMS: ReadonlyArray<{
  to: string;
  label: string;
  icon: typeof Users;
  group: MenuCategory;
}> = [
  // Sales
  { to: "/customers", label: "Customer", icon: Users, group: "Sales" },
  { to: "/quotes/new", label: "Quotation", icon: FileText, group: "Sales" },
  { to: "/invoices/new", label: "Invoice", icon: Receipt, group: "Sales" },
  { to: "/dispatch/new", label: "Dispatch", icon: Truck, group: "Sales" },
  { to: "/local-carting", label: "Local Carting", icon: Navigation, group: "Sales" },

  // Purchase
  { to: "/vendors", label: "Vendor", icon: Factory, group: "Purchase" },
  { to: "/rfqs", label: "RFQ", icon: ClipboardList, group: "Purchase" },
  { to: "/purchase-invoices/new", label: "Purchase Invoice", icon: FileCheck, group: "Purchase" },
  {
    to: "/purchase-transport/new",
    label: "Purchase Transportation",
    icon: Truck,
    group: "Purchase",
  },

  // Inventory
  { to: "/inventory/new", label: "Inventory Item", icon: PackageSearch, group: "Inventory" },

  // Finance
  { to: "/receipts/new", label: "Customer Payment / Receipt", icon: Wallet, group: "Finance" },
  { to: "/vendor-payments/new", label: "Vendor Payment", icon: CreditCard, group: "Finance" },
  { to: "/agency-payments", label: "Agency Payment", icon: Landmark, group: "Finance" },

  // People / HR
  {
    to: "/workforce-intelligence/employees/new",
    label: "Employee",
    icon: Users,
    group: "People",
  },
];

export function QuickCreateMenu({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
} = {}) {
  const { t } = useTranslation();
  const groups: ReadonlyArray<MenuCategory> = [
    "Sales",
    "Purchase",
    "Inventory",
    "Finance",
    "People",
  ];
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 px-3 bg-[#083b43] hover:bg-[#0c4e58] text-white font-semibold border border-teal-900/40 shadow-xs transition-all active:scale-95"
          aria-label={t("nav.items.create", "Create new record (press C)")}
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">{t("actions.create", "Create")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {groups.map((g, gi) => (
          <div key={g}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              {t(`nav.groups.${g.toLowerCase()}`, g)}
            </DropdownMenuLabel>
            {ITEMS.filter((i) => i.group === g).map((i) => {
              const Icon = i.icon;
              return (
                <DropdownMenuItem key={i.to} asChild>
                  <Link to={i.to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {t(`field.${i.label}`, t(`quickCreate.${i.label}`, i.label))}
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
