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
  type LucideIcon,
} from "lucide-react";

export type NavGroupId =
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
}

// Order here is the sidebar's group order.
export const NAV_GROUPS: ReadonlyArray<NavGroupDef> = [
  { id: "sales", label: "Sales" },
  { id: "purchase", label: "Purchase" },
  { id: "inventory", label: "Inventory" },
  { id: "finance", label: "Finance" },
  { id: "payroll", label: "HR Operations" },
  { id: "masterData", label: "Master Data" },
  { id: "communication", label: "Communication" },
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
  // Sales: Customers -> Quotations -> Invoices -> Dispatches (with Local Carting)
  { id: "customers", to: "/customers", label: "Customers", icon: Users, group: "sales" },
  { id: "quotes", to: "/quotes", label: "Quotations", icon: FileText, group: "sales" },
  { id: "invoices", to: "/invoices", label: "Invoices", icon: Receipt, group: "sales" },
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

  // Finance: Payments -> Ledgers -> Liabilities -> Business Expenses
  {
    id: "payments",
    to: "/payments",
    label: "Payments",
    icon: Wallet,
    group: "finance",
  },
  {
    id: "ledger",
    to: "/ledger",
    label: "Ledgers",
    icon: BookOpen,
    group: "finance",
  },
  {
    id: "liabilities",
    to: "/liabilities",
    label: "Liabilities",
    icon: Landmark,
    group: "finance",
  },
  {
    id: "business-expenses",
    to: "/business-expenses",
    label: "Business Expenses",
    icon: ReceiptText,
    group: "finance",
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
  },
  {
    id: "hr-attendance",
    to: "/hr/attendance",
    label: "Attendance & Leave",
    icon: Fingerprint,
    group: "payroll",
  },
  {
    id: "hr-payroll",
    to: "/hr/payroll",
    label: "Payroll",
    icon: Banknote,
    group: "payroll",
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
  { id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "others" },
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
