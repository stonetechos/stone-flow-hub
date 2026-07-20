import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, requireStaffClient } from "../util";

export default defineTool({
  name: "get_dashboard_snapshot",
  title: "Dashboard snapshot",
  description:
    "Return a high-level operational snapshot: open enquiries, quotes sent, outstanding + overdue receivables and today's receipts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) return staff.error;
    const { client } = staff;
    const today = new Date().toISOString().slice(0, 10);

    const [enq, quotes, invUnpaid, invOverdue, recToday] = await Promise.all([
      client
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .not("stage", "in", "(completed,lost,cancelled)"),
      client
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
      client.from("invoices").select("balance_due").gt("balance_due", 0),
      client
        .from("invoices")
        .select("balance_due")
        .gt("balance_due", 0)
        .lt("due_date", today),
      client.from("receipts").select("amount").gte("received_at", `${today}T00:00:00Z`),
    ]);

    const err = enq.error || quotes.error || invUnpaid.error || invOverdue.error || recToday.error;
    if (err) return errorResult(err);

    const sumBalance = (rows: Array<{ balance_due: number | null }> | null) =>
      (rows ?? []).reduce((a, r) => a + Number(r.balance_due ?? 0), 0);
    const sumAmount = (rows: Array<{ amount: number | null }> | null) =>
      (rows ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0);

    return jsonResult({
      open_enquiries: enq.count ?? 0,
      quotes_awaiting_response: quotes.count ?? 0,
      outstanding_receivables: sumBalance(invUnpaid.data),
      overdue_receivables: sumBalance(invOverdue.data),
      receipts_today: sumAmount(recToday.data),
      as_of: new Date().toISOString(),
    });
  },
});
