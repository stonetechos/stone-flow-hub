/**
 * Shared authorization helper for internal AI server functions.
 *
 * These endpoints call the paid AI Gateway and are meant for internal
 * staff only. `requireSupabaseAuth` alone would let any signed-in
 * account (including vendor-portal users) invoke them, so every AI
 * handler must additionally assert a staff role.
 */
type SupabaseLike = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
};

export async function requireStaff(ctx: { supabase: unknown; userId: string }): Promise<void> {
  const supabase = ctx.supabase as SupabaseLike;
  const { data, error } = await supabase.rpc("has_staff_access", { _user_id: ctx.userId });
  if (error) throw new Error("Role check failed");
  if (!data) throw new Error("Staff role required");
}
