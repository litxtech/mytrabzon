import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const getFollowersProcedure = publicProcedure
  .input(
    z.object({
      user_id: z.string().uuid("Geçersiz kullanıcı ID"),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;

    // Takipçileri getir
    const { data: followers, error } = await supabase
      .from("follows")
      .select(
        `
        follower_id,
        follower:profiles!follows_follower_id_fkey(
          id,
          full_name,
          username,
          avatar_url,
          verified,
          supporter_badge,
          supporter_badge_color
        )
      `
      )
      .eq("following_id", input.user_id)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      console.error("Get followers error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Takipçiler alınamadı",
      });
    }

    // Toplam takipçi sayısı
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", input.user_id);

    return {
      followers: followers?.map((f: any) => ({
        id: f.follower_id,
        full_name: f.follower?.full_name || '',
        username: f.follower?.username || null,
        avatar_url: f.follower?.avatar_url || null,
        verified: f.follower?.verified || false,
        supporter_badge: f.follower?.supporter_badge || false,
        supporter_badge_color: f.follower?.supporter_badge_color || null,
        supporter_badge_visible: f.follower?.supporter_badge_visible || false,
      })) || [],
      total: count || 0,
    };
  });

