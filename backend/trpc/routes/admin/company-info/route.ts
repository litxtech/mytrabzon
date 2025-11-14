import { publicProcedure, protectedProcedure } from "../../../create-context";
import { z } from "zod";

async function checkAdmin(supabase: any, userId: string) {
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

// Public: Herkes görebilir
export const getCompanyInfoProcedure = publicProcedure
  .query(async ({ ctx }) => {
    const { supabase } = ctx;
    
    const { data, error } = await supabase
      .from("company_info")
      .select("*")
      .single();
    
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    
    return data || null;
  });

// Admin: Güncelleyebilir
export const updateCompanyInfoProcedure = protectedProcedure
  .input(
    z.object({
      companyName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      website: z.string().url().optional(),
      socialMedia: z.record(z.string()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const updateData: any = {
      updated_by: adminUser.id,
    };
    
    if (input.companyName !== undefined) updateData.company_name = input.companyName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.website !== undefined) updateData.website = input.website;
    if (input.socialMedia !== undefined) updateData.social_media = input.socialMedia;
    
    // Upsert (yoksa oluştur, varsa güncelle)
    const { data, error } = await supabase
      .from("company_info")
      .upsert(updateData, { onConflict: "id" })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "update_company_info",
      target_type: "company_info",
      description: "Company info updated",
    });
    
    return data;
  });

