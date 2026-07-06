/** RFQ list API for the global RFQ browser. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import type { Database } from "@/integrations/supabase/types";

export type RfqStatus = Database["public"]["Enums"]["rfq_status"];

export interface RfqListItem {
  id: string;
  rfq_no: string;
  status: RfqStatus;
  due_date: string | null;
  created_at: string;
  enquiry: { id: string; enquiry_no: string } | null;
  project: { id: string; name: string } | null;
  vendor_count: number;
  response_count: number;
}

export async function listRfqs(q: string, status: string): Promise<RfqListItem[]> {
  let query = supabase
    .from("rfqs")
    .select(
      `id,rfq_no,status,due_date,created_at,
       enquiry:enquiries!rfqs_enquiry_id_fkey(id,enquiry_no),
       project:projects!rfqs_project_id_fkey(id,name),
       vendor_requests(id,response_status)`,
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("rfq_no", `%${q}%`);
  if (status) query = query.eq("status", status as RfqStatus);
  const { data, error } = await query;
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []).map((r) => {
    const reqs = (r.vendor_requests ?? []) as Array<{ response_status: string | null }>;
    const responded = reqs.filter((v) => v.response_status && v.response_status !== "pending");
    return {
      id: r.id,
      rfq_no: r.rfq_no,
      status: r.status,
      due_date: r.due_date,
      created_at: r.created_at,
      enquiry: r.enquiry,
      project: r.project,
      vendor_count: reqs.length,
      response_count: responded.length,
    };
  });
}
