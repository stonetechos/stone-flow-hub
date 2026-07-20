import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireStaffClient } from "../util";

export default defineTool({
  name: "get_customer",
  title: "Get customer",
  description:
    "Return one customer plus a short summary of their recent enquiries, quotes, invoices and outstanding balance.",
  inputSchema: {
    id: z.string().uuid().describe("Customer UUID (e.g. from list_customers)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if ("error" in staff) return staff.error;
    const { client } = staff;

    const [{ data: customer, error: cErr }, enquiries, quotes, invoices] = await Promise.all([
      client.from("customers").select("*").eq("id", id).maybeSingle(),
      client
        .from("enquiries")
        .select("id, enquiry_code, subject, status, lead_stage, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      client
        .from("quotes")
        .select("id, quote_number, status, total_amount, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      client
        .from("invoices")
        .select("id, invoice_number, status, total_amount, balance_amount, invoice_date")
        .eq("customer_id", id)
        .order("invoice_date", { ascending: false })
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
