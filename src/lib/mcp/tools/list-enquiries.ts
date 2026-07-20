import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireStaffClient, sanitize } from "../util";

export default defineTool({
  name: "list_enquiries",
  title: "List enquiries",
  description:
    "List enquiries, optionally filtered by lead stage, status, owner or free-text search on subject / enquiry code.",
  inputSchema: {
    query: z.string().optional(),
    lead_stage: z.string().optional().describe("e.g. 'new', 'qualified', 'won', 'lost'"),
    status: z.string().optional(),
    owner_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, lead_stage, status, owner_id, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if ("error" in staff) return staff.error;
    let q = staff.client
      .from("enquiries")
      .select(
        "id, enquiry_code, subject, status, lead_stage, priority, owner_id, customer_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (lead_stage) q = q.eq("lead_stage", lead_stage as never);
    if (status) q = q.eq("status", status as never);
    if (owner_id) q = q.eq("owner_id", owner_id);
    const s = query ? sanitize(query) : "";
    if (s) q = q.or(`enquiry_code.ilike.%${s}%,subject.ilike.%${s}%`);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, enquiries: data ?? [] });
  },
});
