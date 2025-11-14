import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

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

export const unbanUserProcedure = protectedProcedure
  .input(z.object({ userId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (!adminUser) throw new Error("Admin user not found");
    
    const { error } = await supabase
      .from("user_bans")
      .update({ is_active: false })
      .eq("user_id", input.userId)
      .eq("is_active", true);
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "unban_user",
      target_type: "user",
      target_id: input.userId,
      description: "User unbanned",
    });
    
    return { success: true };
  });

