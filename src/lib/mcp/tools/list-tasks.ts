import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { errorResult, jsonResult, requireStaffClient } from "../util";

type TaskStatus = Database["public"]["Enums"]["task_status"];

export default defineTool({
  name: "list_my_tasks",
  title: "List my tasks",
  description: "List tasks assigned to the signed-in user, most urgent first.",
  inputSchema: {
    include_done: z.boolean().default(false),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ include_done, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) return staff.error;
    let q = staff.client
      .from("tasks")
      .select("id, title, status, priority, due_at, entity_type, entity_id, created_at")
      .eq("assigned_to", staff.userId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (!include_done) q = q.neq("status", "done" as TaskStatus);
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, tasks: data ?? [] });
  },
});
