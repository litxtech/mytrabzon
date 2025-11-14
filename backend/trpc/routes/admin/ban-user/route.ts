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

export const banUserProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string().uuid(),
      reason: z.string().min(1),
      banType: z.enum(["temporary", "permanent"]),
      banUntil: z.string().optional(), // ISO date string
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    // Admin user ID'yi al
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    if (!adminUser) throw new Error("Admin user not found");
    
    const banData: any = {
      user_id: input.userId,
      banned_by: adminUser.id,
      reason: input.reason,
      ban_type: input.banType,
      is_active: true,
    };
    
    if (input.banType === "temporary" && input.banUntil) {
      banData.ban_until = input.banUntil;
    }
    
    const { data, error } = await supabase
      .from("user_bans")
      .insert(banData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "ban_user",
      target_type: "user",
      target_id: input.userId,
      description: `User banned: ${input.reason}`,
    });
    
    return data;
  });

