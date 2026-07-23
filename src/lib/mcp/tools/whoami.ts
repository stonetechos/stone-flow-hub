import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, requireStaffClient, unauthenticated } from "../util";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the signed-in STOS user's id, email, display name and roles. Use this to confirm the MCP connection is bound to the right account.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const staff = await requireStaffClient(ctx);
    if (!staff.ok) {
      return jsonResult({
        user_id: ctx.getUserId(),
        email: ctx.getUserEmail(),
        staff: false,
      });
    }
    const { data: profile } = await staff.client
      .from("profiles")
      .select("id, full_name, job_title, department")
      .eq("id", staff.userId)
      .maybeSingle();
    const { data: roles } = await staff.client
      .from("user_roles")
      .select("role")
      .eq("user_id", staff.userId);
    return jsonResult({
      user_id: staff.userId,
      email: ctx.getUserEmail(),
      profile: profile ?? null,
      roles: (roles ?? []).map((r) => r.role),
      staff: true,
    });
  },
});
