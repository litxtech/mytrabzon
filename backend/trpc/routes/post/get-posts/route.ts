import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const getPostsProcedure = publicProcedure
  .input(
    z.object({
      district: z.string().optional(),
      sort: z.enum(["new", "hot", "trending"]).default("new"),
      visibility: z.enum(["public", "friends", "private"]).optional(),
      archived: z.boolean().default(false),
      author_id: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      // Engellenen kullanıcıların ID'lerini al (eğer kullanıcı giriş yaptıysa)
      let blockedUserIds: string[] = [];
      if (user) {
        const { data: blockedUsers } = await supabase
          .from('user_blocks')
          .select('blocked_id, blocker_id')
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        
        if (blockedUsers) {
          // Hem engellediğimiz hem de bizi engelleyen kullanıcıları filtrele
          blockedUserIds = blockedUsers.map(b => 
            b.blocker_id === user.id ? b.blocked_id : b.blocker_id
          );
        }
      }

      // Lightweight select - sadece gerekli alanlar
      let query = supabase
        .from("posts")
        .select(
          `
          id,
          author_id,
          content,
          media,
          like_count,
          comment_count,
          share_count,
          views_count,
          created_at,
          updated_at,
          district,
          visibility,
          author:profiles!posts_author_id_fkey(
            id,
            full_name,
            username,
            avatar_url,
            verified,
            supporter_badge,
            supporter_badge_visible,
            supporter_badge_color
          )
        `,
          { count: "exact" }
        )
        .eq("archived", input.archived);

      // Engellenen kullanıcıların postlarını filtrele
      if (blockedUserIds.length > 0) {
        query = query.not('author_id', 'in', `(${blockedUserIds.join(',')})`);
      }

      if (input.district && input.district !== "all") {
        query = query.eq("district", input.district);
      }

      if (input.author_id) {
        query = query.eq("author_id", input.author_id);
        // Eğer kullanıcı kendi gönderilerini görüntülüyorsa, tüm visibility seviyelerini göster
        if (user && input.author_id === user.id) {
          // Kullanıcı kendi gönderilerini görüntülüyor, visibility filtresi uygulama
        } else {
          // Başka birinin gönderilerini görüntülüyor, sadece public göster
          if (!input.visibility) {
            query = query.eq("visibility", "public");
          }
        }
      } else {
        // Genel feed için visibility filtresi
        if (input.visibility) {
          query = query.eq("visibility", input.visibility);
        } else {
          query = query.eq("visibility", "public");
        }
      }

      if (input.sort === "new") {
        query = query.order("created_at", { ascending: false });
      } else if (input.sort === "hot" || input.sort === "trending") {
        query = query.order("like_count", { ascending: false });
        query = query.order("created_at", { ascending: false });
      }

      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      let postsWithLikes = data || [];
      
      if (user) {
        const postIds = postsWithLikes.map(p => p.id);
        if (postIds.length > 0) {
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .in("post_id", postIds)
            .eq("user_id", user.id);

          const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
          postsWithLikes = postsWithLikes.map(post => ({
            ...post,
            is_liked: likedPostIds.has(post.id)
          }));
        }
      }

      // Media URL'lerini optimize et - thumbnail ve full URL'leri ekle
      const SUPABASE_URL = ctx.supabaseUrl || '';
      const optimizedPosts = postsWithLikes.map(post => {
        if (post.media && Array.isArray(post.media)) {
          const optimizedMedia = post.media.map((mediaItem: any) => {
            if (mediaItem.path) {
              // Storage path'inden URL oluştur
              let fullUrl = mediaItem.path;
              let thumbnailUrl = mediaItem.path;

              // Eğer path zaten URL değilse, Supabase storage URL'i oluştur
              if (!mediaItem.path.startsWith('http')) {
                const path = mediaItem.path.startsWith('posts/') 
                  ? mediaItem.path 
                  : `posts/${mediaItem.path}`;
                
                fullUrl = `${SUPABASE_URL}/storage/v1/object/public/posts/${path}`;
                // Thumbnail için transform ekle (128px)
                thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/posts/${path}?width=128&height=128&resize=cover`;
              }

              return {
                ...mediaItem,
                path: fullUrl,
                thumbnail: thumbnailUrl,
              };
            }
            return mediaItem;
          });

          return {
            ...post,
            media: optimizedMedia,
          };
        }
        return post;
      });

      return {
        posts: optimizedPosts,
        total: count || 0,
      };
    } catch (error) {
      console.error("Get posts error:", error);
      throw error;
    }
  });
