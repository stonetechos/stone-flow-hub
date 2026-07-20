/** Installation material tracking — dispatched / received / installed / damaged / returned.
 *  All movements mirror into inventory_movements via RPC record_installation_material. */
import { supabase } from "@/integrations/supabase/client";
import { AppError, mapDbError } from "@/lib/errors";
import { z } from "zod";

export type InstallationMaterial = {
  id: string;
  installation_id: string;
  product_id: string | null;
  description: string | null;
  unit: string | null;
  qty_dispatched: number;
  qty_received: number;
  qty_installed: number;
  qty_damaged: number;
  qty_returned: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InstallationMaterialListItem = InstallationMaterial & {
  product: { id: string; name: string; product_code: string } | null;
};

export const MATERIAL_KINDS = [
  "dispatched",
  "received",
  "installed",
  "damaged",
  "returned",
] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const materialRecordSchema = z.object({
  installation_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  kind: z.enum(MATERIAL_KINDS),
  qty: z.number().positive(),
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type MaterialRecordInput = z.infer<typeof materialRecordSchema>;

export async function listInstallationMaterials(
  installationId: string,
): Promise<InstallationMaterialListItem[]> {
  const { data, error } = await supabase
    .from("installation_materials" as never)
    .select("*, product:products!installation_materials_product_id_fkey(id,name,product_code)")
    .eq("installation_id", installationId)
    .order("created_at", { ascending: false });
  if (error) throw new AppError(mapDbError(error));
  return (data ?? []) as unknown as InstallationMaterialListItem[];
}

export async function recordInstallationMaterial(input: MaterialRecordInput): Promise<string> {
  const p = materialRecordSchema.parse(input);
  const { data, error } = await supabase.rpc(
    "record_installation_material" as never,
    {
      p_installation_id: p.installation_id,
      p_product_id: p.product_id ?? null,
      p_kind: p.kind,
      p_qty: p.qty,
      p_unit: p.unit ?? null,
      p_notes: p.notes ?? null,
      p_description: p.description ?? null,
    } as never,
  );
  if (error) throw new AppError(mapDbError(error));
  return (data as unknown as string) ?? "";
}
