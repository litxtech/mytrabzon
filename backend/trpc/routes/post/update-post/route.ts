import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\wşığüçöŞİĞÜÇÖ]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

export const updatePostProcedure = protectedProcedure
  .input(
    z.object({
      postId: z.string().uuid(),
      content: z.string().min(1, "İçerik boş olamaz").max(2000, "İçerik 2000 karakterden uzun olamaz").optional(),
      district: z.string().optional(),
      media_urls: z.array(z.string()).max(5, "En fazla 5 medya ekleyebilirsiniz").optional(),
      visibility: z.enum(["public", "friends", "private"]).optional(),
      mentions: z.array(z.string().uuid()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      // Önce post'un kullanıcıya ait olduğunu kontrol et
      const { data: existingPost, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", input.postId)
        .eq("author_id", user.id)
        .single();

      if (fetchError || !existingPost) {
        throw new Error("Post bulunamadı veya yetkisiz erişim");
      }

      // Güncellenecek verileri hazırla
      const updateData: any = {
        updated_at: new Date().toISOString(),
        edited: true,
      };

      if (input.content !== undefined) {
        updateData.content = input.content;
        updateData.hashtags = extractHashtags(input.content);
      }

      if (input.district !== undefined) {
        updateData.district = input.district;
      }

      if (input.media_urls !== undefined) {
        if (input.media_urls.length > 0) {
          updateData.media = input.media_urls.map(url => ({
            type: url.toLowerCase().includes('video') ? 'video' : 'image',
            path: url
          }));
        } else {
          updateData.media = null;
        }
      }

      if (input.visibility !== undefined) {
        updateData.visibility = input.visibility;
      }

      if (input.mentions !== undefined) {
        updateData.mentions = input.mentions.length > 0 ? input.mentions : null;
      }

      const { data, error } = await supabase
        .from("posts")
        .update(updateData)
        .eq("id", input.postId)
        .eq("author_id", user.id)
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*)
        `)
        .single();

      if (error) {
        console.error("Database update error:", error);
        throw new Error(`Failed to update post: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data returned from database");
      }

      return data;
    } catch (error) {
      console.error("Update post procedure error:", error);
      if (error instanceof Error) {
        throw new Error(`Post update failed: ${error.message}`);
      }
      throw new Error("Post update failed: Unknown error");
    }
  });

