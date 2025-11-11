import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const getPostDetailProcedure = protectedProcedure
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
        user:user_profiles(*)
      `
      )
      .eq("id", input.postId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const { data: liked } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", input.postId)
      .eq("user_id", user.id)
      .single();

    return {
      ...post,
      is_liked: !!liked,
    };
  });
