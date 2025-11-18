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

export const getKycRequestsProcedure = protectedProcedure
  .input(
    z.object({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    // Önce kyc_requests'leri al, sonra profiles ile join et
    let query = supabase
      .from("kyc_requests")
      .select(`
        *,
        documents:kyc_documents(*),
        reviewer:admin_users!kyc_requests_reviewed_by_fkey(id, email)
      `, { count: "exact" })
      .order("created_at", { ascending: false });
    
    if (input.status) {
      query = query.eq("status", input.status);
    }
    
    query = query.range(input.offset, input.offset + input.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw new Error(error.message);
    
    // Profiles bilgilerini ayrı query ile al
    const userIds = (data || []).map((req: any) => req.user_id);
    let userProfiles: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      
      if (profiles) {
        profiles.forEach((profile: any) => {
          userProfiles[profile.id] = profile;
        });
      }
    }
    
    // Her request'e user bilgisini ekle
    const requestsWithUsers = (data || []).map((req: any) => ({
      ...req,
      user: userProfiles[req.user_id] || null,
    }));
    
    return {
      requests: requestsWithUsers,
      total: count || 0,
    };
  });

export const approveKycProcedure = protectedProcedure
  .input(
    z.object({
      kycId: z.string().uuid(),
      reviewNotes: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const { data, error } = await supabase
      .from("kyc_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
        review_notes: input.reviewNotes || "Kimlik doğrulama onaylandı",
      })
      .eq("id", input.kycId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "approve_kyc",
      target_type: "kyc_request",
      target_id: input.kycId,
      description: `KYC approved: ${data.full_name}`,
    });
    
    return data;
  });

export const rejectKycProcedure = protectedProcedure
  .input(
    z.object({
      kycId: z.string().uuid(),
      reviewNotes: z.string().min(1, "Red nedeni zorunludur"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const adminUser = await checkAdmin(supabase, user.id);
    
    const { data, error } = await supabase
      .from("kyc_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser.id,
        review_notes: input.reviewNotes,
      })
      .eq("id", input.kycId)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Admin log
    await supabase.from("admin_logs").insert({
      admin_id: adminUser.id,
      action_type: "reject_kyc",
      target_type: "kyc_request",
      target_id: input.kycId,
      description: `KYC rejected: ${data.full_name} - ${input.reviewNotes}`,
    });
    
    return data;
  });

