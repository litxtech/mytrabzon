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

export const getAllPostsProcedure = protectedProcedure
  .input(
    z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    
    if (!user) throw new Error("Unauthorized");
    
    await checkAdmin(supabase, user.id);
    
    let query = supabase
      .from("posts")
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, username),
        post_media(*),
        warnings:post_warnings!post_warnings_post_id_fkey(id, warning_reason, warning_message, is_resolved, created_at)
      `, { count: "exact" })
      .eq("is_deleted", false);
    
    if (input.search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = input.search.trim().slice(0, 200); // Max 200 chars
      if (sanitizedSearch.length > 0) {
        query = query.ilike('content', `%${sanitizedSearch}%`);
      }
    }
    
    query = query
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw new Error(error.message);
    
    return {
      posts: data || [],
      total: count || 0,
    };
  });

