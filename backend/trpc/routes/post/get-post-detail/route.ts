import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export const getPostDetailProcedure = publicProcedure
  .input(
    z.object({
      postId: z.string().uuid(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    // Lightweight select - sadece gerekli alanlar
    const { data: post, error } = await supabase
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
        ),
        warnings:post_warnings!post_warnings_post_id_fkey(
          id,
          warning_reason,
          warning_message,
          is_resolved,
          created_at
        )
      `
      )
      .eq("id", input.postId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!post) {
      throw new Error('Post bulunamadı');
    }

    let is_liked = false;
    if (user) {
      try {
        const { data: liked } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", input.postId)
          .eq("user_id", user.id)
          .single();
        
        is_liked = !!liked;
      } catch (likeError) {
        // Like kontrolü başarısız olursa sessizce devam et (is_liked = false)
        console.warn('Like kontrolü başarısız:', likeError);
        is_liked = false;
      }
    }

    // Media URL'lerini optimize et
    const SUPABASE_URL = ctx.supabaseUrl || '';
    let optimizedMedia = post.media || [];
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      optimizedMedia = post.media.map((mediaItem: any) => {
        if (mediaItem && mediaItem.path && !mediaItem.path.startsWith('http')) {
          const path = mediaItem.path.startsWith('posts/') 
            ? mediaItem.path 
            : `posts/${mediaItem.path}`;
          
          const fullUrl = `${SUPABASE_URL}/storage/v1/object/public/posts/${path}`;
          const thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/posts/${path}?width=128&height=128&resize=cover`;
          
          return {
            ...mediaItem,
            path: fullUrl,
            thumbnail: thumbnailUrl,
          };
        }
        return mediaItem;
      });
    }

    return {
      ...post,
      media: optimizedMedia,
      is_liked,
    };
  });
