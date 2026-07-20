/**
 * Downstream-existence probes used by GuidedNextStep to auto-suppress the
 * banner once the recommended child artefact already exists.
 *
 * Each probe uses a HEAD count query (no rows transferred) and is cached for
 * 60 s via TanStack Query so navigating between siblings doesn't refetch.
 * Suppression is best-effort — for hops where the schema has no direct FK
 * we return `false` so the banner keeps showing (safer than false-hiding).
 */
import { supabase } from "@/integrations/supabase/client";
import type { GuidedEntity } from "@/lib/guided-workflow/steps";

async function hasAny(table: string, column: string, value: string): Promise<boolean> {
  const { count, error } = await supabase
    // Table name is a build-time literal picked from a fixed allow-list below.
    // Untyped call is intentional to keep this helper generic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/**
 * Returns true iff the recommended child artefact for `entity` already
 * exists. Only hops with a direct FK are probed; the rest return `false`
 * so the banner remains visible.
 */
export async function probeDownstream(entity: GuidedEntity, entityId: string): Promise<boolean> {
  switch (entity) {
    case "customer":
      return hasAny("enquiries", "customer_id", entityId);
    case "enquiry": {
      // Projects don't carry enquiry_id; the enquiry itself is stamped with
      // project_id when converted.
      const { data, error } = await supabase
        .from("enquiries")
        .select("project_id")
        .eq("id", entityId)
        .maybeSingle();
      if (error) throw error;
      return !!data?.project_id;
    }
    case "project":
      return hasAny("quotes", "project_id", entityId);
    case "quote":
      return hasAny("sales_orders", "quote_id", entityId);
    case "invoice":
      return hasAny("payments", "invoice_id", entityId);
    default:
      // sales_order / purchase_order / production_order / dispatch /
      // installation / receipt — no direct FK to probe cheaply. Keep the
      // banner visible; the user can dismiss with "Skip for now".
      return false;
  }
}

export const downstreamQueryKey = (entity: GuidedEntity, entityId: string) =>
  ["guided-downstream", entity, entityId] as const;
