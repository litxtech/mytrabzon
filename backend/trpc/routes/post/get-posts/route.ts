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
      let query = supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!posts_author_id_fkey(*)
        `,
          { count: "exact" }
        )
        .eq("archived", input.archived);

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

      return {
        posts: postsWithLikes,
        total: count || 0,
      };
    } catch (error) {
      console.error("Get posts error:", error);
      throw error;
    }
  });
