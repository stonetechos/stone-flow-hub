/**
 * Universal Entity Resolver — foundation sprint (2026-07-28).
 *
 * One reusable, typed cross-entity search covering exactly the 12 entity
 * types this sprint named: Customers, Projects, Enquiries, Quotes,
 * Invoices, Sales Orders, RFQs, Vendors, Tasks, Activities, Comments,
 * Documents. Returns a flat array of structured `UniversalEntityResult`s,
 * not per-module ad-hoc shapes.
 *
 * ## Why this doesn't duplicate the two search systems that already exist
 *
 * The codebase already had two independent, overlapping ways to search
 * across modules before this sprint:
 *
 * - `globalSearch()` (`lib/search/api.ts`) — powers the Cmd/Ctrl+K command
 *   palette. Covers 21 groups (9 more than this resolver's 12 — contacts,
 *   salespeople, architects, payments, dispatch, inventory, purchase
 *   orders, products, plus notes/documents/activities), each built from a
 *   raw, inline Supabase query.
 * - `nl-search/resolve.ts` — powers Copilot's Ask mode. Covers a
 *   16-type subset by calling existing module `list*()` functions (never
 *   raw queries directly), plus real business filtering (status, date
 *   ranges, ambiguous-name resolution) for several of them.
 *
 * This resolver is neither of those, and doesn't try to replace either:
 * it's the plain, generic, no-filters "does anything match this text
 * across these types" layer both of the above can be BUILT FROM instead of
 * each re-declaring the same table knowledge a third time. Concretely:
 *
 * - For 9 of the 12 types (customer, project, enquiry, quote, invoice,
 *   sales_order, rfq, vendor, task), this file calls the exact same
 *   `list*()` module API functions `nl-search/resolve.ts` already calls —
 *   no new query logic, just a shared, typed result shape around an
 *   existing, authoritative function.
 * - For the 3 polymorphic types (activity, comment, document), the actual
 *   Supabase queries live in `lib/search/api.ts` (`fetchActivityHits`/
 *   `fetchCommentHits`/`fetchDocumentHits`) — extracted there, in this same
 *   sprint, from what used to be inline-duplicated code inside
 *   `globalSearch()`. This file just adapts those `SearchHit`s to
 *   `UniversalEntityResult`.
 *
 * `nl-search/resolve.ts` now calls into this resolver for its `rfq`,
 * `vendor`, and `task` cases (previously inline duplicates of this same
 * list-and-map shape) and for three brand-new entity types it never
 * supported before this sprint (`comment`, `document`, `activity`) — see
 * that file's own comments. `resolveByEntityType()`'s richer,
 * business-filter-aware resolvers (customer/invoice/dispatch/installation/
 * inventory/project — real status/date-range/ambiguity logic this
 * generic resolver deliberately does not replicate) are unchanged and stay
 * exactly where they are; this resolver is the plain layer underneath
 * them, not a replacement for them.
 *
 * `globalSearch()`'s own remaining 9 groups outside this resolver's scope
 * (contacts, salespeople, architects, payments, dispatch, inventory,
 * purchase orders, products) are NOT migrated to this resolver — they're
 * outside the 12-type list this sprint scoped, and forcing them in would
 * risk the widely-used command palette for no requested benefit. Left as a
 * documented, deliberate gap, not a silent one.
 */
import { listCustomers } from "@/lib/customers/api";
import { listProjects } from "@/lib/projects/api";
import { listEnquiries } from "@/lib/enquiries/api";
import { listQuotes } from "@/lib/quotes/api";
import { listInvoices } from "@/lib/invoices/api";
import { listSalesOrders } from "@/lib/sales-orders/api";
import { listRfqs } from "@/lib/rfqs/api";
import { listVendors } from "@/lib/vendors/api";
import { listTasks } from "@/lib/tasks/api";
import { fetchActivityHits, fetchCommentHits, fetchDocumentHits } from "@/lib/search/api";

export const UNIVERSAL_ENTITY_TYPES = [
  "customer",
  "project",
  "enquiry",
  "quote",
  "invoice",
  "sales_order",
  "rfq",
  "vendor",
  "task",
  "activity",
  "comment",
  "document",
] as const;
export type UniversalEntityType = (typeof UNIVERSAL_ENTITY_TYPES)[number];

/** One structured, typed result. `raw` carries the underlying record for a
 *  caller that needs a field this shape doesn't surface (e.g. a customer_id
 *  to narrow by) — an intentional escape hatch, not a claim that `raw` is
 *  itself validated/typed per entity (a genuinely future, not foundation,
 *  concern — see docs/vie-foundation-sprint-2026-07-28.md). */
export interface UniversalEntityResult {
  type: UniversalEntityType;
  id: string;
  label: string;
  subtitle?: string | null;
  route: string;
  updatedAt?: string | null;
  raw?: unknown;
}

export interface ResolveUniversalEntitiesOptions {
  /** Restrict the search to a subset of types. Defaults to all 12. */
  types?: UniversalEntityType[];
  /** Cap per type, not overall. Defaults to 8 — generous enough for a picker UI, bounded against a pathological query. */
  limitPerType?: number;
}

const DEFAULT_LIMIT_PER_TYPE = 8;

type TypeResolver = (query: string, limit: number) => Promise<UniversalEntityResult[]>;

const RESOLVERS: Record<UniversalEntityType, TypeResolver> = {
  async customer(query, limit) {
    const rows = await listCustomers(query);
    return rows.slice(0, limit).map((r) => ({
      type: "customer",
      id: r.id,
      label: r.name,
      subtitle: r.customer_code,
      route: `/customers/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async project(query, limit) {
    const rows = await listProjects(query);
    return rows.slice(0, limit).map((r) => ({
      type: "project",
      id: r.id,
      label: r.name,
      subtitle: r.customer?.name ?? r.city ?? null,
      route: `/projects/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async enquiry(query, limit) {
    const rows = await listEnquiries(query);
    return rows.slice(0, limit).map((r) => ({
      type: "enquiry",
      id: r.id,
      label: r.enquiry_no,
      subtitle: r.customer?.name ?? null,
      route: `/enquiries/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async quote(query, limit) {
    const rows = await listQuotes(query);
    return rows.slice(0, limit).map((r) => ({
      type: "quote",
      id: r.id,
      label: r.quote_no,
      subtitle: r.customer?.name ?? null,
      route: `/quotes/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async invoice(query, limit) {
    const rows = await listInvoices(query);
    return rows.slice(0, limit).map((r) => ({
      type: "invoice",
      id: r.id,
      label: r.invoice_no,
      subtitle: r.customer?.name ?? null,
      route: `/invoices/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async sales_order(query, limit) {
    const rows = await listSalesOrders(query);
    return rows.slice(0, limit).map((r) => ({
      type: "sales_order",
      id: r.id,
      label: r.so_no,
      subtitle: r.customer?.name ?? null,
      route: `/sales-orders/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async rfq(query, limit) {
    const rows = await listRfqs(query, "");
    return rows.slice(0, limit).map((r) => ({
      type: "rfq",
      id: r.id,
      label: r.rfq_no,
      subtitle: r.project?.name ?? r.enquiry?.enquiry_no ?? null,
      route: `/rfqs/${r.id}`,
      updatedAt: r.created_at,
      raw: r,
    }));
  },
  async vendor(query, limit) {
    const rows = await listVendors(query);
    return rows.slice(0, limit).map((r) => ({
      type: "vendor",
      id: r.id,
      label: r.company_name,
      subtitle: r.vendor_code,
      route: `/vendors/${r.id}`,
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async task(query, limit) {
    const rows = await listTasks({ q: query });
    return rows.slice(0, limit).map((r) => ({
      type: "task",
      id: r.id,
      label: r.title,
      subtitle: r.description,
      // No /tasks/$id detail route exists — same accepted pattern as
      // globalSearch's/nl-search's own "tasks" handling.
      route: "/tasks",
      updatedAt: r.updated_at,
      raw: r,
    }));
  },
  async activity(query, limit) {
    const hits = await fetchActivityHits(query, limit);
    return hits.map((h) => ({
      type: "activity",
      id: h.id,
      label: h.label,
      subtitle: h.sublabel,
      route: h.href,
    }));
  },
  async comment(query, limit) {
    const hits = await fetchCommentHits(query, limit);
    return hits.map((h) => ({
      type: "comment",
      id: h.id,
      label: h.label,
      subtitle: h.sublabel,
      route: h.href,
    }));
  },
  async document(query, limit) {
    const hits = await fetchDocumentHits(query, limit);
    return hits.map((h) => ({
      type: "document",
      id: h.id,
      label: h.label,
      subtitle: h.sublabel,
      route: h.href,
    }));
  },
};

/** Search one specific entity type. Exported so a caller (e.g. Planner
 *  resolvers) that already knows which type it wants doesn't have to pay
 *  for the other 11 parallel queries `resolveUniversalEntities()` runs. */
export async function resolveUniversalEntitiesByType(
  type: UniversalEntityType,
  query: string,
  limit = DEFAULT_LIMIT_PER_TYPE,
): Promise<UniversalEntityResult[]> {
  try {
    return await RESOLVERS[type](query, limit);
  } catch {
    // Isolated per type, same discipline as globalSearch()'s safe() helper
    // — one table erroring (a transient RLS/network issue) never takes
    // down every other type's results.
    return [];
  }
}

/**
 * Search across every requested type (default: all 12) in parallel.
 * Returns a flat array — callers that want it grouped by type can
 * `.filter()`/group client-side; keeping this flat avoids baking in a
 * grouping/ordering opinion the various callers (a picker UI, a Planner
 * resolver, Copilot) don't all share.
 */
export async function resolveUniversalEntities(
  query: string,
  options: ResolveUniversalEntitiesOptions = {},
): Promise<UniversalEntityResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const types = options.types ?? [...UNIVERSAL_ENTITY_TYPES];
  const limit = options.limitPerType ?? DEFAULT_LIMIT_PER_TYPE;
  const results = await Promise.all(
    types.map((type) => resolveUniversalEntitiesByType(type, trimmed, limit)),
  );
  return results.flat();
}
