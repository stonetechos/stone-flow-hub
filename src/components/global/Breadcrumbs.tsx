/** Route-derived breadcrumbs. Progressive: hidden on short paths. */
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCustomNavRenames } from "@/lib/nav/custom-renames";

type TFunc = ReturnType<typeof useTranslation>["t"];

const LABELS: Record<string, string> = {
  // 1. Home / Overview
  dashboard: "Dashboard",
  profitability: "Profit Target",
  activity: "Activity",
  tasks: "Tasks",
  calendar: "Calendar",
  favorites: "Favorites",

  // 2. Website CMS
  website: "Website CMS",

  // 3. Items & Materials
  products: "Products",
  inventory: "Inventory",
  masters: "Price Lists & Masters",

  // 4. Sales & CRM (Customers -> Enquiries -> Projects -> Estimates -> Quotes -> Orders -> Invoices -> Dispatch -> Payments)
  customers: "Customers",
  enquiries: "Enquiries",
  followups: "Follow-ups",
  projects: "Projects",
  estimates: "Estimates",
  quotes: "Quotations",
  "sales-orders": "Sales Orders",
  invoices: "Invoices",
  dispatch: "Dispatch",
  payments: "Payments",
  receipts: "Receipts",

  // 5. Purchases & Procurement (Vendors -> RFQs -> POs -> Invoices -> Payments -> Ledger)
  vendors: "Vendors",
  rfqs: "RFQ",
  "purchase-orders": "Purchase Orders",
  "purchase-invoices": "Purchase Invoices",
  "vendor-payments": "Vendor Payments",
  "purchase-ledger": "Suppliers Ledger",

  // 6. Executions & Cartings (Installations -> Teams -> Payments -> Ledger -> Transport)
  installations: "Site Installations",
  "installation-agencies": "Installation Agencies",
  "installation-teams": "Application Partners",
  "agency-payments": "Agency Payments",
  "installation-ledger": "Installation Ledger",
  "purchase-transport": "Transport Partners",

  // 7. HR & Workforce (Employees -> Attendance -> Payroll)
  "workforce-intelligence": "Workforce Intelligence",
  employees: "Employees",
  hr: "Human Resources",
  attendance: "Attendance",
  shifts: "Shifts",
  leave: "Leave Management",
  holidays: "Holidays",
  branches: "Offices & Geofences",
  salary: "Salary Structures",
  payroll: "Payroll",
  loans: "Loans & Claims",

  // 8. Filing & Compliance
  gst: "Pay GST & Filing",

  // 9. Accountant (Ledgers -> Money Flow -> Expenses -> Liabilities -> Cashbook -> Transfers)
  ledger: "Ledger",
  "money-flow": "Money Flow",
  "business-expenses": "Business Expenses",
  liabilities: "Liabilities",
  "ramans-cashbook": "Raman's Cashbook",
  "personal-transfers": "Personal Transfers",

  // 10. Reports
  reports: "Reports",
  dashboards: "Role Dashboards",

  // 11. Documents
  documents: "Documents",

  // 12. Settings & Admin
  communication: "Communication",
  messages: "Notifications Queue",
  notifications: "Notifications",
  "message-templates": "Message Templates",
  "notification-settings": "Notification Settings",
  admin: "Admin",
  users: "Users",
  settings: "Settings",

  // Common Action Suffixes
  new: "New",
  edit: "Edit",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function label(seg: string, t: TFunc, getLabel?: (id: string, fallback: string) => string): string {
  if (LABELS[seg]) {
    const raw = LABELS[seg];
    const defaultText = String(
      t(`nav.items.${seg}`, String(t(`breadcrumb.${seg}`, String(t(raw, raw))))),
    );
    return getLabel ? getLabel(seg, defaultText) : defaultText;
  }
  if (UUID.test(seg)) return seg.slice(0, 8) + "…";
  const formatted = seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const defaultText = String(
    t(`nav.items.${seg}`, String(t(`breadcrumb.${seg}`, String(t(formatted, formatted))))),
  );
  return getLabel ? getLabel(seg, defaultText) : defaultText;
}

export function Breadcrumbs() {
  const { t } = useTranslation();
  const { getLabel } = useCustomNavRenames();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs = parts.map((seg, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: label(seg, t, getLabel),
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
