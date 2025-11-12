import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[\wşığüçöŞİĞÜÇÖ]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
}

export const createPostProcedure = protectedProcedure
  .input(
    z.object({
      content: z.string().min(1, "İçerik boş olamaz").max(2000, "İçerik 2000 karakterden uzun olamaz"),
      district: z.string(),
      media_urls: z.array(z.string()).max(5, "En fazla 5 medya ekleyebilirsiniz").optional(),
      visibility: z.enum(["public", "friends", "private"]).default("public"),
      mentions: z.array(z.string().uuid()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      console.log('Creating post with input:', input);
      console.log('User ID:', user.id);

      const hashtags = extractHashtags(input.content);
      
      let media = null;
      if (input.media_urls && input.media_urls.length > 0) {
        media = input.media_urls.map(url => ({
          type: url.toLowerCase().includes('video') ? 'video' : 'image',
          path: url
        }));
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content: input.content,
          district: input.district,
          media: media,
          hashtags: hashtags.length > 0 ? hashtags : null,
          mentions: input.mentions && input.mentions.length > 0 ? input.mentions : null,
          visibility: input.visibility,
          like_count: 0,
          comment_count: 0,
          share_count: 0,
          views_count: 0,
          is_pinned: false,
          edited: false,
          archived: false,
        })
        .select(`
          *,
          author:user_profiles!posts_author_id_fkey(*)
        `)
        .single();

      if (error) {
        console.error("Database insert error:", error);
        throw new Error(`Failed to create post: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data returned from database");
      }

      console.log('Post created successfully:', data.id);
      return data;
    } catch (error) {
      console.error("Create post procedure error:", error);
      if (error instanceof Error) {
        throw new Error(`Post creation failed: ${error.message}`);
      }
      throw new Error("Post creation failed: Unknown error");
    }
  });
