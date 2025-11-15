import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Admin kontrolü helper
async function checkAdmin(supabase: any, userId: string) {
  // Özel admin bypass
  const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  if (userId === SPECIAL_ADMIN_ID) {
    return { role: 'super_admin' };
  }

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
      filter: z.enum(['all', 'today', 'banned', 'blueTick']).default('all'),
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
        blue_ticks!left(id, verified_at, verification_type, is_active),
        user_bans!left(id, reason, ban_type, ban_until, is_active)
      `, { count: "exact" });
    
    // Filtreler
    if (input.filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else if (input.filter === 'banned') {
      // Banlı kullanıcıları bulmak için subquery kullan
      const { data: bannedUserIds } = await supabase
        .from('user_bans')
        .select('user_id')
        .eq('is_active', true);
      
      if (bannedUserIds && bannedUserIds.length > 0) {
        const userIds = bannedUserIds.map(b => b.user_id);
        query = query.in('id', userIds);
      } else {
        // Banlı kullanıcı yoksa boş sonuç döndür
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    } else if (input.filter === 'blueTick') {
      // Mavi tikli kullanıcıları bulmak için subquery kullan
      const { data: blueTickUserIds } = await supabase
        .from('blue_ticks')
        .select('user_id')
        .eq('is_active', true);
      
      if (blueTickUserIds && blueTickUserIds.length > 0) {
        const userIds = blueTickUserIds.map(b => b.user_id);
        query = query.in('id', userIds);
      } else {
        // Mavi tikli kullanıcı yoksa boş sonuç döndür
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }
    
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

