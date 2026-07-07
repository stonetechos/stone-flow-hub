/** Centralized React Query key factories. Single source of truth for cache invalidation. */
export const qk = {
  me: ["me"] as const,
  dashboard: ["dashboard"] as const,

  customers: {
    all: ["customers"] as const,
    list: (q?: string) => ["customers", "list", q ?? ""] as const,
    byId: (id: string) => ["customers", "byId", id] as const,
    picker: (q?: string) => ["customers", "picker", q ?? ""] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (q?: string) => ["projects", "list", q ?? ""] as const,
    byId: (id: string) => ["projects", "byId", id] as const,
    byCustomer: (customerId: string) => ["projects", "byCustomer", customerId] as const,
    picker: (q?: string, customerId?: string | null) =>
      ["projects", "picker", q ?? "", customerId ?? ""] as const,
  },
  vendors: {
    all: ["vendors"] as const,
    list: (q?: string) => ["vendors", "list", q ?? ""] as const,
    byId: (id: string) => ["vendors", "byId", id] as const,
    picker: (q?: string) => ["vendors", "picker", q ?? ""] as const,
  },
  products: {
    all: ["products"] as const,
    list: (q?: string) => ["products", "list", q ?? ""] as const,
    picker: (q?: string) => ["products", "picker", q ?? ""] as const,
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
    byEntity: (entityType: string, entityId: string) =>
      ["followups", "byEntity", entityType, entityId] as const,
  },
  activity: {
    recent: ["activity", "recent"] as const,
    byEntity: (type: string, id: string) => ["activity", type, id] as const,
    global: (filters: Record<string, string | null | undefined>) =>
      ["activity", "global", filters] as const,
  },
  quotes: {
    all: ["quotes"] as const,
    list: (q?: string) => ["quotes", "list", q ?? ""] as const,
    byId: (id: string) => ["quotes", "byId", id] as const,
    byProject: (id: string) => ["quotes", "byProject", id] as const,
    items: (id: string) => ["quotes", "items", id] as const,
  },
  estimates: {
    all: ["estimates"] as const,
    list: (q?: string) => ["estimates", "list", q ?? ""] as const,
    byId: (id: string) => ["estimates", "byId", id] as const,
    items: (id: string) => ["estimates", "items", id] as const,
    components: (id: string) => ["estimates", "components", id] as const,
    schedule: (id: string) => ["estimates", "schedule", id] as const,
    documents: (id: string) => ["estimates", "documents", id] as const,
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
    list: (q?: string, status?: string) =>
      ["purchaseOrders", "list", q ?? "", status ?? ""] as const,
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
  receipts: {
    all: ["receipts"] as const,
    list: (q?: string) => ["receipts", "list", q ?? ""] as const,
    byId: (id: string) => ["receipts", "byId", id] as const,
    byCustomer: (id: string) => ["receipts", "byCustomer", id] as const,
    allocations: (id: string) => ["receipts", "allocations", id] as const,
    openInvoices: (customerId: string) => ["receipts", "openInvoices", customerId] as const,
  },
  customerLedger: {
    byCustomer: (id: string) => ["customer_ledger", id] as const,
    summary: (id: string) => ["customer_ledger", "summary", id] as const,
  },
  messages: {
    all: ["messages"] as const,
    list: (q?: string, channel?: string) => ["messages", "list", q ?? "", channel ?? ""] as const,
    byId: (id: string) => ["messages", "byId", id] as const,
    byEntity: (type: string, id: string) => ["messages", "byEntity", type, id] as const,
    events: (id: string) => ["messages", "events", id] as const,
  },
  messageTemplates: {
    all: ["message_templates"] as const,
    byCode: (code: string) => ["message_templates", "byCode", code] as const,
  },
  appSettings: {
    all: ["app_settings"] as const,
    byKey: (key: string) => ["app_settings", "byKey", key] as const,
  },
  tags: ["tags"] as const,
  productCategories: ["product_categories"] as const,

  tasks: {
    all: ["tasks"] as const,
    list: (filters: Record<string, string | null | undefined>) =>
      ["tasks", "list", filters] as const,
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
    all: (filters: Record<string, string | null | undefined>) =>
      ["documents", "all", filters] as const,
  },
  // Stone-industry masters
  stoneTypes: {
    all: ["stone_types"] as const,
    list: (q?: string) => ["stone_types", "list", q ?? ""] as const,
    picker: (q?: string) => ["stone_types", "picker", q ?? ""] as const,
    byId: (id: string) => ["stone_types", "byId", id] as const,
  },
  surfaceFinishes: {
    all: ["surface_finishes"] as const,
    list: (q?: string) => ["surface_finishes", "list", q ?? ""] as const,
    picker: (q?: string) => ["surface_finishes", "picker", q ?? ""] as const,
    byId: (id: string) => ["surface_finishes", "byId", id] as const,
  },
  edgeFinishes: {
    all: ["edge_finishes"] as const,
    list: (q?: string) => ["edge_finishes", "list", q ?? ""] as const,
    picker: (q?: string) => ["edge_finishes", "picker", q ?? ""] as const,
    byId: (id: string) => ["edge_finishes", "byId", id] as const,
  },
  productFamilies: {
    all: ["product_families"] as const,
    list: (q?: string) => ["product_families", "list", q ?? ""] as const,
    picker: (q?: string) => ["product_families", "picker", q ?? ""] as const,
    byId: (id: string) => ["product_families", "byId", id] as const,
  },
  manufacturingStages: {
    all: ["manufacturing_stages"] as const,
    list: ["manufacturing_stages", "list"] as const,
    byId: (id: string) => ["manufacturing_stages", "byId", id] as const,
  },
  // Manufacturing
  productionOrders: {
    all: ["production_orders"] as const,
    list: (filters?: Record<string, string | null | undefined>) =>
      ["production_orders", "list", filters ?? {}] as const,
    byId: (id: string) => ["production_orders", "byId", id] as const,
    bySalesOrder: (id: string) => ["production_orders", "bySalesOrder", id] as const,
    stages: (id: string) => ["production_orders", "stages", id] as const,
  },
  // Procurement — vendor capabilities
  vendorCapabilities: {
    byVendor: (id: string) => ["vendor_capabilities", id] as const,
  },
  // Slice 4 — Procurement execution
  grns: {
    all: ["grns"] as const,
    list: (q?: string) => ["grns", "list", q ?? ""] as const,
    byId: (id: string) => ["grns", "byId", id] as const,
    items: (grnId: string) => ["grns", "items", grnId] as const,
    inspections: (grnId: string) => ["grns", "inspections", grnId] as const,
  },
  vendorPayments: {
    all: ["vendor_payments"] as const,
    list: (q?: string) => ["vendor_payments", "list", q ?? ""] as const,
    byId: (id: string) => ["vendor_payments", "byId", id] as const,
    byVendor: (id: string) => ["vendor_payments", "byVendor", id] as const,
  },
  inventoryMovements: {
    all: ["inventory_movements"] as const,
    list: (productId?: string | null) =>
      ["inventory_movements", "list", productId ?? ""] as const,
    stockLedger: ["inventory_movements", "stock_ledger"] as const,
  },
  procurementCalendar: (from: string, to: string) =>
    ["procurement_calendar", from, to] as const,
} as const;

