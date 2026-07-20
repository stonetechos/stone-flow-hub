import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireStaffClient, sanitize } from "../util";

export default defineTool({
  name: "list_quotes",
  title: "List quotes",
  description: "List sales quotes filtered by status, customer or free-text search on quote number.",
  inputSchema: {
    query: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, customer_id, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if ("error" in staff) return staff.error;
    let q = staff.client
      .from("quotes")
      .select("id, quote_number, status, total_amount, customer_id, valid_till, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status as never);
    if (customer_id) q = q.eq("customer_id", customer_id);
    const s = query ? sanitize(query) : "";
    if (s) q = q.ilike("quote_number", `%${s}%`);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, quotes: data ?? [] });
  },
});
