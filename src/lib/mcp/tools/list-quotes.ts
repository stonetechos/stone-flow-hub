import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { errorResult, jsonResult, requireStaffClient, sanitize } from "../util";

type QuoteStatus = Database["public"]["Enums"]["quote_status"];
const STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];

export default defineTool({
  name: "list_quotes",
  title: "List quotes",
  description:
    "List sales quotes filtered by status, customer or free-text search on quote number.",
  inputSchema: {
    query: z.string().optional(),
    status: z.enum(STATUSES as [QuoteStatus, ...QuoteStatus[]]).optional(),
    customer_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, status, customer_id, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) return staff.error;
    let q = staff.client
      .from("quotes")
      .select("id, quote_no, status, total, customer_id, valid_until, issue_date, created_at")
      .order("issue_date", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    if (customer_id) q = q.eq("customer_id", customer_id);
    const s = query ? sanitize(query) : "";
    if (s) q = q.ilike("quote_no", `%${s}%`);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, quotes: data ?? [] });
  },
});
