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
        title: "Draft a quotation for this customer",
        description:
          "You've captured the customer. The next step is to draft a quotation with pricing and stone specs.",
        ctaLabel: "Continue — New quotation",
        href: "/quotes/new",
        search: clean({ customer: entityId }),
        skipKey: `gwa:customer:${entityId}:quote`,
      };
    case "quote":
      return {
        title: "Raise an invoice",
        description:
          "When the customer accepts the quotation, convert it directly into an invoice to confirm the sale and billing.",
        ctaLabel: "Continue — New invoice",
        href: "/invoices/new",
        search: clean({
          quote: entityId,
          customer: ctx.customer_id,
        }),
        skipKey: `gwa:quote:${entityId}:invoice`,
      };
    case "invoice":
      return {
        title: "Create a dispatch",
        description:
          "Invoice is issued. Create a dispatch to coordinate packing, vehicle allocation, and delivery paperwork.",
        ctaLabel: "Continue — New dispatch",
        href: "/dispatch/new",
        search: clean({
          customer: ctx.customer_id,
        }),
        skipKey: `gwa:invoice:${entityId}:dispatch`,
      };
    case "dispatch":
      return {
        title: "Record customer payment",
        description:
          "Material is dispatched. Record the customer payment or receipt to update the sales ledger.",
        ctaLabel: "Continue — New payment",
        href: "/receipts/new",
        search: clean({ customer: ctx.customer_id, invoice: ctx.invoice_id }),
        skipKey: `gwa:dispatch:${entityId}:receipt`,
      };
    case "enquiry":
      return {
        title: "Create a quotation for this enquiry",
        description:
          "Enquiry requirement is captured. Preparing a quotation is the next step to share pricing.",
        ctaLabel: "Continue — New quotation",
        href: "/quotes/new",
        search: clean({ customer: ctx.customer_id, enquiry: entityId }),
        skipKey: `gwa:enquiry:${entityId}:quote`,
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
    case "sales_order":
      return {
        title: "Raise an invoice",
        description:
          "Sales order is confirmed. Raise an invoice to initiate billing and payment collection.",
        ctaLabel: "Continue — New invoice",
        href: "/invoices/new",
        search: clean({
          customer: ctx.customer_id,
        }),
        skipKey: `gwa:sales_order:${entityId}:invoice`,
      };
    case "purchase_order":
      return {
        title: "Raise purchase invoice",
        description:
          "Purchase order is placed. Record the incoming vendor invoice against this order.",
        ctaLabel: "Continue — Purchase invoice",
        href: "/purchase-invoices/new",
        search: clean({ vendor: ctx.vendor_id }),
        skipKey: `gwa:purchase_order:${entityId}:purchase_invoice`,
      };
    case "installation":
      return {
        title: "Raise an invoice",
        description:
          "Installation is under way. Raising the invoice starts the receivables workflow.",
        ctaLabel: "Continue — New invoice",
        href: "/invoices/new",
        search: clean({
          quote: ctx.quote_id,
          customer: ctx.customer_id,
        }),
        skipKey: `gwa:installation:${entityId}:invoice`,
      };
    case "receipt":
      return null;
    default:
      return null;
  }
}
