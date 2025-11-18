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

    try {
      const { data: followerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const followerName = followerProfile?.full_name || 'Bir kullanıcı';
      const message = `${followerName} sizi takip etmeye başladı`;

      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          user_id: input.following_id,
          type: 'FOLLOW',
          title: 'Yeni Takipçi',
          message,
          data: {
            follower_id: user.id,
            follower_name: followerName,
          },
          push_sent: false,
        })
        .select()
        .single();

      if (notification) {
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', input.following_id)
          .maybeSingle();

        if (targetProfile?.push_token) {
          try {
            const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
            await fetch(expoPushUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
              },
              body: JSON.stringify({
                to: targetProfile.push_token,
                sound: 'default',
                title: 'Yeni Takipçi',
                body: message,
                data: {
                  type: 'FOLLOW',
                  follower_id: user.id,
                },
                badge: 1,
              }),
            });

            await supabase
              .from('notifications')
              .update({ push_sent: true })
              .eq('id', notification.id);
          } catch (pushError) {
            console.error('Follow push notification error:', pushError);
          }
        }
      }
    } catch (notificationError) {
      console.error('Follow notification error:', notificationError);
    }

    return {
      success: true,
      follow,
    };
  });

