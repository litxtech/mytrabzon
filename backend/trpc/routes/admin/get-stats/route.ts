import { protectedProcedure } from "../../../create-context";

async function checkAdmin(supabase: any, userId: string) {
  // Özel admin bypass
  const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  if (userId === SPECIAL_ADMIN_ID) {
    return { role: 'super_admin', id: SPECIAL_ADMIN_ID };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role, id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();
  
  if (!adminUser) {
    throw new Error("Unauthorized: Admin access required");
  }
  
  return adminUser;
}

export const getStatsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    // Bugünkü kayıtlar
    const { data: todayRegistrations } = await supabase.rpc('get_today_registrations');
    
    // Bugünkü şikayetler
    const { data: todayReports } = await supabase.rpc('get_today_reports');
    
    // Toplam kullanıcı
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    
    // Toplam gönderi
    const { count: totalPosts } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);
    
    // Toplam banlı kullanıcı
    const { count: bannedUsers } = await supabase
      .from("user_bans")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    
    // Toplam mavi tikli kullanıcı
    const { count: blueTickUsers } = await supabase
      .from("blue_ticks")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    
    // Bekleyen destek ticket'ları
    const { count: pendingTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
    
    // Bekleyen şikayetler
    const { count: pendingReports } = await supabase
      .from("user_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    
    return {
      todayRegistrations: todayRegistrations || 0,
      todayReports: todayReports || 0,
      totalUsers: totalUsers || 0,
      totalPosts: totalPosts || 0,
      bannedUsers: bannedUsers || 0,
      blueTickUsers: blueTickUsers || 0,
      pendingTickets: pendingTickets || 0,
      pendingReports: pendingReports || 0,
    };
  });

