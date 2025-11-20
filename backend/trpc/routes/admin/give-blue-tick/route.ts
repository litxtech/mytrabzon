import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

async function checkAdmin(supabase: any, userId: string) {
  // Özel admin bypass
  const SPECIAL_ADMIN_ID = '98542f02-11f8-4ccd-b38d-4dd42066daa7';
  if (userId === SPECIAL_ADMIN_ID) {
    // Özel admin için admin_users tablosundan id al
    const { data: adminUserRecord } = await supabase
      .from("admin_users")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (adminUserRecord) {
      return { role: 'super_admin', id: adminUserRecord.id };
    }
    // Eğer admin_users'da kayıt yoksa, özel admin id'sini kullan (nullable verified_by için)
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

export const giveBlueTickProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string().uuid(),
      verificationType: z.enum(["manual", "automatic", "celebrity"]).default("manual"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    // Mevcut blue tick var mı kontrol et
    const { data: existing } = await supabase
      .from("blue_ticks")
      .select("id")
      .eq("user_id", input.userId)
      .maybeSingle();
    
    if (existing) {
      // Güncelle
      const { data, error } = await supabase
        .from("blue_ticks")
        .update({
          is_active: true,
          verified_by: adminUser.id,
          verification_type: input.verificationType,
        })
        .eq("id", existing.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      // Profiles tablosundaki verified alanını güncelle
      await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("id", input.userId);
      
      // Admin log
      await supabase.from("admin_logs").insert({
        admin_id: adminUser.id,
        action_type: "update_blue_tick",
        target_type: "user",
        target_id: input.userId,
        description: `Blue tick updated: ${input.verificationType}`,
      });
      
      return data;
    }
    
    // Yeni blue tick ekle
    const { data, error } = await supabase
      .from("blue_ticks")
      .insert({
        user_id: input.userId,
        verified_by: adminUser.id,
        verification_type: input.verificationType,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Profiles tablosundaki verified alanını güncelle
    await supabase
      .from("profiles")
      .update({ verified: true })
      .eq("id", input.userId);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "give_blue_tick",
      target_type: "user",
      target_id: input.userId,
      description: `Blue tick given: ${input.verificationType}`,
    });
    
    return data;
  });

