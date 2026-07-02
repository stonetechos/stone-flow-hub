/** Placeholder notifications feed (UI-only). No backend logic yet. */
export type NotificationKind =
  | "enquiry_new"
  | "quote_created"
  | "project_updated"
  | "invoice_generated"
  | "payment_received"
  | "dispatch_completed";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

const NOW = Date.now();
const iso = (minsAgo: number): string => new Date(NOW - minsAgo * 60_000).toISOString();

export const MOCK_NOTIFICATIONS: ReadonlyArray<NotificationItem> = [
  { id: "n1", kind: "enquiry_new", title: "New enquiry received", body: "Fresh enquiry from a customer awaiting assignment.", at: iso(3), read: false, href: "/enquiries" },
  { id: "n2", kind: "quote_created", title: "Quotation created", body: "A new quotation was drafted and is pending review.", at: iso(28), read: false, href: "/quotes" },
  { id: "n3", kind: "project_updated", title: "Project updated", body: "A project's schedule or scope was updated.", at: iso(120), read: true, href: "/projects" },
  { id: "n4", kind: "invoice_generated", title: "Invoice generated", body: "A new invoice was generated for a completed order.", at: iso(240), read: true, href: "/invoices" },
  { id: "n5", kind: "payment_received", title: "Payment received", body: "A payment has been recorded against an invoice.", at: iso(480), read: true, href: "/payments" },
  { id: "n6", kind: "dispatch_completed", title: "Dispatch completed", body: "A dispatch has been marked as delivered.", at: iso(1440), read: true, href: "/dispatch" },
];
