/** Route-derived breadcrumbs. Progressive: hidden on short paths. */
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

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
  new: "New",
  edit: "Edit",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function label(seg: string): string {
  if (LABELS[seg]) return LABELS[seg];
  if (UUID.test(seg)) return seg.slice(0, 8) + "…";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs = parts.map((seg, i) => ({
    href: "/" + parts.slice(0, i + 1).join("/"),
    label: label(seg),
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
