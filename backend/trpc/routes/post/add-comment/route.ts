import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const addCommentProcedure = protectedProcedure
  .input(
    z.object({
      post_id: z.string().uuid(),
      content: z.string().min(1, "Yorum boş olamaz").max(1000, "Yorum 1000 karakterden uzun olamaz"),
      mentions: z.array(z.string().uuid()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: input.post_id,
          user_id: user.id,
          content: input.content,
          likes_count: 0,
        })
        .select(`
          *,
          user:profiles!comments_user_id_fkey(*)
        `)
        .single();

      if (error) {
        console.error("Comment creation error:", error);
        throw new Error(`Failed to create comment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Add comment procedure error:", error);
      if (error instanceof Error) {
        throw new Error(`Comment creation failed: ${error.message}`);
      }
      throw new Error("Comment creation failed: Unknown error");
    }
  });
