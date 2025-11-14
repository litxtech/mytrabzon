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

// Public: Herkes görebilir (aktif olanlar)
export const getPoliciesProcedure = publicProcedure
  .query(async ({ ctx }) => {
    const { supabase } = ctx;
    
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    
    if (error) throw new Error(error.message);
    
    return data || [];
  });

// Admin: Tüm politikaları yönetebilir
export const getAllPoliciesProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .order("display_order", { ascending: true });
    
    if (error) throw new Error(error.message);
    
    return data || [];
  });

export const createPolicyProcedure = protectedProcedure
  .input(
    z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      policyType: z.enum(["terms", "privacy", "community", "cookie", "refund", "other"]),
      displayOrder: z.number().default(0),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const { data, error } = await supabase
      .from("policies")
      .insert({
        title: input.title,
        content: input.content,
        policy_type: input.policyType,
        display_order: input.displayOrder,
        created_by: adminUser.id,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "create_policy",
      target_type: "policy",
      target_id: data.id,
      description: `Policy created: ${input.title}`,
    });
    
    return data;
  });

export const updatePolicyProcedure = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      policyType: z.enum(["terms", "privacy", "community", "cookie", "refund", "other"]).optional(),
      displayOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const updateData: any = {
      updated_by: adminUser.id,
    };
    
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.policyType !== undefined) updateData.policy_type = input.policyType;
    if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    
    const { data, error } = await supabase
      .from("policies")
      .update(updateData)
      .eq("id", input.id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "update_policy",
      target_type: "policy",
      target_id: input.id,
      description: `Policy updated: ${input.title || input.id}`,
    });
    
    return data;
  });

export const deletePolicyProcedure = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const { error } = await supabase
      .from("policies")
      .delete()
      .eq("id", input.id);
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "delete_policy",
      target_type: "policy",
      target_id: input.id,
      description: "Policy deleted",
    });
    
    return { success: true };
  });

