import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const likePostProcedure = protectedProcedure
  .input(
    z.object({
      postId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data: existing } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", input.postId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", input.postId)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);

      return { liked: false };
    }

    const { error } = await supabase
      .from("post_likes")
      .insert({
        post_id: input.postId,
        user_id: user.id,
      });

    if (error) throw new Error(error.message);

    return { liked: true };
  });
