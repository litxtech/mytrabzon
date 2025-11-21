import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";

export const getBlockedUsersProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      // Kullanıcının engellediği kullanıcıları al
      const { data: blockedData, error: blockedError } = await supabase
        .from("user_blocks")
        .select("blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (blockedError) {
        console.error("Get blocked users error:", blockedError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Engellenen kullanıcılar yüklenirken hata oluştu: ${blockedError.message}`,
        });
      }

      // Eğer engellenen kullanıcı yoksa boş dizi döndür
      if (!blockedData || blockedData.length === 0) {
        const { count } = await supabase
          .from("user_blocks")
          .select("*", { count: "exact", head: true })
          .eq("blocker_id", user.id);

        return {
          blockedUsers: [],
          total: count || 0,
        };
      }

      // Engellenen kullanıcı ID'lerini al
      const blockedIds = blockedData.map((b: any) => b.blocked_id);

      // Profil detaylarını al
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, verified, supporter_badge, supporter_badge_color, supporter_badge_visible")
        .in("id", blockedIds);

      if (profilesError) {
        console.error("Get profiles error:", profilesError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Profil bilgileri yüklenirken hata oluştu: ${profilesError.message}`,
        });
      }

      // Profilleri ID'ye göre map'le
      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Toplam engellenen kullanıcı sayısı
      const { count } = await supabase
        .from("user_blocks")
        .select("*", { count: "exact", head: true })
        .eq("blocker_id", user.id);

      return {
        blockedUsers: blockedIds.map((id: string) => {
          const profile = profilesMap.get(id);
          const blockData = blockedData.find((b: any) => b.blocked_id === id);
          return {
            id,
            full_name: profile?.full_name || '',
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
            verified: profile?.verified || false,
            supporter_badge: profile?.supporter_badge || false,
            supporter_badge_color: profile?.supporter_badge_color || null,
            supporter_badge_visible: profile?.supporter_badge_visible || false,
            blocked_at: blockData?.created_at || null,
          };
        }),
        total: count || 0,
      };
    } catch (error: any) {
      console.error("Get blocked users error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Engellenen kullanıcılar yüklenirken hata oluştu: ${error.message || error}`,
      });
    }
  });

