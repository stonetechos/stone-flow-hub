/** Document lineage — track every Estimate → Quote → SO → Production → Dispatch → Invoice → Receipt hop.
 *  Purely additive; existing convert_* RPCs continue to work. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { DbTable } from "@/lib/types";

export type LineageRow = DbTable<"document_lineage">;

export type DocType =
  | "enquiry"
  | "estimate"
  | "quote"
  | "sales_order"
  | "production_order"
  | "dispatch"
  | "invoice"
  | "receipt";

export interface RecordConversionInput {
  sourceType: DocType;
  sourceId: string;
  targetType: DocType;
  targetId: string;
  customerId?: string | null;
  projectId?: string | null;
  meta?: Record<string, unknown>;
}

export async function recordConversion(input: RecordConversionInput): Promise<LineageRow> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("document_lineage")
    .insert({
      source_type: input.sourceType,
      source_id: input.sourceId,
      target_type: input.targetType,
      target_id: input.targetId,
      customer_id: input.customerId ?? null,
      project_id: input.projectId ?? null,
      converted_by: user.user?.id ?? null,
      meta: (input.meta ?? {}) as never,
    })
    .select("*")
    .single();
  if (error) throw new AppError(mapDbError(error));
  return data;
}

/** All lineage rows where the given doc participates (as source OR target). */
export async function getLineageForDoc(type: DocType, id: string): Promise<LineageRow[]> {
  const { data, error } = await supabase
    .from("document_lineage")
    .select("*")
    .or(
      `and(source_type.eq.${type},source_id.eq.${id}),and(target_type.eq.${type},target_id.eq.${id})`,
    )
    .order("converted_at", { ascending: true });
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}

/** All lineage rows for a customer, most recent first. */
export async function getLineageForCustomer(customerId: string): Promise<LineageRow[]> {
  const { data, error } = await supabase
    .from("document_lineage")
    .select("*")
    .eq("customer_id", customerId)
    .order("converted_at", { ascending: false })
    .limit(200);
  if (error) throw new AppError(mapDbError(error));
  return data ?? [];
}
