import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireStaffClient } from "../util";

export default defineTool({
  name: "list_my_tasks",
  title: "List my tasks",
  description: "List open tasks assigned to the signed-in user, most urgent first.",
  inputSchema: {
    include_completed: z.boolean().default(false),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_completed, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if ("error" in staff) return staff.error;
    let q = staff.client
      .from("tasks")
      .select("id, title, status, priority, due_date, entity_type, entity_id, created_at")
      .eq("assignee_id", staff.userId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (!include_completed) q = q.neq("status", "done" as never);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, tasks: data ?? [] });
  },
});
