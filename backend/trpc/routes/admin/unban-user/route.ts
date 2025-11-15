import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

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

export const unbanUserProcedure = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    // Özel admin için user.id'yi kullan, diğerleri için admin_users tablosundan id al
    let adminUserId = adminUser.id;
    if (user.id === '98542f02-11f8-4ccd-b38d-4dd42066daa7') {
      const { data: adminUserRecord } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      adminUserId = adminUserRecord?.id || user.id;
    }
    
    const { error } = await supabase
      .from("user_bans")
      .update({ is_active: false })
      .eq("user_id", input.userId)
      .eq("is_active", true);
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUserId,
      action_type: "unban_user",
      target_type: "user",
      target_id: input.userId,
      description: "User unbanned",
    });
    
    return { success: true };
  });

