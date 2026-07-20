/** Manual trigger for the overdue-procurement follow-up generator. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";

export async function runOverdueProcurementFollowups(): Promise<number> {
  const { data, error } = await supabase.rpc("generate_overdue_procurement_followups" as never);
  if (error) throw new AppError(mapDbError(error));
  return Number(data ?? 0);
}
