import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const followUserProcedure = protectedProcedure
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

    // Kendini takip edemez
    if (user.id === input.following_id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Kendinizi takip edemezsiniz",
      });
    }

    // Kullanıcının var olup olmadığını kontrol et
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.following_id)
      .single();

    if (userError || !targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Kullanıcı bulunamadı",
      });
    }

    // Zaten takip ediliyor mu kontrol et
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", input.following_id)
      .maybeSingle();

    if (existingFollow) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Bu kullanıcıyı zaten takip ediyorsunuz",
      });
    }

    // Takip kaydı oluştur
    const { data: follow, error: followError } = await supabase
      .from("follows")
      .insert({
        follower_id: user.id,
        following_id: input.following_id,
      })
      .select()
      .single();

    if (followError) {
      console.error("Follow error:", followError);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Takip işlemi başarısız oldu",
      });
    }

    return {
      success: true,
      follow,
    };
  });

