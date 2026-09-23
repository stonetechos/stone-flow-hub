/** Route-derived breadcrumbs. Progressive: hidden on short paths. */
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

type TFunc = ReturnType<typeof useTranslation>["t"];

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  enquiries: "Enquiries",
  followups: "Follow-ups",
  calendar: "Calendar",
  quotes: "Quotations",
  "sales-orders": "Sales Orders",
  "purchase-orders": "Purchase Orders",
  inventory: "Inventory",
  dispatch: "Dispatch",
  invoices: "Invoices",
  payments: "Payments",
  customers: "Customers",
  projects: "Projects",
  vendors: "Vendors",
  products: "Products",
  reports: "Reports",
  settings: "Settings",
  activity: "Activity",
  tasks: "Tasks",
  documents: "Documents",
  notifications: "Notifications",
  favorites: "Favorites",
  communication: "Communication",
  messages: "Notifications Queue",
  "message-templates": "Message Templates",
  "notification-settings": "Notification Settings",
  dashboards: "Role Dashboards",
  "command-center": "Command Center",
  "control-centre": "Control Centre",
  hr: "Human Resources",
  attendance: "Attendance",
  shifts: "Shifts",
  leave: "Leave Management",
  holidays: "Holidays",
  branches: "Offices & Geofences",
  salary: "Salary Structures",
  payroll: "Payroll",
  loans: "Loans & Claims",

  admin: "Admin",
  users: "Users",
  "workforce-intelligence": "Workforce Intelligence",
  employees: "Employees",
  "vendor-payments": "Vendor Payments",
  "money-flow": "Money Flow",
  ledger: "Ledger",
  receipts: "Receipts",
  estimates: "Estimates",
  "business-expenses": "Business Expenses",
  liabilities: "Liabilities",
  "installation-agencies": "Installation Agencies",
  "installation-ledger": "Installation Ledger",
  "agency-payments": "Agency Payments",

  new: "New",
  edit: "Edit",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function label(seg: string, t: TFunc): string {
  if (LABELS[seg]) {
    const raw = LABELS[seg];
    return String(t(`nav.items.${seg}`, String(t(`breadcrumb.${seg}`, String(t(raw, raw))))));
  }
  if (UUID.test(seg)) return seg.slice(0, 8) + "…";
  const formatted = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return String(
    t(`nav.items.${seg}`, String(t(`breadcrumb.${seg}`, String(t(formatted, formatted))))),
  );
}

export function Breadcrumbs() {
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs = parts.map((seg, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: label(seg, t),
    last: i === parts.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 overflow-hidden text-xs text-muted-foreground"
    >
      <Link to="/dashboard" className="flex items-center gap-1 hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          {c.last ? (
            <span className="block truncate text-foreground">{c.label}</span>
          ) : (
            <Link to={c.href} className="block truncate hover:text-foreground">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
