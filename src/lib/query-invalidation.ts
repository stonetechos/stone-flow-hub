/**
 * Centralized cache invalidation helpers.
 *
 * Every mutation should call one of these instead of `qc.invalidateQueries` ad-hoc, so a
 * new dependent query key only needs to be wired in once and every mutation instantly
 * refreshes it.
 *
 * Convention: `invalidate<Entity>(qc, id?)` invalidates the list, byId, and every known
 * dependent selector for that entity.
 */
import type { QueryClient } from "@tanstack/react-query";
import { qk } from "./query-keys";

function bump(qc: QueryClient, key: readonly unknown[]) {
  qc.invalidateQueries({ queryKey: key });
}

/** Invalidate every "picker" and "global search" query — anything that lists many entities. */
function bumpPickers(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["search"] });
  // EntityPicker & every list-all-rows selector across the app.
  qc.invalidateQueries({ queryKey: ["customers", "picker"] });
  qc.invalidateQueries({ queryKey: ["customers", "list"] });
  qc.invalidateQueries({ queryKey: ["vendors", "picker"] });
  qc.invalidateQueries({ queryKey: ["vendors", "list"] });
  qc.invalidateQueries({ queryKey: ["projects", "picker"] });
  qc.invalidateQueries({ queryKey: ["projects", "list"] });
  qc.invalidateQueries({ queryKey: ["products", "picker"] });
  qc.invalidateQueries({ queryKey: ["products", "list"] });
  // Stone-industry masters
  qc.invalidateQueries({ queryKey: ["stone_types", "picker"] });
  qc.invalidateQueries({ queryKey: ["stone_types", "list"] });
  qc.invalidateQueries({ queryKey: ["surface_finishes", "picker"] });
  qc.invalidateQueries({ queryKey: ["surface_finishes", "list"] });
  qc.invalidateQueries({ queryKey: ["edge_finishes", "picker"] });
  qc.invalidateQueries({ queryKey: ["edge_finishes", "list"] });
  qc.invalidateQueries({ queryKey: ["product_families", "picker"] });
  qc.invalidateQueries({ queryKey: ["product_families", "list"] });
}

/**
 * Seed a newly-created row into every relevant picker/list/byId cache so
 * open dropdowns render the new row immediately (before the background
 * refetch triggered by the matching `invalidate*` helper completes).
 */
export function seedPickerCache(
  qc: QueryClient,
  type: "customer" | "vendor" | "project" | "product",
  row: { id: string; [k: string]: unknown },
): void {
  const listPrefixes: readonly string[][] = (() => {
    switch (type) {
      case "customer":
        return [["customers", "picker"], ["customers", "list"]];
      case "vendor":
        return [["vendors", "picker"], ["vendors", "list"]];
      case "project":
        return [["projects", "picker"], ["projects", "list"], ["projects", "byCustomer"]];
      case "product":
        return [["products", "picker"], ["products", "list"]];
    }
  })();
  for (const prefix of listPrefixes) {
    qc.setQueriesData({ queryKey: prefix }, (prev: unknown) => {
      if (!Array.isArray(prev)) return prev;
      if (prev.some((r) => (r as { id?: string })?.id === row.id)) return prev;
      return [row, ...prev];
    });
  }
  const byIdKey =
    type === "product" ? ["products", "byId", row.id] : [`${type}s`, "byId", row.id];
  qc.setQueryData(byIdKey, row);
}

export function invalidateCustomer(qc: QueryClient, id?: string): void {
  bump(qc, qk.customers.all);
  if (id) bump(qc, qk.customers.byId(id));
  // Downstream: projects filtered by customer, dashboard KPIs, activity.
  qc.invalidateQueries({ queryKey: ["projects", "byCustomer"] });
  qc.invalidateQueries({ queryKey: ["projects", "picker"] });
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
  // Any open SafeDeleteDialog for this or any parent must re-scan.
  qc.invalidateQueries({ queryKey: ["mdm", "dependencies"] });
  bumpPickers(qc);
}

export function invalidateProject(qc: QueryClient, id?: string): void {
  bump(qc, qk.projects.all);
  if (id) bump(qc, qk.projects.byId(id));
  qc.invalidateQueries({ queryKey: ["projects", "byCustomer"] });
  qc.invalidateQueries({ queryKey: ["projects", "picker"] });
  bump(qc, qk.enquiries.all);
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
  qc.invalidateQueries({ queryKey: ["mdm", "dependencies"] });
  bumpPickers(qc);
}

export function invalidateVendor(qc: QueryClient, id?: string): void {
  bump(qc, qk.vendors.all);
  if (id) bump(qc, qk.vendors.byId(id));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
  qc.invalidateQueries({ queryKey: ["mdm", "dependencies"] });
  bumpPickers(qc);
}

export function invalidateProduct(qc: QueryClient, id?: string): void {
  bump(qc, qk.products.all);
  if (id) qc.invalidateQueries({ queryKey: ["products", "byId", id] });
  qc.invalidateQueries({ queryKey: ["mdm", "dependencies"] });
  bumpPickers(qc);
}


export function invalidateEnquiry(qc: QueryClient, id?: string): void {
  bump(qc, qk.enquiries.all);
  if (id) bump(qc, qk.enquiries.byId(id));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
  bump(qc, qk.followups.all);
}

export function invalidateRfq(qc: QueryClient, enquiryId?: string): void {
  bump(qc, qk.rfqs.all);
  if (enquiryId) bump(qc, qk.rfqs.byEnquiry(enquiryId));
  bump(qc, qk.enquiries.all);
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateQuote(qc: QueryClient, id?: string): void {
  bump(qc, qk.quotes.all);
  if (id) {
    bump(qc, qk.quotes.byId(id));
    bump(qc, qk.quotes.items(id));
  }
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateEstimate(qc: QueryClient, id?: string): void {
  bump(qc, qk.estimates.all);
  if (id) {
    bump(qc, qk.estimates.byId(id));
    bump(qc, qk.estimates.items(id));
    bump(qc, qk.estimates.components(id));
    bump(qc, qk.estimates.schedule(id));
    bump(qc, qk.estimates.documents(id));
  }
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidatePurchaseOrder(qc: QueryClient, id?: string): void {
  bump(qc, qk.purchaseOrders.all);
  if (id) bump(qc, qk.purchaseOrders.byId(id));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateSalesOrder(qc: QueryClient, id?: string): void {
  bump(qc, qk.salesOrders.all);
  if (id) bump(qc, qk.salesOrders.byId(id));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateInvoice(qc: QueryClient, id?: string): void {
  bump(qc, qk.invoices.all);
  if (id) {
    bump(qc, qk.invoices.byId(id));
    bump(qc, qk.invoices.items(id));
    bump(qc, qk.invoices.payments(id));
  }
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateDispatch(qc: QueryClient, id?: string): void {
  bump(qc, qk.dispatch.all);
  if (id) bump(qc, qk.dispatch.byId(id));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}
export function invalidatePayment(qc: QueryClient, id?: string, invoiceId?: string): void {
  bump(qc, qk.paymentsAll.all);
  if (id) bump(qc, qk.paymentsAll.byId(id));
  if (invoiceId) {
    bump(qc, qk.invoices.byId(invoiceId));
    bump(qc, qk.invoices.payments(invoiceId));
  }
  bump(qc, qk.invoices.all);
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateReceipt(qc: QueryClient, id?: string, customerId?: string): void {
  bump(qc, qk.receipts.all);
  if (id) {
    bump(qc, qk.receipts.byId(id));
    bump(qc, qk.receipts.allocations(id));
  }
  if (customerId) {
    bump(qc, qk.receipts.byCustomer(customerId));
    bump(qc, qk.customerLedger.byCustomer(customerId));
    bump(qc, qk.customerLedger.summary(customerId));
    bump(qc, qk.receipts.openInvoices(customerId));
  }
  // Allocations touch invoice totals + status.
  bump(qc, qk.invoices.all);
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateMessage(qc: QueryClient, id?: string, entity?: { type: string; id: string }): void {
  bump(qc, qk.messages.all);
  if (id) {
    bump(qc, qk.messages.byId(id));
    bump(qc, qk.messages.events(id));
  }
  if (entity) bump(qc, qk.messages.byEntity(entity.type, entity.id));
}

export function invalidateMessageTemplate(qc: QueryClient, code?: string): void {
  bump(qc, qk.messageTemplates.all);
  if (code) bump(qc, qk.messageTemplates.byCode(code));
}

export function invalidateAppSetting(qc: QueryClient, key?: string): void {
  bump(qc, qk.appSettings.all);
  if (key) bump(qc, qk.appSettings.byKey(key));
}

export function invalidateInventory(qc: QueryClient, id?: string): void {
  bump(qc, qk.inventory.all);
  if (id) bump(qc, qk.inventory.byId(id));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateGrn(qc: QueryClient, id?: string): void {
  bump(qc, qk.grns.all);
  if (id) {
    bump(qc, qk.grns.byId(id));
    bump(qc, qk.grns.items(id));
    bump(qc, qk.grns.inspections(id));
  }
  bump(qc, qk.inventoryMovements.all);
  bump(qc, qk.inventoryMovements.stockLedger);
  bump(qc, ["vendor_ledger"]);
  bump(qc, qk.activity.recent);
  bump(qc, qk.dashboard);
}

export function invalidateVendorPayment(qc: QueryClient, vendorId?: string): void {
  bump(qc, qk.vendorPayments.all);
  if (vendorId) bump(qc, qk.vendorPayments.byVendor(vendorId));
  bump(qc, ["vendor_ledger"]);
  bump(qc, qk.activity.recent);
  bump(qc, qk.dashboard);
}

export function invalidateInventoryMovements(qc: QueryClient): void {
  bump(qc, qk.inventoryMovements.all);
  bump(qc, qk.inventoryMovements.stockLedger);
}



export function invalidateFollowup(
  qc: QueryClient,
  scope?: { enquiryId?: string | null; entityType?: string | null; entityId?: string | null },
): void {
  bump(qc, qk.followups.all);
  if (scope?.enquiryId) bump(qc, qk.followups.byEnquiry(scope.enquiryId));
  if (scope?.entityType && scope?.entityId) {
    bump(qc, qk.followups.byEntity(scope.entityType, scope.entityId));
  }
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

// -------- Stone-industry masters & manufacturing --------

export function invalidateStoneType(qc: QueryClient, id?: string): void {
  bump(qc, qk.stoneTypes.all);
  if (id) bump(qc, qk.stoneTypes.byId(id));
  bumpPickers(qc);
}

export function invalidateSurfaceFinish(qc: QueryClient, id?: string): void {
  bump(qc, qk.surfaceFinishes.all);
  if (id) bump(qc, qk.surfaceFinishes.byId(id));
  bumpPickers(qc);
}

export function invalidateEdgeFinish(qc: QueryClient, id?: string): void {
  bump(qc, qk.edgeFinishes.all);
  if (id) bump(qc, qk.edgeFinishes.byId(id));
  bumpPickers(qc);
}

export function invalidateProductFamily(qc: QueryClient, id?: string): void {
  bump(qc, qk.productFamilies.all);
  if (id) bump(qc, qk.productFamilies.byId(id));
  bumpPickers(qc);
}

export function invalidateManufacturingStage(qc: QueryClient, id?: string): void {
  bump(qc, qk.manufacturingStages.all);
  if (id) bump(qc, qk.manufacturingStages.byId(id));
}

export function invalidateProductionOrder(
  qc: QueryClient,
  id?: string,
  salesOrderId?: string | null,
): void {
  bump(qc, qk.productionOrders.all);
  if (id) {
    bump(qc, qk.productionOrders.byId(id));
    bump(qc, qk.productionOrders.stages(id));
  }
  if (salesOrderId) bump(qc, qk.productionOrders.bySalesOrder(salesOrderId));
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateVendorCapability(qc: QueryClient, vendorId: string): void {
  bump(qc, qk.vendorCapabilities.byVendor(vendorId));
  if (vendorId) bump(qc, qk.vendors.byId(vendorId));
}

// -------- Slice 6: Installation & Field Service --------

export function invalidateInstallation(
  qc: QueryClient,
  id?: string,
  salesOrderId?: string | null,
): void {
  bump(qc, qk.installations.all);
  if (id) {
    bump(qc, qk.installations.byId(id));
    bump(qc, qk.installations.progress(id));
    bump(qc, qk.installations.materials(id));
    bump(qc, qk.installations.signoff(id));
  }
  if (salesOrderId) bump(qc, qk.installations.bySalesOrder(salesOrderId));
  bump(qc, qk.installations.kpis);
  bump(qc, qk.inventoryMovements.all);
  bump(qc, qk.dashboard);
  bump(qc, qk.activity.recent);
}

export function invalidateInstallationTeam(qc: QueryClient, id?: string): void {
  bump(qc, qk.installationTeams.all);
  bump(qc, qk.installationTeams.picker);
  if (id) bump(qc, qk.installationTeams.byId(id));
}

