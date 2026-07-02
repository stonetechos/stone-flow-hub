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
    scope: (scope: "pending" | "today" | "all") => ["followups", "scope", scope] as const,
    byEnquiry: (id: string) => ["followups", "byEnquiry", id] as const,
  },
  activity: {
    recent: ["activity", "recent"] as const,
    byEntity: (type: string, id: string) => ["activity", type, id] as const,
    global: (filters: Record<string, string | null | undefined>) => ["activity", "global", filters] as const,
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
  salesOrders: {
    all: ["salesOrders"] as const,
    list: (q?: string, status?: string) => ["salesOrders", "list", q ?? "", status ?? ""] as const,
    byId: (id: string) => ["salesOrders", "byId", id] as const,
  },
  purchaseOrders: {
    all: ["purchaseOrders"] as const,
    list: (q?: string, status?: string) => ["purchaseOrders", "list", q ?? "", status ?? ""] as const,
    byId: (id: string) => ["purchaseOrders", "byId", id] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    list: (q?: string) => ["inventory", "list", q ?? ""] as const,
    byId: (id: string) => ["inventory", "byId", id] as const,
  },
  dispatch: {
    all: ["dispatch"] as const,
    list: (q?: string, status?: string) => ["dispatch", "list", q ?? "", status ?? ""] as const,
    byId: (id: string) => ["dispatch", "byId", id] as const,
  },
  paymentsAll: {
    all: ["paymentsAll"] as const,
    list: (q?: string) => ["paymentsAll", "list", q ?? ""] as const,
    byId: (id: string) => ["paymentsAll", "byId", id] as const,
  },
  tags: ["tags"] as const,
  productCategories: ["product_categories"] as const,

  tasks: {
    all: ["tasks"] as const,
    list: (filters: Record<string, string | null | undefined>) => ["tasks", "list", filters] as const,
    byEntity: (type: string, id: string) => ["tasks", "byEntity", type, id] as const,
    myOpen: ["tasks", "myOpen"] as const,
  },
  comments: {
    byEntity: (type: string, id: string) => ["comments", type, id] as const,
  },
  favorites: {
    all: ["favorites"] as const,
    byUser: ["favorites", "me"] as const,
    check: (type: string, id: string) => ["favorites", "check", type, id] as const,
  },
  search: {
    global: (q: string) => ["search", "global", q] as const,
  },
  documents: {
    all: (filters: Record<string, string | null | undefined>) => ["documents", "all", filters] as const,
  },
} as const;
