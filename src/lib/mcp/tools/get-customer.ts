import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireStaffClient } from "../util";

export default defineTool({
  name: "get_customer",
  title: "Get customer",
  description:
    "Return one customer plus a short summary of their recent enquiries, quotes and invoices.",
  inputSchema: {
    id: z.string().uuid().describe("Customer UUID (e.g. from list_customers)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) return staff.error;
    const { client } = staff;

    const [{ data: customer, error: cErr }, enquiries, quotes, invoices] = await Promise.all([
      client.from("customers").select("*").eq("id", id).maybeSingle(),
      client
        .from("enquiries")
        .select("id, enquiry_no, requirement, stage, priority, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      client
        .from("quotes")
        .select("id, quote_no, status, total, issue_date, valid_until")
        .eq("customer_id", id)
        .order("issue_date", { ascending: false })
        .limit(5),
      client
        .from("invoices")
        .select("id, invoice_no, status, total, balance_due, issue_date, due_date")
        .eq("customer_id", id)
        .order("issue_date", { ascending: false })
        .limit(5),
    ]);
    if (cErr) return errorResult(cErr);
    if (!customer) return errorResult(new Error("Customer not found"));

    return jsonResult({
      customer,
      recent_enquiries: enquiries.data ?? [],
      recent_quotes: quotes.data ?? [],
      recent_invoices: invoices.data ?? [],
    });
  },
});
