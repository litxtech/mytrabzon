import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const unfollowUserProcedure = protectedProcedure
  .input(
    z.object({
      following_id: z.string().uuid("Geçersiz kullanıcı ID"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Giriş yapmanız gerekiyor",
      });
    }

    // Takip kaydını sil
    const { error: unfollowError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", input.following_id);

    if (unfollowError) {
      console.error("Unfollow error:", unfollowError);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Takipten çıkma işlemi başarısız oldu",
      });
    }

    return {
      success: true,
    };
  });

