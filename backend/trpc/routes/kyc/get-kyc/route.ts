import { protectedProcedure } from "../../../create-context";

export const getKycProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    const { data: kycRequest, error } = await supabase
      .from("kyc_requests")
      .select(`
        *,
        documents:kyc_documents(*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== "PGRST116") {
      throw new Error(error.message);
    }
    
    return kycRequest || null;
  });

