/**
 * Customer Payment Request builder — assembles a beautiful, ready-to-send
 * WhatsApp / Email / Copy message from a milestone + org settings.
 *
 * Reuses the notification queue (`enqueueMessage`) — no side-channel sends.
 */
import { getAppSetting } from "@/lib/app-settings/api";
import { enqueueMessage } from "@/lib/notifications/queue";
import type { PaymentScheduleDashboardRow } from "./schedule";

export interface OrgPaymentSettings {
  bank_name?: string;
  account_name?: string;
  account_no?: string;
  ifsc?: string;
  upi_id?: string;
  upi_qr_url?: string;
  brand_name?: string;
}

export async function getOrgPaymentSettings(): Promise<OrgPaymentSettings> {
  const s = (await getAppSetting<OrgPaymentSettings>("payments.gateways" as never)) ?? {};
  return {
    brand_name: s.brand_name ?? "Stone Tech",
    ...s,
  };
}

function inr(n: number): string {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export interface PaymentRequestContext {
  row: PaymentScheduleDashboardRow;
  org: OrgPaymentSettings;
  paymentLinkUrl?: string | null;
  contactName?: string | null;
}

export function renderPaymentRequestWhatsApp(ctx: PaymentRequestContext): string {
  const { row, org, paymentLinkUrl } = ctx;
  const lines: string[] = [];
  lines.push(`Hello ${ctx.contactName ?? row.customer_name ?? "Sir/Madam"},`);
  lines.push("");
  lines.push(`Please find the payment request for *${row.project_name ?? "your project"}*.`);
  lines.push("");
  if (row.estimate_no) lines.push(`Estimate: *${row.estimate_no}*`);
  lines.push(`Milestone: *${row.label}*  (Installment ${row.milestone_no})`);
  lines.push(`Amount due: *${inr(row.balance_due)}*`);
  if (row.due_date) lines.push(`Due date: *${row.due_date}*`);
  lines.push("");
  if (org.bank_name || org.account_no) {
    lines.push("*Bank Details*");
    if (org.account_name) lines.push(`A/c Name : ${org.account_name}`);
    if (org.bank_name) lines.push(`Bank     : ${org.bank_name}`);
    if (org.account_no) lines.push(`A/c No   : ${org.account_no}`);
    if (org.ifsc) lines.push(`IFSC     : ${org.ifsc}`);
    lines.push("");
  }
  if (org.upi_id) lines.push(`UPI: *${org.upi_id}*`);
  if (paymentLinkUrl) lines.push(`Pay online: ${paymentLinkUrl}`);
  lines.push("");
  lines.push(`Ref: ${row.estimate_no ?? row.id.slice(0, 8)}`);
  lines.push("");
  lines.push(`Regards,\n${org.brand_name ?? "Stone Tech"}`);
  return lines.join("\n");
}

export function renderPaymentRequestEmail(ctx: PaymentRequestContext): {
  subject: string;
  html: string;
} {
  const { row, org, paymentLinkUrl } = ctx;
  const subject = `Payment request — ${row.label}${row.estimate_no ? " · " + row.estimate_no : ""}`;
  const html = `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#fafafa;padding:24px;color:#1c1917">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden">
    <div style="background:linear-gradient(135deg,#0f766e,#334155);padding:24px 28px;color:#fff">
      <div style="font-size:12px;letter-spacing:.08em;opacity:.85">${org.brand_name ?? "STONE TECH"}</div>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:600">Payment request</h1>
    </div>
    <div style="padding:24px 28px">
      <p>Hello ${ctx.contactName ?? row.customer_name ?? "there"},</p>
      <p>Please find the payment request for <strong>${row.project_name ?? "your project"}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        ${row.estimate_no ? `<tr><td style="padding:6px 0;color:#64748b">Estimate</td><td style="text-align:right"><strong>${row.estimate_no}</strong></td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#64748b">Milestone</td><td style="text-align:right"><strong>${row.label}</strong> (${row.milestone_no})</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Amount due</td><td style="text-align:right;font-size:20px;color:#0f766e;font-weight:700">${inr(row.balance_due)}</td></tr>
        ${row.due_date ? `<tr><td style="padding:6px 0;color:#64748b">Due date</td><td style="text-align:right"><strong>${row.due_date}</strong></td></tr>` : ""}
      </table>
      ${
        org.bank_name || org.account_no
          ? `
      <div style="background:#f5f5f4;border-radius:12px;padding:16px 20px;margin:20px 0">
        <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Bank Details</div>
        <div style="font-size:14px;margin-top:8px;line-height:1.7">
          ${org.account_name ? `A/c Name: <strong>${org.account_name}</strong><br>` : ""}
          ${org.bank_name ? `Bank: <strong>${org.bank_name}</strong><br>` : ""}
          ${org.account_no ? `A/c No: <strong>${org.account_no}</strong><br>` : ""}
          ${org.ifsc ? `IFSC: <strong>${org.ifsc}</strong>` : ""}
        </div>
      </div>`
          : ""
      }
      ${org.upi_id ? `<p>UPI: <strong>${org.upi_id}</strong></p>` : ""}
      ${paymentLinkUrl ? `<p style="text-align:center;margin:24px 0"><a href="${paymentLinkUrl}" style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Pay online</a></p>` : ""}
      <p style="color:#64748b;font-size:12px;margin-top:32px">Ref: ${row.estimate_no ?? row.id.slice(0, 8)}</p>
      <p style="color:#64748b;font-size:12px">Regards,<br>${org.brand_name ?? "Stone Tech"}</p>
    </div>
  </div></body></html>`;
  return { subject, html };
}

export async function sendPaymentRequest(params: {
  ctx: PaymentRequestContext;
  channel: "whatsapp" | "email";
  to: string;
}) {
  const { ctx, channel, to } = params;
  if (channel === "whatsapp") {
    return enqueueMessage({
      channel: "whatsapp",
      templateCode: "customer_payment_request",
      to,
      body: renderPaymentRequestWhatsApp(ctx),
      relatedType: "customer_payment_schedule",
      relatedId: ctx.row.id,
      customerId: ctx.row.customer_id,
    });
  }
  const { subject, html } = renderPaymentRequestEmail(ctx);
  return enqueueMessage({
    channel: "email",
    templateCode: "customer_payment_request",
    to,
    subject,
    body: html,
    relatedType: "customer_payment_schedule",
    relatedId: ctx.row.id,
    customerId: ctx.row.customer_id,
  });
}
