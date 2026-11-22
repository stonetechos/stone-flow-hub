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
  FileText,
  Receipt,
  Gem,
  ShoppingCart,
  Send,
  Truck,
  Warehouse,
  BookOpen,
  Wallet,
  Banknote,
  HandCoins,
  Landmark,
  ReceiptText,
  BarChart3,
  Settings,
  FolderOpen,
  ShieldCheck,
  MessageSquare,
  Bell,
  Mails,
  Fingerprint,
  Globe,
  ArrowLeftRight,
  Layers,
  HardHat,
  Coins,
  TrendingUp,
  Bot,
  Clock,
  type LucideIcon,
} from "lucide-react";

import type { AppRole } from "@/lib/admin/users";

export type NavGroupId =
  | "overview"
  | "items"
  | "sales"
  | "purchase"
  | "executions"
  | "time"
  | "accountant"
  | "reports"
  | "documents"
  | "settings";

export interface NavGroupDef {
  id: NavGroupId;
  label: string;
  icon: LucideIcon;
  to?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  allowedRoles?: readonly AppRole[];
}

// Order here is the sidebar's group order (Zoho Books 11-module hierarchy).
export const NAV_GROUPS: ReadonlyArray<NavGroupDef> = [
  { id: "overview", label: "Home", icon: LayoutDashboard, to: "/dashboard" },
  {
    id: "items",
    label: "Items",
    icon: PackageSearch,
    to: "/products",
    allowedRoles: ["admin", "super_admin", "purchase", "sales_manager"],
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingCart,
    to: "/sales-orders",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  {
    id: "purchase",
    label: "Purchases",
    icon: Truck,
    to: "/purchase-orders",
    allowedRoles: ["admin", "super_admin", "purchase"],
  },
  {
    id: "executions",
    label: "Executions & Cartings",
    icon: HardHat,
    to: "/installations",
    allowedRoles: ["admin", "super_admin", "sales_manager"],
  },
  {
    id: "time",
    label: "HR & Workforce",
    icon: Users,
    to: "/workforce-intelligence",
    allowedRoles: ["admin", "super_admin", "hr", "sales_manager"],
  },
  {
    id: "accountant",
    label: "Accountant",
    icon: BookOpen,
    to: "/ledger?tab=sales",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    to: "/reports",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "documents",
    label: "Documents",
    icon: FolderOpen,
    to: "/documents",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    to: "/settings",
    allowedRoles: ["admin", "super_admin"],
  },
];

export interface NavItemDef {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
  quickCreateTo?: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  allowedRoles?: readonly AppRole[];
}

export const NAV_ITEMS: ReadonlyArray<NavItemDef> = [
  // 1. Home / Overview
  {
    id: "dashboard",
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "overview",
  },
  {
    id: "profitability",
    to: "/dashboards/profitability",
    label: "Profit Target",
    icon: TrendingUp,
    group: "overview",
    allowedRoles: ["admin", "super_admin", "sales_manager"],
  },
  {
    id: "agent-centre",
    to: "/agent-centre",
    label: "Agent Centre",
    icon: Bot,
    group: "overview",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "home-whatsapp",
    to: "/communication",
    label: "WhatsApp CRM",
    icon: MessageSquare,
    group: "overview",
  },

  // 2. Items & Inventory
  {
    id: "products",
    to: "/products",
    label: "Products & Materials",
    icon: PackageSearch,
    group: "items",
    quickCreateTo: "/products?create=true",
  },
  {
    id: "inventory",
    to: "/inventory",
    label: "Stock Inventory",
    icon: Warehouse,
    group: "items",
  },
  {
    id: "masters",
    to: "/masters",
    label: "Price Lists & Masters",
    icon: Gem,
    group: "items",
    allowedRoles: ["admin", "super_admin", "sales_manager"],
  },

  // 3. Sales & CRM
  {
    id: "customers",
    to: "/customers",
    label: "Customers",
    icon: Users,
    group: "sales",
    quickCreateTo: "/customers?create=true",
  },
  {
    id: "enquiries",
    to: "/enquiries",
    label: "Website Leads & CRM",
    icon: Globe,
    group: "sales",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  {
    id: "whatsapp",
    to: "/communication",
    label: "WhatsApp Web & CRM",
    icon: MessageSquare,
    group: "sales",
    quickCreateTo: "/communication",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  {
    id: "projects",
    to: "/projects",
    label: "Projects & Profit Diary",
    icon: Building2,
    group: "sales",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  {
    id: "quotes",
    to: "/quotes",
    label: "Quotations",
    icon: FileText,
    group: "sales",
    quickCreateTo: "/quotes/new",
  },
  {
    id: "sales-orders",
    to: "/sales-orders",
    label: "Sales Orders",
    icon: ShoppingCart,
    group: "sales",
    quickCreateTo: "/sales-orders/new",
  },
  {
    id: "invoices",
    to: "/invoices",
    label: "Sales Invoices",
    icon: Receipt,
    group: "sales",
    quickCreateTo: "/invoices/new",
  },
  {
    id: "dispatch",
    to: "/dispatch",
    label: "Delivery Challans & Dispatch",
    icon: Truck,
    group: "sales",
  },
  {
    id: "payments",
    to: "/payments?tab=customer",
    label: "Payments Received",
    icon: Wallet,
    group: "sales",
    allowedRoles: ["admin", "super_admin"],
  },

  // 4. Purchases
  {
    id: "vendors",
    to: "/vendors",
    label: "Supplying Partners",
    icon: Factory,
    group: "purchase",
    allowedRoles: ["admin", "super_admin", "purchase"],
    quickCreateTo: "/vendors?create=true",
  },
  {
    id: "partners-directory",
    to: "/vendors?view=directory",
    label: "Work & Supply Directory",
    icon: Users,
    group: "purchase",
    allowedRoles: ["admin", "super_admin", "purchase"],
  },
  {
    id: "rfqs",
    to: "/rfqs",
    label: "RFQ (Request for Quote)",
    icon: Send,
    group: "purchase",
    allowedRoles: ["admin", "super_admin", "purchase"],
  },
  {
    id: "purchase-orders",
    to: "/purchase-orders",
    label: "Purchase Orders",
    icon: ClipboardList,
    group: "purchase",
    allowedRoles: ["admin", "super_admin", "purchase"],
    quickCreateTo: "/purchase-orders/new",
  },
  {
    id: "purchase-invoices",
    to: "/purchase-invoices",
    label: "Purchase Invoices (Bills)",
    icon: Receipt,
    group: "purchase",
    allowedRoles: ["admin", "super_admin", "purchase"],
    quickCreateTo: "/purchase-invoices/new",
  },
  {
    id: "vendor-payments",
    to: "/vendor-payments",
    label: "Supplier Payments",
    icon: Banknote,
    group: "purchase",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "vendor-ledger",
    to: "/purchase-ledger",
    label: "Suppliers Ledger",
    icon: BookOpen,
    group: "purchase",
    allowedRoles: ["admin", "super_admin"],
  },

  // 5. Executions & Cartings
  {
    id: "installations",
    to: "/installations",
    label: "Site Installations",
    icon: HardHat,
    group: "executions",
    allowedRoles: ["admin", "super_admin", "sales_manager"],
  },
  {
    id: "agencies",
    to: "/installation-teams",
    label: "Application Partners",
    icon: Users,
    group: "executions",
    quickCreateTo: "/installation-teams",
    allowedRoles: ["admin", "super_admin", "sales_manager"],
  },
  {
    id: "agency-payments",
    to: "/agency-payments",
    label: "Application Partner Payments",
    icon: HandCoins,
    group: "executions",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "agency-ledger",
    to: "/installation-ledger",
    label: "Application Partner Ledgers",
    icon: Layers,
    group: "executions",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "purchase-transport",
    to: "/purchase-transport",
    label: "Transport Partners",
    icon: Truck,
    group: "executions",
    quickCreateTo: "/purchase-transport/new",
    allowedRoles: ["admin", "super_admin", "purchase"],
  },

  // 6. HR & Workforce
  {
    id: "wf-employees",
    to: "/workforce-intelligence/employees",
    label: "Employees",
    icon: Users,
    group: "time",
    allowedRoles: ["admin", "super_admin", "hr", "sales_manager"],
  },
  {
    id: "hr-attendance",
    to: "/hr/attendance",
    label: "Attendance & Leave",
    icon: Fingerprint,
    group: "time",
    allowedRoles: ["admin", "super_admin", "hr"],
  },
  {
    id: "hr-payroll",
    to: "/hr/payroll",
    label: "Payroll",
    icon: Banknote,
    group: "time",
    allowedRoles: ["admin", "super_admin", "hr"],
  },
  {
    id: "hr-payments",
    to: "/hr/payments",
    label: "Employee Payments",
    icon: Wallet,
    group: "time",
    allowedRoles: ["admin", "super_admin", "hr"],
  },
  {
    id: "wf-today",
    to: "/workforce-intelligence",
    label: "Workforce Intelligence",
    icon: BarChart3,
    group: "time",
  },

  // 7. Accountant
  {
    id: "ledger",
    to: "/ledger?tab=sales",
    label: "Customer Ledgers",
    icon: BookOpen,
    group: "accountant",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "money-flow",
    to: "/money-flow",
    label: "Money Flow",
    icon: Landmark,
    group: "accountant",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "business-expenses",
    to: "/business-expenses",
    label: "Business Expenses",
    icon: ReceiptText,
    group: "accountant",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "liabilities",
    to: "/liabilities",
    label: "Liabilities & Loans",
    icon: Landmark,
    group: "accountant",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "ramans-cashbook",
    to: "/ramans-cashbook",
    label: "Raman's Cashbook",
    icon: Coins,
    group: "accountant",
    allowedRoles: ["super_admin"],
    superAdminOnly: true,
  },
  {
    id: "personal-transfers",
    to: "/personal-transfers",
    label: "Personal Transfers",
    icon: ArrowLeftRight,
    group: "accountant",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "gst",
    to: "/gst",
    label: "Filing & Compliance",
    icon: ShieldCheck,
    group: "accountant",
    allowedRoles: ["admin", "super_admin"],
  },

  // 9. Reports
  {
    id: "reports",
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    group: "reports",
  },
  {
    id: "dashboards",
    to: "/dashboards",
    label: "Role Dashboards",
    icon: LayoutDashboard,
    group: "reports",
  },

  // 10. Documents
  {
    id: "documents",
    to: "/documents",
    label: "All Documents",
    icon: FolderOpen,
    group: "documents",
  },

  // 11. Settings & More Features
  {
    id: "communication",
    to: "/communication",
    label: "WhatsApp & Communication Hub",
    icon: MessageSquare,
    group: "settings",
  },
  {
    id: "notifications",
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    group: "settings",
  },
  {
    id: "message-templates",
    to: "/message-templates",
    label: "Message Templates",
    icon: Mails,
    group: "settings",
  },
  {
    id: "admin-users",
    to: "/admin/users",
    label: "Users & Roles",
    icon: ShieldCheck,
    group: "settings",
    adminOnly: true,
  },
  {
    id: "website-admin",
    to: "/admin/website",
    label: "Website CMS",
    icon: Globe,
    group: "settings",
  },
  {
    id: "settings",
    to: "/settings",
    label: "Profile & Preferences",
    icon: Settings,
    group: "settings",
  },
];

export const NAV_ITEMS_BY_ID: Readonly<Record<string, NavItemDef>> = Object.fromEntries(
  NAV_ITEMS.map((i) => [i.id, i]),
);

export function findNavItemForPath(pathname: string): NavItemDef | undefined {
  const [cleanPath, searchStr] = pathname.split("?");
  const searchParams = searchStr ? new URLSearchParams(searchStr) : null;

  // Dedicated backward-compatible alias for personal transfers
  if (cleanPath === "/money-flow" && searchParams?.get("tab") === "personal-transfers") {
    return NAV_ITEMS_BY_ID["personal-transfers"];
  }

  let best: NavItemDef | undefined;
  let bestScore = -1;

  for (const item of NAV_ITEMS) {
    const [itemPath, itemSearch] = item.to.split("?");
    const itemParams = itemSearch ? new URLSearchParams(itemSearch) : null;

    const isExactPath = cleanPath === itemPath;
    const isPrefixPath = isExactPath || (itemPath !== "/" && cleanPath.startsWith(`${itemPath}/`));
    if (!isPrefixPath) continue;

    let queryScore = 0;
    if (itemParams) {
      if (!searchParams) {
        // Query param not present in current URL, but pathname matches itemPath.
        // Allow match as lower-priority fallback (e.g. /payments matching payments tab).
        queryScore = -50;
      } else {
        let allMatched = true;
        for (const [key, val] of itemParams.entries()) {
          if (searchParams.get(key) !== val) {
            allMatched = false;
            break;
          }
        }
        queryScore = allMatched ? 1000 : -50;
      }
    } else {
      queryScore = searchParams ? 0 : 50;
    }

    const score = itemPath.length + (isExactPath ? 100 : 0) + queryScore;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

/**
 * Determine whether a nav item is active for the current path.
 * When a more specific sibling nav item matches the current path
 * (e.g. `/workforce-intelligence/employees` vs `/workforce-intelligence`,
 * or `/money-flow?tab=personal-transfers` vs `/money-flow`),
 * only the most specific nav item is active, preventing both tabs from highlighting together.
 */
export function isNavItemActive(item: NavItemDef, currentPath: string): boolean {
  const activeDef = findNavItemForPath(currentPath);
  if (activeDef) {
    return activeDef.id === item.id;
  }
  const cleanCurrent = currentPath.split("?")[0];
  const cleanItem = item.to.split("?")[0];
  return cleanCurrent === cleanItem || cleanCurrent.startsWith(`${cleanItem}/`);
}
