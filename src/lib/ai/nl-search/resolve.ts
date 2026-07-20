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
import type { TimelineScope } from "@/lib/timeline/types";

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

/** A specific RECORD's own detail-page URL segment — a different concern
 *  from ENTITY_NAV_ID above (which answers "what module/dashboard does
 *  this entity type live under" for the navigate intent, e.g.
 *  installation -> the wf-today dashboard, since there's no dedicated
 *  top-level Installations nav item). Bug found in a Phase G.10 re-audit:
 *  resolveTimelineIntent()'s page-context branch was reusing
 *  ENTITY_NAV_ID to build a record's own href, which produced the
 *  non-existent route "/wf-today/<id>" for installations instead of the
 *  real "/installations/<id>". Every other entity type's detail path
 *  segment happens to equal its nav id, so this was the only one
 *  actually broken — fixed here with its own correct, dedicated map. */
const ENTITY_DETAIL_PATH: Record<NlEntityType, string> = {
  ...ENTITY_NAV_ID,
  installation: "installations",
};

async function resolveCustomer(
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
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

  // A query naming one specific person ("give me updates about Shiv",
  // "find customer Shiv Solanki") must resolve the same way regardless
  // of which intent the classifier filed it under. resolveTimelineIntent()
  // already does this via resolveByName()/ambiguousMatchResults() for the
  // five timeline-style intents (timeline_summary, recent_activity,
  // show_related, explain_status, summarize_record) — but a query the
  // classifier instead calls "search" or "filter" (still entityType
  // "customer", still filters.customerName set) used to fall through to
  // the flat list below, which fetched only the 200 most-recently-created
  // customers unfiltered and client-side-matched them, and — unlike
  // resolveTimelineIntent() — never disambiguated when more than one
  // customer shared the name. Routing the named-customer case through the
  // same resolveByName() logic here closes that gap: "give me updates
  // about Shiv" now asks which Shiv (or resolves confidently to one) no
  // matter how the classifier categorized the question, and the lookup
  // is a real server-side name search instead of a capped unfiltered scan.
  if (filters?.customerName) {
    const rows = await listCustomers(filters.customerName);
    const resolution = resolveByName(rows, filters.customerName, (r) => r.name);
    if (resolution.kind === "ambiguous") {
      return ambiguousMatchResults(resolution.rows, "customer", (r) => ({
        id: r.id,
        title: r.name,
        subtitle: [r.customer_code, r.city].filter(Boolean).join(" · ") || null,
        href: `/customers/${r.id}`,
      }));
    }
    if (resolution.kind === "one") {
      const c = resolution.row;
      return [
        {
          id: c.id,
          entityType: "customer" as const,
          title: c.name,
          subtitle: c.customer_code,
          href: `/customers/${c.id}`,
          rank: 0,
          updatedAt: c.updated_at,
          isActive: c.is_active,
        },
      ];
    }
    return [];
  }

  const rows = await listCustomers(searchText ?? "");
  return rows
    .filter((c) => nameMatches(c.name, filters?.customerName))
    .map((c) => ({
      id: c.id,
      entityType: "customer" as const,
      title: c.name,
      subtitle: c.customer_code,
      href: `/customers/${c.id}`,
      rank: 0,
      updatedAt: c.updated_at,
      isActive: c.is_active,
    }));
}

async function resolveInvoice(
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
  const rows = await listInvoices(searchText ?? "");
  const window = dateRangeWindow(filters?.dateRange);
  return rows
    .filter((inv) => {
      if (
        filters?.status === "unpaid" &&
        !(inv.status !== "cancelled" && Number(inv.balance_due ?? 0) > 0)
      )
        return false;
      if (filters?.status === "overdue") {
        const overdue =
          inv.due_date &&
          new Date(inv.due_date).getTime() < Date.now() &&
          Number(inv.balance_due ?? 0) > 0;
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
      subtitle: inv.customer?.name
        ? `${inv.customer.name} · ₹${Number(inv.balance_due ?? 0).toLocaleString("en-IN")} due`
        : null,
      href: `/invoices/${inv.id}`,
      rank: 0,
      updatedAt: inv.updated_at,
      isActive: inv.status !== "cancelled",
    }));
}

async function resolveDispatch(
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
  if (filters?.status === "overdue" || filters?.status === "late") {
    const insights = await DispatchRiskProvider.fetch();
    return insights
      .filter((i) => i.id.includes(":overdue:"))
      .map((i) => fromInsight(i, "dispatch"));
  }
  const statusMap: Record<string, string> = {
    pending: "planned",
    planned: "planned",
    "in transit": "in_transit",
  };
  const status = filters?.status ? (statusMap[filters.status] ?? "") : "";
  const rows = await listDispatches(searchText ?? "", status);
  const window = dateRangeWindow(filters?.dateRange);
  return rows
    .filter((d) => !window || inRange(d.dispatch_date, window[0], window[1]))
    .map((d) => ({
      id: d.id,
      entityType: "dispatch" as const,
      title: d.dispatch_no ?? "Dispatch",
      subtitle: d.status,
      href: `/dispatch/${d.id}`,
      rank: 0,
      updatedAt: d.updated_at,
    }));
}

async function resolveInstallation(
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
  if (
    filters?.status === "late" ||
    filters?.status === "overdue" ||
    filters?.status === "delayed"
  ) {
    const insights = await InstallationDelayProvider.fetch();
    return insights.map((i) => fromInsight(i, "installation"));
  }
  // Phase G.8.9/G.9B.1 re-audit (Task B2): "Pending installations" is one
  // of the phase's own example queries, but INSTALLATION_ORDER_STATUSES
  // has no literal "pending" value — listInstallations()'s native .eq()
  // filter would silently return zero rows. Map loose words to the real
  // enum the same way resolveDispatch already does, instead of passing
  // the LLM's word straight through to a strict-equality DB filter.
  const statusMap: Record<string, string> = {
    pending: "planned",
    upcoming: "planned",
    planned: "planned",
    scheduled: "scheduled",
    ongoing: "in_progress",
    in_progress: "in_progress",
    "in progress": "in_progress",
    on_hold: "on_hold",
    "on hold": "on_hold",
    paused: "on_hold",
    completed: "completed",
    done: "completed",
    signed_off: "signed_off",
    cancelled: "cancelled",
  };
  const status = filters?.status ? (statusMap[filters.status] ?? "") : "";
  const rows = await listInstallations(searchText ?? "", status);
  return rows.map((r) => ({
    id: r.id,
    entityType: "installation" as const,
    title: r.installation_no ?? "Installation",
    subtitle: r.status,
    href: `/installations/${r.id}`,
    rank: 0,
    updatedAt: r.updated_at,
    isActive: !["completed", "signed_off", "cancelled"].includes(r.status),
  }));
}

async function resolveInventory(
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
  if (
    filters?.status === "low_stock" ||
    filters?.status === "shortage" ||
    filters?.status === "low"
  ) {
    const insights = await InventoryShortageProvider.fetch();
    return insights
      .filter(
        (i) => !searchText || nameMatches(i.title, searchText) || nameMatches(i.why, searchText),
      )
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
    updatedAt: r.updated_at,
  }));
}

async function resolveProject(
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
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
    .map((p) => ({
      id: p.id,
      entityType: "project" as const,
      title: p.name,
      subtitle: p.customer?.name ?? p.city,
      href: `/projects/${p.id}`,
      rank: 0,
      updatedAt: p.updated_at,
      isActive: p.is_active,
    }));
}

/** Entity types below that carry a `customer` relationship on their own
 *  rows — used by resolveGeneric() to decide when a named customer must
 *  narrow the result set (see the `filters?.customerName` block there). */
const CUSTOMER_SCOPED_ENTITY_TYPES = new Set<NlEntityType>([
  "enquiry",
  "quote",
  "sales_order",
  "receipt",
]);

async function resolveGeneric(
  entityType: NlEntityType,
  searchText: string | undefined,
  filters?: NlFilters,
): Promise<NlResultItem[]> {
  const q = searchText ?? "";

  // Bug found in a Phase RC-4 live audit: a query naming a specific
  // customer but asking about one of THEIR records ("Show me Darshan
  // Shah's enquiry status") used to ignore filters.customerName entirely
  // here, returning whatever listEnquiries(q) came back with — an
  // unfiltered, unrelated set of enquiries (Sunny Gandhi's, Shiv
  // Solanki's) with no connection to the customer actually asked about.
  // Resolved the same deterministic, exact-match-first way
  // resolveCustomer()/resolveTimelineIntent() already resolve a named
  // customer — ambiguous names surface every candidate as its own card
  // instead of guessing, exactly one confident match narrows the list
  // below, and no match returns nothing rather than an unrelated list.
  let customerFilter: { id: string } | null = null;
  if (filters?.customerName && CUSTOMER_SCOPED_ENTITY_TYPES.has(entityType)) {
    const customers = await listCustomers(filters.customerName);
    const resolution = resolveByName(customers, filters.customerName, (r) => r.name);
    if (resolution.kind === "ambiguous") {
      return ambiguousMatchResults(resolution.rows, "customer", (r) => ({
        id: r.id,
        title: r.name,
        subtitle: [r.customer_code, r.city].filter(Boolean).join(" · ") || null,
        href: `/customers/${r.id}`,
      }));
    }
    if (resolution.kind === "none") return [];
    customerFilter = { id: resolution.row.id };
  }

  switch (entityType) {
    case "enquiry": {
      const rows = await listEnquiries(q);
      const filtered = customerFilter
        ? rows.filter((r) => r.customer?.id === customerFilter!.id)
        : rows;
      return filtered.map((r) => ({
        id: r.id,
        entityType,
        title: r.enquiry_no,
        subtitle: r.customer?.name ?? null,
        href: `/enquiries/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
      }));
    }
    case "quote": {
      const rows = await listQuotes(q);
      const filtered = customerFilter
        ? rows.filter((r) => r.customer?.id === customerFilter!.id)
        : rows;
      return filtered.map((r) => ({
        id: r.id,
        entityType,
        title: r.quote_no,
        subtitle: r.customer?.name ?? null,
        href: `/quotes/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
      }));
    }
    case "sales_order": {
      const rows = await listSalesOrders(q);
      const filtered = customerFilter
        ? rows.filter((r) => r.customer?.id === customerFilter!.id)
        : rows;
      return filtered.map((r) => ({
        id: r.id,
        entityType,
        title: r.so_no,
        subtitle: r.customer?.name ?? null,
        href: `/sales-orders/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
      }));
    }
    case "receipt": {
      const rows = await listReceipts(q);
      const filtered = customerFilter
        ? rows.filter((r) => r.customer?.id === customerFilter!.id)
        : rows;
      return filtered.map((r) => ({
        id: r.id,
        entityType,
        title: r.receipt_no,
        subtitle: r.customer?.name ?? null,
        href: `/receipts/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
      }));
    }
    case "purchase_order": {
      const rows = await listPurchaseOrders(q);
      return rows.map((r) => ({
        id: r.id,
        entityType,
        title: r.po_no,
        subtitle: r.vendor?.company_name ?? null,
        href: `/purchase-orders/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
      }));
    }
    case "vendor": {
      const rows = await listVendors(q);
      return rows.map((r) => ({
        id: r.id,
        entityType,
        title: r.company_name,
        subtitle: r.vendor_code,
        href: `/vendors/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
        isActive: r.is_active,
      }));
    }
    case "product": {
      const rows = await listProducts(q);
      return rows.map((r) => ({
        id: r.id,
        entityType,
        title: r.name,
        subtitle: r.product_code,
        href: `/products/${r.id}`,
        rank: 0,
        updatedAt: r.updated_at,
        isActive: r.is_active,
      }));
    }
    default:
      return [];
  }
}

/** SearchHit group -> NlEntityType, reused by both fromSearchHits() (the
 *  open_record/fallback resolver) and resolveTimelineIntent() (Phase
 *  G.10) so there is exactly one group/entity mapping, not two. */
const SEARCH_GROUP_TO_ENTITY: Partial<Record<SearchHit["group"], NlEntityType>> = {
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

/** globalSearch() -> NlResultItem[], scoped to a known entityType when
 *  one was classified. Used for open_record lookups and as the fallback
 *  when no specialized resolver applies. */
function fromSearchHits(hits: SearchHit[], entityType?: NlEntityType): NlResultItem[] {
  return hits
    .map((h) => ({ hit: h, mapped: SEARCH_GROUP_TO_ENTITY[h.group] }))
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

/** Per-entity-type dispatch, factored out of resolveIntent() so
 *  resolveTimelineIntent() (Phase G.10) can fall back to the exact same
 *  per-entity resolver when it can't confidently resolve one specific
 *  record — one dispatch table, reused, not two. */
async function resolveByEntityType(
  entityType: NlEntityType,
  searchText: string | undefined,
  filters: NlFilters | undefined,
): Promise<NlResultItem[]> {
  switch (entityType) {
    case "customer":
      return resolveCustomer(searchText, filters);
    case "invoice":
      return resolveInvoice(searchText, filters);
    case "dispatch":
      return resolveDispatch(searchText, filters);
    case "installation":
      return resolveInstallation(searchText, filters);
    case "inventory_item":
      return resolveInventory(searchText, filters);
    case "project":
      return resolveProject(searchText, filters);
    default:
      return resolveGeneric(entityType, searchText, filters);
  }
}

type NameResolution<T> =
  | { kind: "one"; row: T }
  | { kind: "ambiguous"; rows: T[] }
  | { kind: "none" };

/** Resolves the single specific record a timeline question is about —
 *  and, per user feedback, never silently guesses across a genuinely
 *  ambiguous set the way an earlier version of this function did
 *  ("shiv" matching both a Shiv Solanki and a Shiv Nader used to just
 *  pick whichever the search API listed first). Now: an exact
 *  case-insensitive name match is always confident. With no exact match,
 *  a single remaining row is still confident (only one real candidate).
 *  Two or more remaining rows with no exact match is genuinely
 *  ambiguous — the caller renders every candidate as its own card so
 *  the user picks, instead of resolve.ts guessing on their behalf. */
export function resolveByName<T>(
  rows: T[],
  needle: string | undefined,
  getName: (r: T) => string,
): NameResolution<T> {
  if (rows.length === 0) return { kind: "none" };
  if (!needle)
    return rows.length === 1 ? { kind: "one", row: rows[0] } : { kind: "ambiguous", rows };
  const lower = needle.toLowerCase();
  const exact = rows.filter((r) => getName(r).toLowerCase() === lower);
  if (exact.length === 1) return { kind: "one", row: exact[0] };
  if (exact.length > 1) return { kind: "ambiguous", rows: exact };
  if (rows.length === 1) return { kind: "one", row: rows[0] };
  return { kind: "ambiguous", rows };
}

/** Turns an ambiguous name match into result cards instead of a guess —
 *  the same NlResultItem card list every other NL Search answer already
 *  renders, so no new UI is needed: the user just taps the record they
 *  meant. rank is uniform (0) since none of these candidates is "more
 *  right" than another; ranking by confidence would defeat the point of
 *  asking. */
function ambiguousMatchResults<T>(
  rows: T[],
  entityType: NlEntityType,
  toCard: (row: T) => { id: string; title: string; subtitle: string | null; href: string },
): NlResultItem[] {
  return rows.slice(0, 8).map((row) => {
    const card = toCard(row);
    return {
      id: card.id,
      entityType,
      title: card.title,
      subtitle: card.subtitle,
      href: card.href,
      rank: 0,
    };
  });
}

/** Phase G.10 — resolves "timeline_summary" / "recent_activity" /
 *  "show_related" / "explain_status" / "summarize_record" intents into
 *  real Business Timeline events for ONE specific record, rendered as
 *  chronological cards (never a second free-text AI call — the events
 *  themselves ARE the answer, so nothing can be invented). Customer,
 *  project and vendor scopes reuse the rich multi-source aggregators
 *  (getCustomerTimeline/getProjectTimeline/getVendorTimeline via
 *  getBusinessTimeline); any other named record (a quote number, an
 *  invoice number, ...) reuses the generic single-entity fallback. If no
 *  single record can be confidently resolved, this degrades to the
 *  entity's normal list/search resolver rather than guessing which
 *  record the user meant. */
async function resolveTimelineIntent(
  intent: NlStructuredIntent,
  pageContext?: { entity?: string; entityId?: string },
): Promise<NlResultItem[]> {
  // The classifier sometimes puts a name straight into filters.customerName
  // without also setting entityType (e.g. "give me all updates about
  // shiv" — the LLM correctly hears a person's name but doesn't commit to
  // a record type). A bare person name in this app is overwhelmingly a
  // customer, so that's the one default resolve.ts fills in — everything
  // else about "who this is" still comes from real data below, never
  // invented.
  const entityType = intent.entityType ?? (intent.filters?.customerName ? "customer" : undefined);
  if (!entityType) return [];
  const nameNeedle = intent.filters?.customerName ?? intent.searchText;

  let scope: TimelineScope | null = null;
  let entityHref = "";
  let entityLabel = entityType.replace(/_/g, " ");

  // "this customer" / "show every interaction before I call this
  // customer" name nothing — they mean whichever record the user is
  // currently looking at. The client sends that as page context (the
  // same {entity, entityId} Copilot's own chat already uses), never
  // something the LLM inferred, so this is exact, not a guess.
  if (
    !nameNeedle &&
    !intent.identifier &&
    pageContext?.entityId &&
    pageContext.entity === entityType
  ) {
    scope =
      entityType === "customer"
        ? { customerId: pageContext.entityId }
        : entityType === "project"
          ? { projectId: pageContext.entityId }
          : entityType === "vendor"
            ? { vendorId: pageContext.entityId }
            : { entityType, entityId: pageContext.entityId };
    entityHref = `/${ENTITY_DETAIL_PATH[entityType] ?? entityType}/${pageContext.entityId}`;
    entityLabel = "this " + entityType.replace(/_/g, " ");
  } else if (entityType === "customer") {
    const rows = await listCustomers(nameNeedle ?? "");
    const resolution = resolveByName(rows, nameNeedle, (r) => r.name);
    if (resolution.kind === "ambiguous") {
      return ambiguousMatchResults(resolution.rows, "customer", (r) => ({
        id: r.id,
        title: r.name,
        subtitle: [r.customer_code, r.city].filter(Boolean).join(" · ") || null,
        href: `/customers/${r.id}`,
      }));
    }
    if (resolution.kind === "one") {
      scope = { customerId: resolution.row.id };
      entityHref = `/customers/${resolution.row.id}`;
      entityLabel = resolution.row.name;
    }
  } else if (entityType === "project") {
    const rows = await listProjects(nameNeedle ?? "");
    const resolution = resolveByName(rows, nameNeedle, (r) => r.name);
    if (resolution.kind === "ambiguous") {
      return ambiguousMatchResults(resolution.rows, "project", (r) => ({
        id: r.id,
        title: r.name,
        subtitle: r.customer?.name ?? r.city ?? null,
        href: `/projects/${r.id}`,
      }));
    }
    if (resolution.kind === "one") {
      scope = { projectId: resolution.row.id };
      entityHref = `/projects/${resolution.row.id}`;
      entityLabel = resolution.row.name;
    }
  } else if (entityType === "vendor") {
    const rows = await listVendors(nameNeedle ?? "");
    const resolution = resolveByName(rows, nameNeedle, (r) => r.company_name);
    if (resolution.kind === "ambiguous") {
      return ambiguousMatchResults(resolution.rows, "vendor", (r) => ({
        id: r.id,
        title: r.company_name,
        subtitle: r.vendor_code ?? null,
        href: `/vendors/${r.id}`,
      }));
    }
    if (resolution.kind === "one") {
      scope = { vendorId: resolution.row.id };
      entityHref = `/vendors/${resolution.row.id}`;
      entityLabel = resolution.row.company_name;
    }
  } else if (intent.identifier) {
    // A specific document number (e.g. "QUO-000050") — resolve it the
    // same way the open_record intent already does.
    const hits = await globalSearch(intent.identifier);
    const hit = hits.find((h) => SEARCH_GROUP_TO_ENTITY[h.group] === entityType) ?? hits[0];
    if (hit) {
      scope = { entityType, entityId: hit.id };
      entityHref = hit.href;
      entityLabel = hit.label;
    }
  }

  if (!scope) return resolveByEntityType(entityType, intent.searchText, intent.filters);

  const { getBusinessTimeline } = await import("@/lib/timeline/api");
  const events = await getBusinessTimeline(scope);

  const sinceDays = intent.filters?.sinceDays;
  const cutoff = sinceDays ? Date.now() - sinceDays * DAY_MS : null;
  const filtered = cutoff ? events.filter((e) => new Date(e.at).getTime() >= cutoff) : events;

  if (filtered.length === 0) {
    return [
      {
        id: `timeline-empty:${entityHref}`,
        entityType,
        title: `No recorded history for ${entityLabel}`,
        subtitle: sinceDays
          ? `in the last ${sinceDays} days`
          : "activity will appear here once it happens",
        href: entityHref,
        rank: 100,
      },
    ];
  }

  return filtered.slice(0, 20).map((ev, idx) => ({
    id: ev.id,
    entityType,
    title: ev.title,
    subtitle: `${new Date(ev.at).toLocaleDateString("en-IN")}${ev.detail ? ` · ${ev.detail}` : ev.status ? ` · ${ev.status}` : ""}`,
    href: ev.route ?? entityHref,
    // Descending rank preserves the timeline's own chronological order
    // through rank.ts's sort. Spaced 1000 apart — comfortably wider than
    // the largest possible combination of rank.ts's additive boosts
    // (favorite + active + recency + text-match, well under 1000) — so
    // no boost can ever reorder events out of chronological sequence.
    rank: 100_000 - idx * 1000,
    updatedAt: ev.at,
  }));
}

/** The single entry point: structured intent in, real results out.
 *  `pageContext` (Phase G.10) is the client's current page — the same
 *  {entity, entityId} askCopilot already receives — used only to resolve
 *  "this customer"/"this project" style references, never sent to or
 *  produced by the LLM. */
export async function resolveIntent(
  intent: NlStructuredIntent,
  pageContext?: { entity?: string; entityId?: string },
): Promise<NlResultItem[]> {
  if (intent.intent === "navigate" && intent.entityType) {
    const navItem = NAV_ITEMS_BY_ID[ENTITY_NAV_ID[intent.entityType]];
    if (navItem) {
      return [
        {
          id: navItem.id,
          entityType: intent.entityType,
          title: navItem.label,
          subtitle: "Open module",
          href: navItem.to,
          rank: 100,
        },
      ];
    }
  }

  if (intent.intent === "open_record" && intent.identifier) {
    const hits = await globalSearch(intent.identifier);
    return fromSearchHits(hits, intent.entityType);
  }

  // Phase G.10: "what happened with X", "why is X still pending", "show
  // every interaction before I call this customer", "summarize this
  // project's history" — all five ask about ONE record's real history,
  // not a filtered list. Answered from the shared Business Timeline
  // engine (lib/timeline/api.ts), never a second LLM call, so the answer
  // can only ever contain events that actually happened. Entered even
  // when the classifier only set filters.customerName and left
  // entityType unset (a bare person's name) — resolveTimelineIntent()
  // itself defaults that case to "customer".
  if (
    (intent.entityType || intent.filters?.customerName) &&
    (intent.intent === "timeline_summary" ||
      intent.intent === "recent_activity" ||
      intent.intent === "show_related" ||
      intent.intent === "explain_status" ||
      intent.intent === "summarize_record")
  ) {
    return resolveTimelineIntent(intent, pageContext);
  }

  if (intent.entityType) {
    return resolveByEntityType(intent.entityType, intent.searchText, intent.filters);
  }

  // No entity type classified — fall back to the general-purpose search
  // every other surface already uses, rather than returning nothing.
  // Phase G.10 fix: a name the classifier filed under filters.customerName
  // (rather than searchText) used to be silently dropped here, searching
  // "" and always coming back empty even when the record existed — this
  // is what produced "no matching records" for a query as simple as
  // "give me all updates about shiv" when the classifier didn't also set
  // entityType. customerName is now a real fallback search term too.
  const hits = await globalSearch(
    intent.searchText ?? intent.filters?.customerName ?? intent.identifier ?? "",
  );
  return fromSearchHits(hits);
}
