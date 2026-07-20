import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { errorResult, jsonResult, requireStaffClient, sanitize } from "../util";

type LeadStage = Database["public"]["Enums"]["lead_stage"];
const STAGES: LeadStage[] = [
  "new",
  "qualifying",
  "quoted",
  "negotiation",
  "won",
  "lost",
  "on_hold",
];

export default defineTool({
  name: "list_enquiries",
  title: "List enquiries",
  description:
    "List enquiries, optionally filtered by lead stage, assignee or free-text search on enquiry number / requirement text.",
  inputSchema: {
    query: z.string().optional(),
    stage: z.enum(STAGES as [LeadStage, ...LeadStage[]]).optional(),
    assigned_to: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, stage, assigned_to, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) return staff.error;
    let q = staff.client
      .from("enquiries")
      .select(
        "id, enquiry_no, requirement, stage, priority, assigned_to, customer_id, budget_inr, required_delivery_date, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (stage) q = q.eq("stage", stage);
    if (assigned_to) q = q.eq("assigned_to", assigned_to);
    const s = query ? sanitize(query) : "";
    if (s) q = q.or(`enquiry_no.ilike.%${s}%,requirement.ilike.%${s}%,notes.ilike.%${s}%`);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, enquiries: data ?? [] });
  },
});
