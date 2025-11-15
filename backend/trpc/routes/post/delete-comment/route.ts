import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const deleteCommentProcedure = protectedProcedure
  .input(
    z.object({
      commentId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("*")
      .eq("id", input.commentId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !comment) {
      throw new Error("Yorum bulunamadı veya yetkisiz erişim");
    }

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", input.commentId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });

