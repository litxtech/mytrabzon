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

    const { data: post, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        author:profiles!posts_author_id_fkey(*)
      `
      )
      .eq("id", input.postId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let is_liked = false;
    if (user) {
      const { data: liked } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", input.postId)
        .eq("user_id", user.id)
        .single();
      
      is_liked = !!liked;
    }

    return {
      ...post,
      is_liked,
    };
  });
