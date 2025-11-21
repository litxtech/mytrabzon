import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const getCommentsProcedure = publicProcedure
  .input(
    z.object({
      post_id: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      const { data, error, count } = await supabase
        .from("comments")
        .select(
          `
          *,
          user:profiles!comments_user_id_fkey(
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
        .eq("post_id", input.post_id)
        .order("created_at", { ascending: true })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        throw new Error(error.message);
      }

      let commentsWithLikes = data || [];
      
      // Engellenen kullanıcıların yorumlarını filtrele
      if (user) {
        // Engellenen kullanıcıları al
        const { data: blockedUsers } = await supabase
          .from('user_blocks')
          .select('blocked_id, blocker_id')
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        
        let blockedUserIds: string[] = [];
        if (blockedUsers) {
          blockedUserIds = blockedUsers.map(b => 
            b.blocker_id === user.id ? b.blocked_id : b.blocker_id
          );
        }

        // Engellenen kullanıcıların yorumlarını filtrele
        if (blockedUserIds.length > 0) {
          commentsWithLikes = commentsWithLikes.filter(
            (comment: any) => !blockedUserIds.includes(comment.user_id)
          );
        }

        const commentIds = commentsWithLikes.map((c: any) => c.id);
        if (commentIds.length > 0) {
          const { data: likes } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .in("comment_id", commentIds)
            .eq("user_id", user.id);

          const likedCommentIds = new Set(likes?.map(l => l.comment_id) || []);
          commentsWithLikes = commentsWithLikes.map((comment: any) => ({
            ...comment,
            is_liked: likedCommentIds.has(comment.id)
          }));
        }
      }

      return {
        comments: commentsWithLikes,
        total: count || 0,
      };
    } catch (error) {
      console.error("Get comments error:", error);
      throw error;
    }
  });
