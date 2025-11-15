import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const getFollowStatsProcedure = publicProcedure
  .input(
    z.object({
      user_id: z.string().uuid("Geçersiz kullanıcı ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;

    // Takipçi sayısı
    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", input.user_id);

    // Takip sayısı
    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", input.user_id);

    return {
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
    };
  });

