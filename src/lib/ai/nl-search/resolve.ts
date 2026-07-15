/**
 * Natural Language Search — deterministic intent resolver.
 *
 * Phase G.9B.1. This is the "ERP decides" half of the permanent
 * principle: given a structured `NlStructuredIntent` (produced by the
 * LLM classifier in nl-search.functions.ts and containing no business
 * data itself), this file resolves it into real `NlResultItem[]`
 * exclusively by calling existing, already-authoritative functions —
 * entity list APIs, Insight Providers, or `globalSearch()`. Nothing here
 * issues a new raw query shape; every Supabase call already existed
 * before this phase. Where an existing list API doesn't support a given
 * filter dimension server-side (e.g. `listInvoices()` has no status
 * param), this file applies that filter client-side over the API's own
 * returned rows — still the authoritative data, just filtered in memory
 * instead of in SQL that doesn't exist yet.
 */
import { globalSearch, type SearchHit } from "@/lib/search/api";
import { NAV_ITEMS_BY_ID } from "@/lib/nav/config";
import { listCustomers } from "@/lib/customers/api";
import { listEnquiries } from "@/lib/enquiries/api";
import { listQuotes } from "@/lib/quotes/api";
import { listSalesOrders } from "@/lib/sales-orders/api";
import { listInvoices } from "@/lib/invoices/api";
import { listReceipts } from "@/lib/receipts/api";
import { listDispatches } from "@/lib/dispatch/api";
import { listInstallations } from "@/lib/installation/orders";
import { listPurchaseOrders } from "@/lib/purchase-orders/api";
import { listVendors } from "@/lib/vendors/api";
import { listProducts } from "@/lib/products/api";
import { listInventory } from "@/lib/inventory/api";
import { listProjects } from "@/lib/projects/api";
import { CollectionPriorityProvider } from "@/lib/insights/providers/finance/collectionPriority";
import { PaymentScheduleAdherenceProvider } from "@/lib/insights/providers/finance/paymentScheduleAdherence";
import { InstallationDelayProvider } from "@/lib/insights/providers/operations/installationDelay";
import { InventoryShortageProvider } from "@/lib/insights/providers/operations/inventoryShortage";
import { DispatchRiskProvider } from "@/lib/insights/providers/operations/dispatchRisk";
import type { Insight } from "@/lib/insights/types";
import type { NlEntityType, NlFilters, NlResultItem, NlStructuredIntent } from "./types";

const DAY_MS = 86_400_000;

function inRange(iso: string | null | undefined, from: Date, to: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
}

/** Resolves a `filters.dateRange` bucket to a concrete [from, to) window,
 *  or null for buckets that aren't a forward-looking window ("overdue"
 *  is handled per-entity instead, since "overdue" means something
 *  different for a dispatch than for a project). */
function dateRangeWindow(range: NlFilters["dateRange"]): [Date, Date] | null {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  switch (range) {
    case "today":
      return [startOfToday, new Date(startOfToday.getTime() + DAY_MS)];
    case "this_week": {
      const day = startOfToday.getDay();
      const from = new Date(startOfToday.getTime() - day * DAY_MS);
      return [from, new Date(from.getTime() + 7 * DAY_MS)];
    }
    case "next_week": {
      const day = startOfToday.getDay();
      const from = new Date(startOfToday.getTime() + (7 - day) * DAY_MS);
      return [from, new Date(from.getTime() + 7 * DAY_MS)];
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return [from, to];
    }
    case "next_month": {
      const from = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      return [from, to];
    }
    default:
      return null;
  }
}

function nameMatches(name: string | null | undefined, needle: string | undefined): boolean {
  if (!needle) return true;
  if (!name) return false;
  return name.toLowerCase().includes(needle.toLowerCase());
}

function fromInsight(i: Insight, entityType: NlEntityType): NlResultItem {
  return {
    id: i.entity.id,
    entityType,
    title: i.title,
    subtitle: i.why,
    href: i.action.href,
    rank: 0,
  };
}

/** entityType -> NAV_ITEMS id, for the "navigate" intent and as a
 *  fallback href base. Reuses NAV_ITEMS_BY_ID rather than hardcoding
 *  routes a second time. */
const ENTITY_NAV_ID: Record<NlEntityType, string> = {
  customer: "customers",
  enquiry: "enquiries",
  quote: "quotes",
  sales_order: "sales-orders",
  invoice: "invoices",
  receipt: "receipts",
  dispatch: "dispatch",
  installation: "wf-today", // no dedicated top-level nav id; falls back to search below
  purchase_order: "purchase-orders",
  vendor: "vendors",
  product: "products",
  inventory_item: "inventory",
  project: "projects",
};

async function resolveCustomer(searchText: string | undefined, filters: NlFilters | undefined): Promise<NlResultItem[]> {
  if (filters?.status === "overdue" || filters?.status === "unpaid") {
    const [collection, adherence] = await Promise.all([
      CollectionPriorityProvider.fetch(),
      PaymentScheduleAdherenceProvider.fetch(),
    ]);
    const byCustomer = new Map<string, Insight>();
    for (const i of [...collection, ...adherence]) {
      if (nameMatches(i.entity.label, searchText) || !searchText) byCustomer.set(i.entity.id, i);
    }
    return [...byCustomer.values()].map((i) => fromInsight(i, "customer"));
  }
  const rows = await listCustomers(searchText ?? "");
  return rows
    .filter((c) => nameMatches(c.name, filters?.customerName))
    .map((c) => ({ id: c.id, entityType: "customer" as const, title: c.name, subtitle: c.customer_code, href: `/customers/${c.id}`, rank: 0 }));
}

async function resolveInvoice(searchText: string | undefined, filters: NlFilters | undefined): Promise<NlResultItem[]> {
  const rows = await listInvoices(searchText ?? "");
  const window = dateRangeWindow(filters?.dateRange);
  return rows
    .filter((inv) => {
      if (filters?.status === "unpaid" && !(inv.status !== "cancelled" && Number(inv.balance_due ?? 0) > 0)) return false;
      if (filters?.status === "overdue") {
        const overdue = inv.due_date && new Date(inv.due_date).getTime() < Date.now() && Number(inv.balance_due ?? 0) > 0;
        if (!overdue) return false;
      }
      if (window && !inRange(inv.due_date, window[0], window[1])) return false;
      if (!nameMatches(inv.customer?.name, filters?.customerName)) return false;
      return true;
    })
    .map((inv) => ({
      id: inv.id,
      entityType: "invoice" as const,
      title: inv.invoice_no,
      subtitle: inv.customer?.name ? `${inv.customer.name} · ₹${Number(inv.balance_due ?? 0).toLocaleString("en-IN")} due` : null,
      href: `/invoices/${inv.id}`,
      rank: 0,
    }));
}

async function resolveDispatch(searchText: string | undefined, filters: NlFilters | undefined): Promise<NlResultItem[]> {
  if (filters?.status === "overdue" || filters?.status === "late") {
    const insights = await DispatchRiskProvider.fetch();
    return insights.filter((i) => i.id.includes(":overdue:")).map((i) => fromInsight(i, "dispatch"));
  }
  const statusMap: Record<string, string> = { pending: "planned", planned: "planned", "in transit": "in_transit" };
  const status = filters?.status ? (statusMap[filters.status] ?? "") : "";
  const rows = await listDispatches(searchText ?? "", status);
  const window = dateRangeWindow(filters?.dateRange);
  return rows
    .filter((d) => !window || inRange(d.dispatch_date, window[0], window[1]))
    .map((d) => ({ id: d.id, entityType: "dispatch" as const, title: d.dispatch_no ?? "Dispatch", subtitle: d.status, href: `/dispatch/${d.id}`, rank: 0 }));
}

async function resolveInstallation(searchText: string | undefined, filters: NlFilters | undefined): Promise<NlResultItem[]> {
  if (filters?.status === "late" || filters?.status === "overdue" || filters?.status === "delayed") {
    const insights = await InstallationDelayProvider.fetch();
    return insights.map((i) => fromInsight(i, "installation"));
  }
  const rows = await listInstallations(searchText ?? "", filters?.status ?? "");
  return rows.map((r) => ({ id: r.id, entityType: "installation" as const, title: r.installation_no ?? "Installation", subtitle: r.status, href: `/installations/${r.id}`, rank: 0 }));
}

async function resolveInventory(searchText: string | undefined, filters: NlFilters | undefined): Promise<NlResultItem[]> {
  if (filters?.status === "low_stock" || filters?.status === "shortage" || filters?.status === "low") {
    const insights = await InventoryShortageProvider.fetch();
    return insights
      .filter((i) => !searchText || nameMatches(i.title, searchText) || nameMatches(i.why, searchText))
      .map((i) => fromInsight(i, "inventory_item"));
  }
  const rows = await listInventory(searchText ?? "");
  return rows.map((r) => ({
    id: r.id,
    entityType: "inventory_item" as const,
    title: r.product?.name ?? r.stock_code,
    subtitle: `${r.quantity_on_hand} on hand`,
    href: `/inventory/${r.id}`,
    rank: 0,
  }));
}

async function resolveProject(searchText: string | undefined, filters: NlFilters | undefined): Promise<NlResultItem[]> {
  const rows = await listProjects(searchText ?? "");
  const window = dateRangeWindow(filters?.dateRange);
  return rows
    .filter((p) => {
      if (!window) return true;
      // "starting" queries look at expected_start_date; anything else
      // (or when only one date is populated) falls back to whichever
      // expected date is set, so a project isn't silently dropped.
      const dateToCheck = p.expected_start_date ?? p.expected_completion_date;
      return inRange(dateToCheck, window[0], window[1]);
    })
    .map((p) => ({ id: p.id, entityType: "project" as const, title: p.name, subtitle: p.customer?.name ?? p.city, href: `/projects/${p.id}`, rank: 0 }));
}

async function resolveGeneric(entityType: NlEntityType, searchText: string | undefined): Promise<NlResultItem[]> {
  const q = searchText ?? "";
  switch (entityType) {
    case "enquiry": {
      const rows = await listEnquiries(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.enquiry_no, subtitle: r.customer?.name ?? null, href: `/enquiries/${r.id}`, rank: 0 }));
    }
    case "quote": {
      const rows = await listQuotes(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.quote_no, subtitle: r.customer?.name ?? null, href: `/quotes/${r.id}`, rank: 0 }));
    }
    case "sales_order": {
      const rows = await listSalesOrders(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.so_no, subtitle: r.customer?.name ?? null, href: `/sales-orders/${r.id}`, rank: 0 }));
    }
    case "receipt": {
      const rows = await listReceipts(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.receipt_no, subtitle: r.customer?.name ?? null, href: `/receipts/${r.id}`, rank: 0 }));
    }
    case "purchase_order": {
      const rows = await listPurchaseOrders(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.po_no, subtitle: r.vendor?.company_name ?? null, href: `/purchase-orders/${r.id}`, rank: 0 }));
    }
    case "vendor": {
      const rows = await listVendors(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.company_name, subtitle: r.vendor_code, href: `/vendors/${r.id}`, rank: 0 }));
    }
    case "product": {
      const rows = await listProducts(q);
      return rows.map((r) => ({ id: r.id, entityType, title: r.name, subtitle: r.product_code, href: `/products/${r.id}`, rank: 0 }));
    }
    default:
      return [];
  }
}

/** globalSearch() -> NlResultItem[], scoped to a known entityType when
 *  one was classified. Used for open_record lookups and as the fallback
 *  when no specialized resolver applies. */
function fromSearchHits(hits: SearchHit[], entityType?: NlEntityType): NlResultItem[] {
  const groupToEntity: Partial<Record<SearchHit["group"], NlEntityType>> = {
    customers: "customer",
    projects: "project",
    vendors: "vendor",
    products: "product",
    enquiries: "enquiry",
    quotes: "quote",
    salesOrders: "sales_order",
    purchaseOrders: "purchase_order",
    inventory: "inventory_item",
    invoices: "invoice",
    dispatch: "dispatch",
  };
  return hits
    .map((h) => ({ hit: h, mapped: groupToEntity[h.group] }))
    .filter(({ mapped }) => !entityType || mapped === entityType)
    .map(({ hit, mapped }) => ({
      id: hit.id,
      entityType: mapped ?? "customer",
      title: hit.label,
      subtitle: hit.sublabel,
      href: hit.href,
      rank: 0,
    }));
}

/** The single entry point: structured intent in, real results out. */
export async function resolveIntent(intent: NlStructuredIntent): Promise<NlResultItem[]> {
  if (intent.intent === "navigate" && intent.entityType) {
    const navItem = NAV_ITEMS_BY_ID[ENTITY_NAV_ID[intent.entityType]];
    if (navItem) {
      return [{ id: navItem.id, entityType: intent.entityType, title: navItem.label, subtitle: "Open module", href: navItem.to, rank: 100 }];
    }
  }

  if (intent.intent === "open_record" && intent.identifier) {
    const hits = await globalSearch(intent.identifier);
    return fromSearchHits(hits, intent.entityType);
  }

  if (intent.entityType) {
    switch (intent.entityType) {
      case "customer":
        return resolveCustomer(intent.searchText, intent.filters);
      case "invoice":
        return resolveInvoice(intent.searchText, intent.filters);
      case "dispatch":
        return resolveDispatch(intent.searchText, intent.filters);
      case "installation":
        return resolveInstallation(intent.searchText, intent.filters);
      case "inventory_item":
        return resolveInventory(intent.searchText, intent.filters);
      case "project":
        return resolveProject(intent.searchText, intent.filters);
      default:
        return resolveGeneric(intent.entityType, intent.searchText);
    }
  }

  // No entity type classified — fall back to the general-purpose search
  // every other surface already uses, rather than returning nothing.
  const hits = await globalSearch(intent.searchText ?? intent.identifier ?? "");
  return fromSearchHits(hits);
}
