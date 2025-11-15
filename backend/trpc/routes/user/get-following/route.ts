import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const getFollowingProcedure = publicProcedure
  .input(
    z.object({
      user_id: z.string().uuid("Geçersiz kullanıcı ID"),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;

    // Takip edilenleri getir
    const { data: following, error } = await supabase
      .from("follows")
      .select(
        `
        following_id,
        following:profiles!follows_following_id_fkey(
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
      .eq("follower_id", input.user_id)
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      console.error("Get following error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Takip edilenler alınamadı",
      });
    }

    // Toplam takip sayısı
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", input.user_id);

    return {
      following: following?.map((f: any) => ({
        id: f.following_id,
        full_name: f.following?.full_name || '',
        username: f.following?.username || null,
        avatar_url: f.following?.avatar_url || null,
        verified: f.following?.verified || false,
        supporter_badge: f.following?.supporter_badge || false,
        supporter_badge_color: f.following?.supporter_badge_color || null,
        supporter_badge_visible: f.following?.supporter_badge_visible || false,
      })) || [],
      total: count || 0,
    };
  });

