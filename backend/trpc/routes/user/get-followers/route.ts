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

    try {
      // Önce takipçi ID'lerini al
      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", input.user_id)
        .order("created_at", { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (followsError) {
        console.error("Get followers error:", followsError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Takipçiler yüklenirken hata oluştu: ${followsError.message}`,
        });
      }

      // Eğer takipçi yoksa boş dizi döndür
      if (!followsData || followsData.length === 0) {
        const { count } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", input.user_id);

        return {
          followers: [],
          total: count || 0,
        };
      }

      // Takipçi ID'lerini al
      const followerIds = followsData.map((f: any) => f.follower_id);

      // Engellenen kullanıcıları filtrele - eğer kullanıcı giriş yaptıysa
      let filteredFollowerIds = followerIds;
      if (ctx.user) {
        const { data: blockedUsers } = await supabase
          .from('user_blocks')
          .select('blocked_id, blocker_id')
          .or(`blocker_id.eq.${input.user_id},blocked_id.eq.${input.user_id}`);
        
        let blockedUserIds: string[] = [];
        if (blockedUsers) {
          // Hem engellediğimiz hem de bizi engelleyen kullanıcıları filtrele
          blockedUserIds = blockedUsers.map((b: any) => 
            b.blocker_id === input.user_id ? b.blocked_id : b.blocker_id
          );
        }

        // Engellenen kullanıcıları takipçiler listesinden çıkar
        if (blockedUserIds.length > 0) {
          filteredFollowerIds = followerIds.filter((id: string) => !blockedUserIds.includes(id));
        }
      }

      // Profil detaylarını al
      let profiles: any[] = [];
      if (filteredFollowerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, verified, supporter_badge, supporter_badge_color, supporter_badge_visible")
          .in("id", filteredFollowerIds);
        
        if (profilesError) {
          console.error("Get profiles error:", profilesError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Profil bilgileri yüklenirken hata oluştu: ${profilesError.message}`,
          });
        }
        profiles = profilesData || [];
      }

      // Profilleri ID'ye göre map'le
      const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Toplam takipçi sayısı
      const { count } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", input.user_id);

      return {
        followers: filteredFollowerIds.map((id: string) => {
          const profile = profilesMap.get(id);
          return {
            id,
            full_name: profile?.full_name || '',
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
            verified: profile?.verified || false,
            supporter_badge: profile?.supporter_badge || false,
            supporter_badge_color: profile?.supporter_badge_color || null,
            supporter_badge_visible: profile?.supporter_badge_visible || false,
          };
        }),
        total: count || 0,
      };
    } catch (error: any) {
      console.error("Get followers error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Takipçiler yüklenirken hata oluştu: ${error.message || error}`,
      });
    }
  });

