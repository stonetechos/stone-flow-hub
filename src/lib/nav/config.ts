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
  Banknote,
  HandCoins,
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
  | "purchase"
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

// Order here is the sidebar's group order. Sales / Purchase / Payroll /
// Workforce Intelligence are pinned at the top per the 2026-09-04 Purchase
// module restructure (see project doc
// engineering/purchase-module-and-sidebar-restructure-plan-2026-09-04.md) —
// everything else keeps its previous relative order below them.
export const NAV_GROUPS: ReadonlyArray<NavGroupDef> = [
  { id: "sales", label: "Sales" },
  { id: "purchase", label: "Purchase" },
  { id: "payroll", label: "Payroll" },
  { id: "workforce", label: "Workforce Intelligence" },
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
  // Was "Receipts & Ledger" — relabelled to pair with the new "Purchase
  // Ledger" below. Same page/route, label only.
  { id: "receipts", to: "/receipts", label: "Sales Ledger", icon: Wallet, group: "sales" },
  // Moved here from "operations": this is the outbound-to-customer delivery
  // tracking (carting agency/driver, partial dispatch, pending-delivery
  // balance) — sales-facing, not purchase-facing. See the restructure plan
  // doc for the reasoning; flagged for confirmation, not a literal instruction.
  { id: "dispatch", to: "/dispatch", label: "Dispatch", icon: Truck, group: "sales" },
  { id: "followups", to: "/followups", label: "Follow-ups", icon: CalendarClock, group: "sales" },
  { id: "tasks", to: "/tasks", label: "Tasks", icon: CheckSquare, group: "sales" },
  { id: "calendar", to: "/calendar", label: "Calendar", icon: Calendar, group: "sales" },

  // Purchase (was "Operations" — Manufacturing / Slab Register / Stock
  // Movements removed entirely per the 2026-09-04 restructure, not just
  // unlinked; see the plan doc's "Purchase scope" decision)
  {
    id: "vendors",
    to: "/vendors",
    label: "Vendors",
    icon: Factory,
    group: "purchase",
  },
  {
    id: "purchase-orders",
    to: "/purchase-orders",
    label: "Purchase Orders",
    icon: ClipboardCheck,
    group: "purchase",
  },
  // Moved here from "sales": the whole vendor-negotiation/approval workflow
  // this drives is procurement, not sales. Flagged for confirmation in the
  // plan doc, not a literal instruction.
  { id: "rfqs", to: "/rfqs", label: "RFQs", icon: Send, group: "purchase" },
  { id: "inventory", to: "/inventory", label: "Inventory", icon: Warehouse, group: "purchase" },
  // New — placeholder route/page not yet built (task #38/#39/#40/#41 in
  // this session's tracker). Left commented until the page exists so the
  // sidebar never links to a 404.
  // { id: "purchase-invoices", to: "/purchase-invoices", label: "Purchase Invoices", icon: Receipt, group: "purchase" },
  // { id: "purchase-payments", to: "/purchase-payments", label: "Purchase Payments", icon: Wallet, group: "purchase" },
  // { id: "purchase-ledger", to: "/purchase-ledger", label: "Purchase Ledger", icon: Wallet, group: "purchase" },
  // { id: "purchase-transport", to: "/purchase-transport", label: "Purchase Transportation", icon: Truck, group: "purchase" },
  // { id: "vendor-quality", to: "/vendors/quality-issues", label: "Quality & Breakage", icon: AlertTriangle, group: "purchase" },
  // { id: "vendor-scorecard", to: "/vendors/scorecard", label: "Vendor Scorecard", icon: Gauge, group: "purchase" },

  // Payroll (was "Human Resources" — same items, renamed group only)
  { id: "hr", to: "/hr", label: "HR Dashboard", icon: UserCog, group: "payroll" },
  {
    id: "hr-employees",
    to: "/workforce-intelligence/employees",
    label: "Employees",
    icon: Users,
    group: "payroll",
  },
  {
    id: "hr-attendance",
    to: "/hr/attendance",
    label: "Attendance",
    icon: Fingerprint,
    group: "payroll",
  },
  { id: "hr-shifts", to: "/hr/shifts", label: "Shifts", icon: Clock, group: "payroll" },
  {
    id: "hr-leave",
    to: "/hr/leave",
    label: "Leave Management",
    icon: CalendarDays,
    group: "payroll",
  },
  {
    id: "hr-salary",
    to: "/hr/salary",
    label: "Salary Structures",
    icon: Wallet,
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
    id: "hr-loans",
    to: "/hr/loans",
    label: "Loans & Claims",
    icon: HandCoins,
    group: "payroll",
  },
  {
    id: "hr-holidays",
    to: "/hr/holidays",
    label: "Holidays",
    icon: Calendar,
    group: "payroll",
  },
  {
    id: "hr-branches",
    to: "/hr/branches",
    label: "Offices & Geofences",
    icon: MapPin,
    group: "payroll",
  },

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
