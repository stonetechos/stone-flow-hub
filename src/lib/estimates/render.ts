/** Generate WhatsApp / email drafts for an estimate. User can edit before sending. */
import { formatInr } from "@/lib/format";
import { ESTIMATE_TEMPLATES } from "./templates";
import type { EstimateListItem, EstimateItemRow, EstimatePaymentRow } from "./api";

interface RenderCtx {
  estimate: EstimateListItem;
  items: EstimateItemRow[];
  schedule: EstimatePaymentRow[];
}

export function renderWhatsappText({ estimate, items, schedule }: RenderCtx): string {
  const t = ESTIMATE_TEMPLATES[estimate.template];
  const lines: string[] = [];
  lines.push(`*${t.label} Estimate — ${estimate.estimate_no}*`);
  if (estimate.customer?.name) lines.push(`Customer: ${estimate.customer.name}`);
  if (estimate.project?.name) lines.push(`Project: ${estimate.project.name}`);
  lines.push("");
  lines.push(t.defaultIntro);
  lines.push("");
  lines.push("*Line items*");
  for (const it of items) {
    lines.push(
      `• ${it.description} — ${it.quantity} ${it.unit ?? ""} × ${formatInr(it.unit_price)} = ${formatInr(
        it.line_total,
      )}`,
    );
  }
  lines.push("");
  lines.push(`Subtotal: ${formatInr(estimate.subtotal)}`);
  if (Number(estimate.margin_amount) > 0)
    lines.push(`Margin (${estimate.margin_pct}%): ${formatInr(estimate.margin_amount)}`);
  lines.push(`GST (${estimate.gst_pct}%): ${formatInr(estimate.gst_amount)}`);
  lines.push(`*Total: ${formatInr(estimate.total)}*`);
  if (schedule.length) {
    lines.push("");
    lines.push("*Payment schedule*");
    for (const s of schedule) {
      lines.push(`• ${s.label} — ${s.pct}% (${formatInr(s.amount)})`);
    }
  }
  if (estimate.valid_until) {
    lines.push("");
    lines.push(`Validity: ${estimate.valid_until}`);
  }
  return lines.join("\n");
}

export function renderEmailHtml(ctx: RenderCtx): { subject: string; html: string } {
  const { estimate, items, schedule } = ctx;
  const t = ESTIMATE_TEMPLATES[estimate.template];
  const subject = `${t.label} Estimate ${estimate.estimate_no}${
    estimate.project?.name ? ` — ${estimate.project.name}` : ""
  }`;

  const itemRows = items
    .map(
      (it) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${escape(
          it.description,
        )}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${
          it.quantity
        } ${escape(it.unit ?? "")}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatInr(
          it.unit_price,
        )}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${formatInr(
          it.line_total,
        )}</td></tr>`,
    )
    .join("");

  const scheduleRows = schedule
    .map(
      (s) =>
        `<tr><td style="padding:4px 8px">${escape(s.label)}</td><td style="padding:4px 8px;text-align:right">${s.pct}%</td><td style="padding:4px 8px;text-align:right">${formatInr(
          s.amount,
        )}</td></tr>`,
    )
    .join("");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px">
  <h2 style="margin:0 0 4px 0">${t.label} Estimate</h2>
  <div style="color:#555;margin-bottom:16px">${estimate.estimate_no}${
    estimate.project?.name ? ` &middot; ${escape(estimate.project.name)}` : ""
  }</div>
  <p>${escape(t.defaultIntro)}</p>
  <table style="width:100%;border-collapse:collapse;margin:12px 0">
    <thead><tr>
      <th align="left" style="padding:6px 8px;border-bottom:2px solid #333">Description</th>
      <th align="right" style="padding:6px 8px;border-bottom:2px solid #333">Qty</th>
      <th align="right" style="padding:6px 8px;border-bottom:2px solid #333">Rate</th>
      <th align="right" style="padding:6px 8px;border-bottom:2px solid #333">Line total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <table style="width:100%;margin-top:8px">
    <tr><td align="right">Subtotal</td><td align="right" style="width:140px">${formatInr(estimate.subtotal)}</td></tr>
    ${
      Number(estimate.margin_amount) > 0
        ? `<tr><td align="right">Margin (${estimate.margin_pct}%)</td><td align="right">${formatInr(estimate.margin_amount)}</td></tr>`
        : ""
    }
    <tr><td align="right">GST (${estimate.gst_pct}%)</td><td align="right">${formatInr(estimate.gst_amount)}</td></tr>
    <tr><td align="right"><strong>Total</strong></td><td align="right"><strong>${formatInr(estimate.total)}</strong></td></tr>
  </table>
  ${
    schedule.length
      ? `<h3 style="margin-top:20px">Payment schedule</h3><table style="width:100%;border-collapse:collapse">${scheduleRows}</table>`
      : ""
  }
  ${estimate.terms ? `<p style="margin-top:20px;color:#555">${escape(estimate.terms)}</p>` : ""}
</div>`;
  return { subject, html };
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
