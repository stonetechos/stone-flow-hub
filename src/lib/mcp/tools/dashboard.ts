import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, requireStaffClient } from "../util";

export default defineTool({
  name: "get_dashboard_snapshot",
  title: "Dashboard snapshot",
  description:
    "Return a high-level operational snapshot: open enquiries, active quotes, unpaid invoices, overdue amount and today's receipts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const staff = await requireStaffClient(ctx);
    if ("error" in staff) return staff.error;
    const { client } = staff;
    const today = new Date().toISOString().slice(0, 10);

    const [enq, quotes, invUnpaid, invOverdue, recToday] = await Promise.all([
      client.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "open" as never),
      client.from("quotes").select("id", { count: "exact", head: true }).eq("status", "sent" as never),
      client.from("invoices").select("balance_amount").gt("balance_amount", 0),
      client
        .from("invoices")
        .select("balance_amount")
        .gt("balance_amount", 0)
        .lt("due_date", today),
      client.from("customer_payments").select("amount").eq("payment_date", today),
    ]);

    const err = enq.error || quotes.error || invUnpaid.error || invOverdue.error || recToday.error;
    if (err) return errorResult(err);

    const sum = (rows: Array<{ balance_amount?: number | null; amount?: number | null }> | null) =>
      (rows ?? []).reduce((a, r) => a + Number(r.balance_amount ?? r.amount ?? 0), 0);

    return jsonResult({
      open_enquiries: enq.count ?? 0,
      quotes_awaiting_response: quotes.count ?? 0,
      outstanding_receivables: sum(invUnpaid.data),
      overdue_receivables: sum(invOverdue.data),
      receipts_today: sum(recToday.data),
      as_of: new Date().toISOString(),
    });
  },
});
