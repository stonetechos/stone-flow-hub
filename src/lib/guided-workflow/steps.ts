/**
 * Guided Workflow Assistant — pure step map.
 *
 * Given a source entity that the user has just landed on (or completed), this
 * returns the recommended next step in the Stone Tech OS lifecycle:
 *
 *   Customer → Enquiry → Project → Quotation → Sales Order → Invoice
 *          → Payment / Receipt → Installation
 *
 * The assistant is UI-only: it never mutates data, never changes stages, never
 * bypasses permissions. It only *suggests* creating the next artefact. If the
 * corresponding artefact already exists it stays silent — the existence check
 * is done in the component using the same query keys the rest of the app uses.
 */

export type GuidedEntity =
  | "customer"
  | "enquiry"
  | "project"
  | "quote"
  | "sales_order"
  | "invoice"
  | "receipt"
  | "installation";

export interface GuidedStep {
  /** Label shown as the card title. */
  title: string;
  /** Short reason shown under the title. */
  description: string;
  /** Label on the primary CTA. */
  ctaLabel: string;
  /** Route to navigate the user to when they click Continue. */
  href: string;
  /** Stable key used to remember "Skip for now" in localStorage. */
  skipKey: string;
  /** Optional label on the secondary "later" link. */
  laterLabel?: string;
}

/**
 * Deterministic, side-effect-free lookup. `entityId` participates in the
 * skip-key so a skip on Customer A never hides the banner on Customer B.
 */
export function nextGuidedStep(entity: GuidedEntity, entityId: string): GuidedStep | null {
  switch (entity) {
    case "customer":
      return {
        title: "Create an enquiry for this customer",
        description:
          "You've captured the customer. The next step is to log their requirement as an enquiry so the sales pipeline can begin.",
        ctaLabel: "Continue — New enquiry",
        href: "/enquiries",
        skipKey: `gwa:customer:${entityId}:enquiry`,
      };
    case "enquiry":
      return {
        title: "Create a project for this enquiry",
        description:
          "Once an enquiry is qualified, opening a project groups all downstream quotations, orders and installations under one roof.",
        ctaLabel: "Continue — New project",
        href: "/projects",
        skipKey: `gwa:enquiry:${entityId}:project`,
      };
    case "project":
      return {
        title: "Draft a quotation for this project",
        description:
          "The project scope is captured. Preparing a quotation is the next natural step to share pricing with the customer.",
        ctaLabel: "Continue — New quotation",
        href: "/quotes/new",
        skipKey: `gwa:project:${entityId}:quote`,
      };
    case "quote":
      return {
        title: "Convert to a sales order",
        description:
          "When the customer accepts the quotation, converting it to a sales order locks scope and unlocks procurement + production.",
        ctaLabel: "Continue — New sales order",
        href: "/sales-orders/new",
        skipKey: `gwa:quote:${entityId}:sales_order`,
      };
    case "sales_order":
      return {
        title: "Raise an invoice",
        description:
          "Sales order is confirmed. Raising an invoice — advance, proforma or final — starts the receivables workflow.",
        ctaLabel: "Continue — New invoice",
        href: "/invoices/new",
        skipKey: `gwa:sales_order:${entityId}:invoice`,
      };
    case "invoice":
      return {
        title: "Record a receipt",
        description:
          "Once payment arrives, recording a receipt updates the customer ledger and closes the outstanding automatically.",
        ctaLabel: "Continue — New receipt",
        href: "/receipts/new",
        skipKey: `gwa:invoice:${entityId}:receipt`,
      };
    case "receipt":
      return {
        title: "Schedule the installation",
        description:
          "Payment received. If this order needs on-site installation, plan the site visit, team and materials next.",
        ctaLabel: "Continue — Installations",
        href: "/installations",
        skipKey: `gwa:receipt:${entityId}:installation`,
      };
    case "installation":
      return null;
    default:
      return null;
  }
}
