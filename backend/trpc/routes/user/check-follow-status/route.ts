import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const checkFollowStatusProcedure = protectedProcedure
  .input(
    z.object({
      user_id: z.string().uuid("Geçersiz kullanıcı ID"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) {
      return { is_following: false };
    }

    // Takip durumunu kontrol et
    const { data: follow, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", input.user_id)
      .maybeSingle();

    if (error) {
      console.error("Check follow status error:", error);
      return { is_following: false };
    }

    return {
      is_following: !!follow,
    };
  });

