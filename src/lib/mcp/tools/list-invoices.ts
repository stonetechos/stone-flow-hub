import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { errorResult, jsonResult, requireStaffClient, sanitize } from "../util";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
const STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

export default defineTool({
  name: "list_invoices",
  title: "List invoices",
  description:
    "List customer invoices filtered by status, customer, overdue flag or free-text search on invoice number.",
  inputSchema: {
    query: z.string().optional(),
    status: z.enum(STATUSES as [InvoiceStatus, ...InvoiceStatus[]]).optional(),
    customer_id: z.string().uuid().optional(),
    only_overdue: z
      .boolean()
      .optional()
      .describe("If true, return only invoices with a positive balance past their due date."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, customer_id, only_overdue, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) return staff.error;
    let q = staff.client
      .from("invoices")
      .select("id, invoice_no, status, issue_date, due_date, total, balance_due, customer_id")
      .order("issue_date", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (customer_id) q = q.eq("customer_id", customer_id);
    if (only_overdue) {
      q = q.gt("balance_due", 0).lt("due_date", new Date().toISOString().slice(0, 10));
    }
    const s = query ? sanitize(query) : "";
    if (s) q = q.ilike("invoice_no", `%${s}%`);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, invoices: data ?? [] });
  },
});
