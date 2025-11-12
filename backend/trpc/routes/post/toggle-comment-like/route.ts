import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const toggleCommentLikeProcedure = protectedProcedure
  .input(
    z.object({
      comment_id: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      const { data: existing } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", input.comment_id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", input.comment_id)
          .eq("user_id", user.id);

        if (error) throw new Error(error.message);

        return { liked: false };
      }

      const { error } = await supabase
        .from("comment_likes")
        .insert({
          comment_id: input.comment_id,
          user_id: user.id,
        });

      if (error) throw new Error(error.message);

      return { liked: true };
    } catch (error) {
      console.error("Toggle comment like error:", error);
      throw error;
    }
  });
