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
  tags: ["tags"] as const,
  productCategories: ["product_categories"] as const,
} as const;
