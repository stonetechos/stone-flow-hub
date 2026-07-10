/**
 * Central definition of the primary left-navigation.
 * The rendered sidebar and the Navigation preferences editor both consume
 * this list. Routing, permissions and page components are NOT touched — this
 * is a pure presentation layer.
 */
import {
  LayoutDashboard,
  Users,
  Building2,
  Factory,
  PackageSearch,
  ClipboardList,
  CalendarClock,
  FileText,
  Receipt,
  Gem,
  ShoppingCart,
  Send,
  Truck,
  Warehouse,
  ClipboardCheck,
  Wallet,
  Calendar,
  BarChart3,
  Settings,
  Activity,
  CheckSquare,
  FolderOpen,
  Star,
  ShieldCheck,
  Layers,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type NavGroupId =
  | "sales"
  | "operations"
  | "workforce"
  | "masterData"
  | "others"
  | "admin";

export interface NavGroupDef {
  id: NavGroupId;
  label: string;
  adminOnly?: boolean;
}

export const NAV_GROUPS: ReadonlyArray<NavGroupDef> = [
  { id: "sales", label: "Sales" },
  { id: "operations", label: "Operations" },
  { id: "workforce", label: "Workforce Intelligence" },
  { id: "masterData", label: "Master Data" },
  { id: "others", label: "Others" },
  { id: "admin", label: "Administration", adminOnly: true },
];

export interface NavItemDef {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
  adminOnly?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItemDef> = [
  // Sales
  { id: "customers", to: "/customers", label: "Customers", icon: Users, group: "sales" },
  { id: "enquiries", to: "/enquiries", label: "Enquiries", icon: ClipboardList, group: "sales" },
  { id: "projects", to: "/projects", label: "Projects", icon: Building2, group: "sales" },
  { id: "estimates", to: "/estimates", label: "Estimation Studio", icon: FileText, group: "sales" },
  { id: "quotes", to: "/quotes", label: "Quotations", icon: FileText, group: "sales" },
  { id: "sales-orders", to: "/sales-orders", label: "Sales Orders", icon: ShoppingCart, group: "sales" },
  { id: "payments", to: "/payments", label: "Payments", icon: Wallet, group: "sales" },
  { id: "invoices", to: "/invoices", label: "Invoices", icon: Receipt, group: "sales" },
  { id: "receipts", to: "/receipts", label: "Receipts & Ledger", icon: Wallet, group: "sales" },
  { id: "rfqs", to: "/rfqs", label: "RFQs", icon: Send, group: "sales" },
  { id: "followups", to: "/followups", label: "Follow-ups", icon: CalendarClock, group: "sales" },
  { id: "tasks", to: "/tasks", label: "Tasks", icon: CheckSquare, group: "sales" },
  { id: "calendar", to: "/calendar", label: "Calendar", icon: Calendar, group: "sales" },

  // Operations
  { id: "purchase-orders", to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardCheck, group: "operations" },
  { id: "manufacturing", to: "/manufacturing", label: "Manufacturing", icon: Factory, group: "operations" },
  { id: "inventory", to: "/inventory", label: "Inventory", icon: Warehouse, group: "operations" },
  { id: "slabs", to: "/inventory/slabs", label: "Slab Register", icon: Layers, group: "operations" },
  { id: "dispatch", to: "/dispatch", label: "Dispatch", icon: Truck, group: "operations" },

  // Master Data
  { id: "products", to: "/products", label: "Products", icon: PackageSearch, group: "masterData" },
  { id: "vendors", to: "/vendors", label: "Vendors", icon: Factory, group: "masterData" },
  { id: "masters", to: "/masters", label: "Masters", icon: Gem, group: "masterData" },

  // Others
  { id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "others" },
  { id: "dashboards", to: "/dashboards", label: "Role Dashboards", icon: BarChart3, group: "others" },
  { id: "documents", to: "/documents", label: "Documents", icon: FolderOpen, group: "others" },
  { id: "activity", to: "/activity", label: "Activity", icon: Activity, group: "others" },
  { id: "favorites", to: "/favorites", label: "Favorites", icon: Star, group: "others" },
  { id: "messages", to: "/messages", label: "Notifications Queue", icon: Send, group: "others" },
  { id: "reports", to: "/reports", label: "Reports", icon: BarChart3, group: "others" },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings, group: "others" },

  // Admin
  { id: "admin-users", to: "/admin/users", label: "Users & Roles", icon: ShieldCheck, group: "admin", adminOnly: true },
];

export const NAV_ITEMS_BY_ID: Readonly<Record<string, NavItemDef>> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.id, i]),
);

export function findNavItemForPath(pathname: string): NavItemDef | undefined {
  // Longest matching `to` prefix wins so `/inventory/slabs` beats `/inventory`.
  let best: NavItemDef | undefined;
  for (const item of NAV_ITEMS) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
      if (!best || item.to.length > best.to.length) best = item;
    }
  }
  return best;
}
