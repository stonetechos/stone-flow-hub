import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireStaffClient, sanitize } from "../util";

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description:
    "Search customers by name, code, phone, email, GST number or city. Returns up to `limit` rows scoped to the signed-in user's access.",
  inputSchema: {
    query: z
      .string()
      .optional()
      .describe("Free-text search term. Omit to list the most recent customers."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const staff = await requireStaffClient(ctx);
    if ("error" in staff) return staff.error;
    let q = staff.client
      .from("customers")
      .select(
        "id, customer_code, name, primary_phone, primary_email, city, state, gst_number, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    const s = query ? sanitize(query) : "";
    if (s) {
      q = q.or(
        [
          `name.ilike.%${s}%`,
          `customer_code.ilike.%${s}%`,
          `primary_phone.ilike.%${s}%`,
          `primary_email.ilike.%${s}%`,
          `gst_number.ilike.%${s}%`,
          `city.ilike.%${s}%`,
        ].join(","),
      );
    }
    const { data, error } = await q;
    if (error) return errorResult(error);
    return jsonResult({ count: data?.length ?? 0, customers: data ?? [] });
  },
});
