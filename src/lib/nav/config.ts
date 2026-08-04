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
  ArrowLeftRight,
  CheckSquare,
  FolderOpen,
  Star,
  ShieldCheck,
  Layers,
  Briefcase,
  MessageSquare,
  Bell,
  Mails,
  BellRing,
  Fingerprint,
  CalendarDays,
  Clock,
  MapPin,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type NavGroupId =
  | "sales"
  | "operations"
  | "workforce"
  | "humanResources"
  | "masterData"
  | "communication"
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
  { id: "humanResources", label: "Human Resources" },
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
  // Sales
  { id: "customers", to: "/customers", label: "Customers", icon: Users, group: "sales" },
  { id: "enquiries", to: "/enquiries", label: "Enquiries", icon: ClipboardList, group: "sales" },
  { id: "projects", to: "/projects", label: "Projects", icon: Building2, group: "sales" },
  { id: "estimates", to: "/estimates", label: "Estimation Studio", icon: FileText, group: "sales" },
  { id: "quotes", to: "/quotes", label: "Quotations", icon: FileText, group: "sales" },
  {
    id: "sales-orders",
    to: "/sales-orders",
    label: "Sales Orders",
    icon: ShoppingCart,
    group: "sales",
  },
  { id: "payments", to: "/payments", label: "Payments", icon: Wallet, group: "sales" },
  { id: "invoices", to: "/invoices", label: "Invoices", icon: Receipt, group: "sales" },
  { id: "receipts", to: "/receipts", label: "Receipts & Ledger", icon: Wallet, group: "sales" },
  { id: "rfqs", to: "/rfqs", label: "RFQs", icon: Send, group: "sales" },
  { id: "followups", to: "/followups", label: "Follow-ups", icon: CalendarClock, group: "sales" },
  { id: "tasks", to: "/tasks", label: "Tasks", icon: CheckSquare, group: "sales" },
  { id: "calendar", to: "/calendar", label: "Calendar", icon: Calendar, group: "sales" },

  // Operations
  {
    id: "purchase-orders",
    to: "/purchase-orders",
    label: "Purchase Orders",
    icon: ClipboardCheck,
    group: "operations",
  },
  {
    id: "manufacturing",
    to: "/manufacturing",
    label: "Manufacturing",
    icon: Factory,
    group: "operations",
  },
  { id: "inventory", to: "/inventory", label: "Inventory", icon: Warehouse, group: "operations" },
  {
    id: "slabs",
    to: "/inventory/slabs",
    label: "Slab Register",
    icon: Layers,
    group: "operations",
  },
  // `/inventory/movements` is a complete page — the stock movement ledger
  // plus the only form in the app that records a manual adjustment — but
  // nothing linked to it, from here or from the Inventory index, so the
  // only way to reach it was to type the URL. It sits alongside the Slab
  // Register for the same reason that one does: both are inventory views
  // that the Inventory list page does not itself contain.
  {
    id: "inventory-movements",
    to: "/inventory/movements",
    label: "Stock Movements",
    icon: ArrowLeftRight,
    group: "operations",
  },
  { id: "dispatch", to: "/dispatch", label: "Dispatch", icon: Truck, group: "operations" },

  // Workforce Intelligence
  {
    id: "wf-today",
    to: "/workforce-intelligence",
    label: "Today",
    icon: CheckSquare,
    group: "workforce",
  },
  {
    id: "wf-employees",
    to: "/workforce-intelligence/employees",
    label: "Employees",
    icon: Users,
    group: "workforce",
  },
  {
    id: "wf-roles",
    to: "/workforce-intelligence/roles",
    label: "Roles & KRAs",
    icon: Briefcase,
    group: "workforce",
  },
  {
    id: "wf-capacities",
    to: "/workforce-intelligence/capacities",
    label: "Workload Capacity",
    icon: Layers,
    group: "workforce",
  },
  {
    id: "wf-performance",
    to: "/workforce-intelligence/performance",
    label: "Performance",
    icon: BarChart3,
    group: "workforce",
  },
  {
    id: "wf-owner",
    to: "/workforce-intelligence/owner",
    label: "Owner Intelligence",
    icon: ShieldCheck,
    group: "workforce",
    adminOnly: true,
  },

  // Master Data
  // Human Resources
  { id: "hr", to: "/hr", label: "HR Dashboard", icon: UserCog, group: "humanResources" },
  {
    id: "hr-employees",
    to: "/workforce-intelligence/employees",
    label: "Employees",
    icon: Users,
    group: "humanResources",
  },
  {
    id: "hr-attendance",
    to: "/hr/attendance",
    label: "Attendance",
    icon: Fingerprint,
    group: "humanResources",
  },
  { id: "hr-shifts", to: "/hr/shifts", label: "Shifts", icon: Clock, group: "humanResources" },
  {
    id: "hr-leave",
    to: "/hr/leave",
    label: "Leave Management",
    icon: CalendarDays,
    group: "humanResources",
  },
  {
    id: "hr-salary",
    to: "/hr/salary",
    label: "Salary Structures",
    icon: Wallet,
    group: "humanResources",
  },
  {
    id: "hr-payroll",
    to: "/hr/payroll",
    label: "Payroll",
    icon: Banknote,
    group: "humanResources",
  },
  {
    id: "hr-loans",
    to: "/hr/loans",
    label: "Loans & Claims",
    icon: HandCoins,
    group: "humanResources",
  },
  {
    id: "hr-holidays",
    to: "/hr/holidays",
    label: "Holidays",
    icon: Calendar,
    group: "humanResources",
  },

  {
    id: "hr-branches",
    to: "/hr/branches",
    label: "Offices & Geofences",
    icon: MapPin,
    group: "humanResources",
  },

  { id: "products", to: "/products", label: "Products", icon: PackageSearch, group: "masterData" },
  { id: "vendors", to: "/vendors", label: "Vendors", icon: Factory, group: "masterData" },
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
    id: "messages",
    to: "/messages",
    label: "Notifications Queue",
    icon: Send,
    group: "communication",
  },
  {
    id: "message-templates",
    to: "/message-templates",
    label: "Message Templates",
    icon: Mails,
    group: "communication",
  },
  {
    id: "notification-settings",
    to: "/notification-settings",
    label: "Notification Settings",
    icon: BellRing,
    group: "communication",
  },

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
  { id: "activity", to: "/activity", label: "Activity", icon: Activity, group: "others" },
  { id: "favorites", to: "/favorites", label: "Favorites", icon: Star, group: "others" },
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
