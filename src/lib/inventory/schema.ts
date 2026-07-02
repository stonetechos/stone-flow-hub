import { z } from "zod";

export const inventoryCreateSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  location: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  quantity_on_hand: z.number().nonnegative().default(0),
  reorder_level: z.number().nonnegative().default(0),
  notes: z.string().nullable().optional(),
});
export type InventoryCreateInput = z.infer<typeof inventoryCreateSchema>;
