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
      // Önce post'un yazarını al
      const { data: post } = await supabase
        .from("posts")
        .select("author_id")
        .eq("id", input.post_id)
        .single();

      if (!post) {
        throw new Error("Post bulunamadı");
      }

      // Engelleme kontrolü - post yazarı kullanıcıyı engellemiş mi veya kullanıcı post yazarını engellemiş mi?
      const { data: blockCheck } = await supabase
        .from('user_blocks')
        .select('id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
        .or(`blocker_id.eq.${post.author_id},blocked_id.eq.${post.author_id}`)
        .maybeSingle();

      if (blockCheck) {
        throw new Error("Bu gönderiye yorum yapamazsınız");
      }

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
