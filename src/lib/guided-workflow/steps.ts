/**
 * Guided Workflow Assistant — pure step map.
 *
 * Given a source entity that the user has just landed on (or completed), this
 * returns the recommended next step in the STOS lifecycle:
 *
 *   Customer → Enquiry → Project → Quotation → Sales Order
 *     → Purchase Order → Production → Dispatch → Installation
 *     → Invoice → Receipt → After-sales
 *
 * The assistant is UI-only: it never mutates data, never changes stages, never
 * bypasses permissions. It only *suggests* creating the next artefact. If the
 * corresponding artefact already exists it stays silent — the existence check
 * is done in the component via the `hasNext` prop using the same query keys
 * the rest of the app already uses.
 *
 * Context propagation (Phase F): every step now carries an optional `search`
 * bag so the target create surface can pre-select the parent entity (project,
 * customer, quote, sales order, vendor, invoice), eliminating a second manual
 * pick and cutting 1–3 clicks per workflow hop. Callers pass what they know
 * via `ctx`; missing keys are simply omitted from `search`.
 */

export type GuidedEntity =
  | "customer"
  | "enquiry"
  | "project"
  | "quote"
  | "sales_order"
  | "purchase_order"
  | "production_order"
  | "dispatch"
  | "installation"
  | "invoice"
  | "receipt";

/**
 * Context the caller already has in scope on a detail page — none is required;
 * pass whatever is available so downstream create pages can pre-populate.
 */
export interface GuidedContext {
  customer_id?: string | null;
  project_id?: string | null;
  enquiry_id?: string | null;
  quote_id?: string | null;
  sales_order_id?: string | null;
  invoice_id?: string | null;
  vendor_id?: string | null;
}

export interface GuidedStep {
  /** Label shown as the card title. */
  title: string;
  /** Short reason shown under the title. */
  description: string;
  /** Label on the primary CTA. */
  ctaLabel: string;
  /** Route path (matches TanStack Router `to`). */
  href: string;
  /** Search-param bag passed as `<Link search={...}>`. Empty object when the target route accepts no params. */
  search: Record<string, string>;
  /** Stable key used to remember "Skip for now" in localStorage. */
  skipKey: string;
  /** Optional label on the secondary "later" link. */
  laterLabel?: string;
}

/**
 * Deterministic, side-effect-free lookup. `entityId` participates in the
 * skip-key so a skip on Customer A never hides the banner on Customer B.
 */
export function nextGuidedStep(
  entity: GuidedEntity,
  entityId: string,
  ctx: GuidedContext = {},
): GuidedStep | null {
  const clean = (o: Record<string, string | null | undefined>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) if (v) out[k] = v;
    return out;
  };

  switch (entity) {
    case "customer":
      return {
        title: "Create an enquiry for this customer",
        description:
          "You've captured the customer. The next step is to log their requirement as an enquiry so the sales pipeline can begin.",
        ctaLabel: "Continue — New enquiry",
        href: "/enquiries",
        search: clean({ new: "1", customer: entityId }),
        skipKey: `gwa:customer:${entityId}:enquiry`,
      };
    case "enquiry":
      return {
        title: "Create a project for this enquiry",
        description:
          "Once an enquiry is qualified, opening a project groups all downstream quotations, orders and installations under one roof.",
        ctaLabel: "Continue — New project",
        href: "/projects",
        search: clean({ new: "1", customer: ctx.customer_id, enquiry: entityId }),
        skipKey: `gwa:enquiry:${entityId}:project`,
      };
    case "project":
      return {
        title: "Draft a quotation for this project",
        description:
          "The project scope is captured. Preparing a quotation is the next natural step to share pricing with the customer.",
        ctaLabel: "Continue — New quotation",
        href: "/quotes/new",
        search: clean({ project: entityId, customer: ctx.customer_id }),
        skipKey: `gwa:project:${entityId}:quote`,
      };
    case "quote":
      return {
        title: "Convert to a sales order",
        description:
          "When the customer accepts the quotation, converting it to a sales order locks scope and unlocks procurement + production.",
        ctaLabel: "Continue — New sales order",
        href: "/sales-orders/new",
        search: clean({
          quote: entityId,
          project: ctx.project_id,
          customer: ctx.customer_id,
        }),
        skipKey: `gwa:quote:${entityId}:sales_order`,
      };
    case "sales_order":
      return {
        title: "Begin procurement",
        description:
          "Sales order is confirmed. Raise a purchase order or float an RFQ so material and services are lined up on time.",
        ctaLabel: "Continue — New purchase order",
        href: "/purchase-orders/new",
        search: clean({ project: ctx.project_id, vendor: ctx.vendor_id }),
        skipKey: `gwa:sales_order:${entityId}:purchase_order`,
      };
    case "purchase_order":
      return {
        title: "Kick off production",
        description:
          "Purchase order is in place. Open (or create) the matching production order to schedule stages, QC and material prep.",
        ctaLabel: "Continue — Production",
        href: "/manufacturing",
        search: clean({ project: ctx.project_id }),
        skipKey: `gwa:purchase_order:${entityId}:production_order`,
      };
    case "production_order":
      return {
        title: "Create a dispatch",
        description:
          "Production is progressing. When pieces are ready, creating a dispatch coordinates packing, vehicle and delivery paperwork.",
        ctaLabel: "Continue — New dispatch",
        href: "/dispatch/new",
        search: clean({ so: ctx.sales_order_id }),
        skipKey: `gwa:production_order:${entityId}:dispatch`,
      };
    case "dispatch":
      return {
        title: "Schedule the installation",
        description:
          "Dispatch is on its way. If this order needs on-site fitting, plan the site visit, team and materials next.",
        ctaLabel: "Continue — Installations",
        href: "/installations",
        search: clean({ so: ctx.sales_order_id, project: ctx.project_id }),
        skipKey: `gwa:dispatch:${entityId}:installation`,
      };
    case "installation":
      return {
        title: "Raise an invoice",
        description:
          "Installation is under way. Raising the invoice — advance, proforma or final — starts the receivables workflow.",
        ctaLabel: "Continue — New invoice",
        href: "/invoices/new",
        search: clean({
          quote: ctx.quote_id,
          so: ctx.sales_order_id,
          customer: ctx.customer_id,
        }),
        skipKey: `gwa:installation:${entityId}:invoice`,
      };
    case "invoice":
      return {
        title: "Record a receipt",
        description:
          "Once payment arrives, recording a receipt updates the customer ledger and closes the outstanding automatically.",
        ctaLabel: "Continue — New receipt",
        href: "/receipts/new",
        search: clean({ invoice: entityId, customer: ctx.customer_id }),
        skipKey: `gwa:invoice:${entityId}:receipt`,
      };
    case "receipt":
      return {
        title: "Follow up with the customer",
        description:
          "Payment received. Schedule a follow-up, request a Google review or capture a referral to keep the relationship warm.",
        ctaLabel: "Continue — Follow-ups",
        href: "/followups",
        search: clean({ customer: ctx.customer_id }),
        skipKey: `gwa:receipt:${entityId}:followup`,
      };
    default:
      return null;
  }
}
