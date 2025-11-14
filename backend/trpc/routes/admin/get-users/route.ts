import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Admin kontrolü helper
async function checkAdmin(supabase: any, userId: string) {
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();
  
  if (!adminUser) {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return adminUser;
}

export const getUsersProcedure = protectedProcedure
  .input(
    z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    let query = supabase
      .from("profiles")
      .select(`
        *,
        blue_ticks!left(id, verified_at, verification_type),
        user_bans!left(id, reason, ban_type, ban_until, is_active)
      `, { count: "exact" });
    
    if (input.search) {
      query = query.or(`full_name.ilike.%${input.search}%,email.ilike.%${input.search}%`);
    }
    
    query = query
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw new Error(error.message);
    
    return {
      users: data || [],
      total: count || 0,
    };
  });

