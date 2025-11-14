import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const deletePostProcedure = protectedProcedure
  .input(
    z.object({
      postId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", input.postId)
      .eq("author_id", user.id)
      .single();

    if (fetchError || !post) {
      throw new Error("Post bulunamadı veya yetkisiz erişim");
    }

    // Media dosyalarını sil
    if (post.media && Array.isArray(post.media)) {
      for (const mediaItem of post.media) {
        if (mediaItem.path) {
          const path = mediaItem.path.split("/storage/v1/object/public/posts/")[1] || 
                       mediaItem.path.split("posts/")[1];
          if (path) {
            await supabase.storage.from("posts").remove([path]);
          }
        }
      }
    }

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", input.postId)
      .eq("author_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });
