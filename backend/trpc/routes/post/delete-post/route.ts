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
      .eq("user_id", user.id)
      .single();

    if (fetchError || !post) {
      throw new Error("Post bulunamadı veya yetkisiz erişim");
    }

    if (post.media_url && Array.isArray(post.media_url)) {
      for (const url of post.media_url) {
        const path = url.split("/storage/v1/object/public/posts/")[1];
        if (path) {
          await supabase.storage.from("posts").remove([path]);
        }
      }
    }

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", input.postId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });
