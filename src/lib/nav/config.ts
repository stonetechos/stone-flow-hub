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
  BookOpen,
  Wallet,
  Banknote,
  HandCoins,
  Landmark,
  ReceiptText,
  BarChart3,
  Settings,
  CheckSquare,
  FolderOpen,
  ShieldCheck,
  MessageSquare,
  Bell,
  Mails,
  Fingerprint,
  CalendarDays,
  UserCog,
  Globe,
  ArrowLeftRight,
  Layers,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/admin/users";

export type NavGroupId =
  | "overview"
  | "sales"
  | "purchase"
  | "inventory"
  | "finance"
  | "payroll"
  | "workforce"
  | "masterData"
  | "communication"
  | "others"
  | "admin";

export interface NavGroupDef {
  id: NavGroupId;
  label: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  allowedRoles?: readonly AppRole[];
}

// Order here is the sidebar's group order.
export const NAV_GROUPS: ReadonlyArray<NavGroupDef> = [
  { id: "overview", label: "Overview" },
  {
    id: "sales",
    label: "Sales & CRM",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  {
    id: "purchase",
    label: "Purchase",
    allowedRoles: ["admin", "super_admin", "purchase"],
  },
  {
    id: "inventory",
    label: "Inventory",
    allowedRoles: ["admin", "super_admin", "purchase", "sales_manager"],
  },
  {
    id: "finance",
    label: "Money Flow",
    allowedRoles: ["admin", "super_admin"],
  },
  { id: "payroll", label: "HR Operations" },
  {
    id: "masterData",
    label: "Master Data",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "communication",
    label: "Communication",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  {
    id: "others",
    label: "Others",
    allowedRoles: ["admin", "super_admin"],
  },
  { id: "admin", label: "Administration", adminOnly: true, allowedRoles: ["admin", "super_admin"] },
];

export interface NavItemDef {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroupId;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  allowedRoles?: readonly AppRole[];
}

export const NAV_ITEMS: ReadonlyArray<NavItemDef> = [
  // Overview: Dashboard is placed right at the top above Sales for instant access
  {
    id: "dashboard",
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "overview",
  },

  // Sales & CRM: Website Leads & CRM -> Customers -> Quotations -> Sales Invoices -> Dispatches
  {
    id: "enquiries",
    to: "/enquiries",
    label: "Website Leads & CRM",
    icon: Globe,
    group: "sales",
    allowedRoles: ["admin", "super_admin", "sales_manager", "sales"],
  },
  { id: "customers", to: "/customers", label: "Customers", icon: Users, group: "sales" },
  { id: "quotes", to: "/quotes", label: "Quotations", icon: FileText, group: "sales" },
  { id: "invoices", to: "/invoices", label: "Sales Invoices", icon: Receipt, group: "sales" },
  { id: "dispatch", to: "/dispatch", label: "Dispatches", icon: Truck, group: "sales" },

  // Purchase: Vendors -> RFQ -> Purchase Invoices (with Inward Transportation)
  {
    id: "vendors",
    to: "/vendors",
    label: "Vendors",
    icon: Factory,
    group: "purchase",
  },
  { id: "rfqs", to: "/rfqs", label: "RFQ", icon: Send, group: "purchase" },
  {
    id: "purchase-invoices",
    to: "/purchase-invoices",
    label: "Purchase Invoices",
    icon: Receipt,
    group: "purchase",
  },

  // Inventory (Individual Category)
  {
    id: "inventory",
    to: "/inventory",
    label: "Inventory",
    icon: Warehouse,
    group: "inventory",
  },

  // Money Flow: Unified Command Center, Customer & Vendor & Agency Payments, and Ledgers
  {
    id: "money-flow",
    to: "/money-flow",
    label: "Money Flow",
    icon: ArrowLeftRight,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "payments",
    to: "/payments?tab=customer",
    label: "Customer Payments",
    icon: Wallet,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "vendor-payments",
    to: "/vendor-payments",
    label: "Vendor Payments",
    icon: Banknote,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "agency-payments",
    to: "/agency-payments",
    label: "Agency Payments",
    icon: HandCoins,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "ledger",
    to: "/ledger?tab=sales",
    label: "Customer Ledgers",
    icon: BookOpen,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "vendor-ledger",
    to: "/purchase-ledger",
    label: "Vendor Ledgers",
    icon: Factory,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "agency-ledger",
    to: "/installation-ledger",
    label: "Agency Ledgers",
    icon: Layers,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "liabilities",
    to: "/liabilities",
    label: "Liabilities & Loans",
    icon: Landmark,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },
  {
    id: "business-expenses",
    to: "/business-expenses",
    label: "Business Expenses",
    icon: ReceiptText,
    group: "finance",
    allowedRoles: ["admin", "super_admin"],
  },

  // HR Operations (Merged HR Operations & Workforce Intelligence)
  // 1. Employees: Workforce master directory
  // 2. Attendance & Leave: Daily punches + Leave requests & balances (embedded tab)
  // 3. Payroll: Monthly payroll runs + Salary structures + Loans & claims (embedded tabs)
  // 4. Workforce Intelligence: Personal work queue + Performance scorecards + Owner intelligence (embedded tabs)
  {
    id: "wf-employees",
    to: "/workforce-intelligence/employees",
    label: "Employees",
    icon: Users,
    group: "payroll",
    allowedRoles: ["admin", "super_admin", "hr", "sales_manager"],
  },
  {
    id: "hr-attendance",
    to: "/hr/attendance",
    label: "Attendance & Leave",
    icon: Fingerprint,
    group: "payroll",
    allowedRoles: ["admin", "super_admin", "hr"],
  },
  {
    id: "hr-payroll",
    to: "/hr/payroll",
    label: "Payroll",
    icon: Banknote,
    group: "payroll",
    allowedRoles: ["admin", "super_admin", "hr"],
  },
  {
    id: "wf-today",
    to: "/workforce-intelligence",
    label: "Workforce Intelligence",
    icon: BarChart3,
    group: "payroll",
  },

  // Master Data
  { id: "products", to: "/products", label: "Products", icon: PackageSearch, group: "masterData" },
  { id: "masters", to: "/masters", label: "Masters", icon: Gem, group: "masterData" },

  // Communication
  // These four pages were complete but unreachable from the sidebar — the
  // only way in was a stray in-page link (or typing the URL). They are the
  // customer-communication surface, so they get their own group rather than
  // being buried in "Others" next to Favorites.
  {
    id: "communication",
    to: "/communication",
    label: "Communication",
    icon: MessageSquare,
    group: "communication",
  },
  {
    id: "notifications",
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    group: "communication",
  },
  {
    id: "message-templates",
    to: "/message-templates",
    label: "Message Templates",
    icon: Mails,
    group: "communication",
  },
  // "Notifications Queue" (outbound send-log) and "Notification Settings"
  // (config) removed from the sidebar 2026-09-06 decluttering — technical/
  // admin screens, not something checked day-to-day. Pages/routes
  // untouched; uncomment to bring back.
  // { id: "messages", to: "/messages", label: "Notifications Queue", icon: Send, group: "communication" },
  // { id: "notification-settings", to: "/notification-settings", label: "Notification Settings", icon: BellRing, group: "communication" },

  // Others
  {
    id: "dashboards",
    to: "/dashboards",
    label: "Role Dashboards",
    icon: BarChart3,
    group: "others",
  },
  { id: "documents", to: "/documents", label: "Documents", icon: FolderOpen, group: "others" },
  // "Activity" (audit log) and "Favorites" (bookmarks) removed from the
  // sidebar 2026-09-06 decluttering — low-traffic utility screens. Pages/
  // routes untouched; uncomment to bring back.
  // { id: "activity", to: "/activity", label: "Activity", icon: Activity, group: "others" },
  // { id: "favorites", to: "/favorites", label: "Favorites", icon: Star, group: "others" },
  { id: "reports", to: "/reports", label: "Reports", icon: BarChart3, group: "others" },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings, group: "others" },

  // Admin
  {
    id: "admin-users",
    to: "/admin/users",
    label: "Users & Roles",
    icon: ShieldCheck,
    group: "admin",
    adminOnly: true,
  },
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
