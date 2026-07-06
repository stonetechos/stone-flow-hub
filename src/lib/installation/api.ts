/** Installation / piece tracking API — production_pieces table. */
import { supabase } from "@/integrations/supabase/client";

export type InstallationStatus =
  | "ready" | "packed" | "loaded" | "dispatched" | "delivered"
  | "installed" | "damaged" | "replacement_required" | "replaced" | "returned";

export const INSTALLATION_STATUSES: InstallationStatus[] = [
  "ready", "packed", "loaded", "dispatched", "delivered",
  "installed", "damaged", "replacement_required", "replaced", "returned",
];

export const INSTALLATION_LABEL: Record<InstallationStatus, string> = {
  ready: "Ready",
  packed: "Packed",
  loaded: "Loaded",
  dispatched: "Dispatched",
  delivered: "Delivered",
  installed: "Installed",
  damaged: "Damaged",
  replacement_required: "Replacement Required",
  replaced: "Replaced",
  returned: "Returned",
};

export type ProductionPiece = {
  id: string;
  production_order_id: string;
  project_id: string | null;
  piece_no: string;
  bundle_no: string | null;
  crate_no: string | null;
  room: string | null;
  elevation: string | null;
  wall: string | null;
  drawing_ref: string | null;
  revision: string | null;
  install_sequence: number | null;
  status: InstallationStatus;
  status_at: string;
  notes: string | null;
};

export async function listPiecesForOrder(orderId: string): Promise<ProductionPiece[]> {
  const { data, error } = await supabase
    .from("production_pieces" as never)
    .select("*")
    .eq("production_order_id", orderId)
    .order("install_sequence", { ascending: true, nullsFirst: false })
    .order("piece_no");
  if (error) throw error;
  return (data ?? []) as unknown as ProductionPiece[];
}

export async function listPiecesForProject(projectId: string): Promise<ProductionPiece[]> {
  const { data, error } = await supabase
    .from("production_pieces" as never)
    .select("*")
    .eq("project_id", projectId)
    .order("room").order("install_sequence");
  if (error) throw error;
  return (data ?? []) as unknown as ProductionPiece[];
}

export async function createPiece(input: Omit<ProductionPiece, "id" | "status_at"> & { status?: InstallationStatus }) {
  const { error } = await supabase.from("production_pieces" as never).insert(input as never);
  if (error) throw error;
}

export async function updatePieceStatus(id: string, status: InstallationStatus, notes?: string) {
  const patch: Record<string, unknown> = { status, status_at: new Date().toISOString() };
  if (notes !== undefined) patch.notes = notes;
  const { error } = await supabase.from("production_pieces" as never).update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deletePiece(id: string) {
  const { error } = await supabase.from("production_pieces" as never).delete().eq("id", id);
  if (error) throw error;
}
