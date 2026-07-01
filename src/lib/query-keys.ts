/** Centralized React Query key factories. Single source of truth for cache invalidation. */
export const qk = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,

  customers: {
    all: ["customers"] as const,
    list: (q?: string) => ["customers", "list", q ?? ""] as const,
    byId: (id: string) => ["customers", "byId", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (q?: string) => ["projects", "list", q ?? ""] as const,
    byId: (id: string) => ["projects", "byId", id] as const,
    byCustomer: (customerId: string) => ["projects", "byCustomer", customerId] as const,
  },
  vendors: {
    all: ["vendors"] as const,
    list: (q?: string) => ["vendors", "list", q ?? ""] as const,
    byId: (id: string) => ["vendors", "byId", id] as const,
  },
  products: {
    all: ["products"] as const,
    list: (q?: string) => ["products", "list", q ?? ""] as const,
  },
  enquiries: {
    all: ["enquiries"] as const,
    list: (q?: string) => ["enquiries", "list", q ?? ""] as const,
    byId: (id: string) => ["enquiries", "byId", id] as const,
    pipeline: ["enquiries", "pipeline"] as const,
  },
  rfqs: {
    all: ["rfqs"] as const,
    byEnquiry: (enquiryId: string) => ["rfqs", "byEnquiry", enquiryId] as const,
  },
  followups: {
    all: ["followups"] as const,
    today: ["followups", "today"] as const,
    byEntity: (type: string, id: string) => ["followups", type, id] as const,
  },
  activity: {
    byEntity: (type: string, id: string) => ["activity", type, id] as const,
  },
  quotes: {
    all: ["quotes"] as const,
    list: (q?: string) => ["quotes", "list", q ?? ""] as const,
    byId: (id: string) => ["quotes", "byId", id] as const,
    byProject: (id: string) => ["quotes", "byProject", id] as const,
    items: (id: string) => ["quotes", "items", id] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    list: (q?: string) => ["invoices", "list", q ?? ""] as const,
    byId: (id: string) => ["invoices", "byId", id] as const,
    byProject: (id: string) => ["invoices", "byProject", id] as const,
    items: (id: string) => ["invoices", "items", id] as const,
    payments: (id: string) => ["invoices", "payments", id] as const,
    links: (id: string) => ["invoices", "links", id] as const,
  },
  tags: ["tags"] as const,
  productCategories: ["product_categories"] as const,
} as const;
