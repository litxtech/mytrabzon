import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const removeFollowerProcedure = protectedProcedure
  .input(
    z.object({
      follower_id: z.string().uuid("Geçersiz kullanıcı ID"),
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

    // Kendini takipçilerinden kaldıramazsın
    if (user.id === input.follower_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Kendinizi takipçilerinizden kaldıramazsınız",
      });
    }

    // Takip kaydını sil (takipçinin sizi takip etmesini engelle)
    const { error: removeError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", input.follower_id)
      .eq("following_id", user.id);

    if (removeError) {
      console.error("Remove follower error:", removeError);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Takipçi kaldırma işlemi başarısız oldu",
      });
    }

    return {
      success: true,
    };
  });

