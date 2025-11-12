import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const createPostProcedure = protectedProcedure
  .input(
    z.object({
      content: z.string().min(1, "İçerik boş olamaz"),
      district: z.string(),
      media_urls: z.array(z.string()).optional(),
      media_type: z.enum(["image", "video", "mixed"]).optional(),
      location_lat: z.number().optional(),
      location_lng: z.number().optional(),
      location_name: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      console.log('Creating post with input:', input);
      console.log('User ID:', user.id);
      console.log('Media URLs:', input.media_urls);

      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: input.content,
          district: input.district,
          media_url: input.media_urls && input.media_urls.length > 0 ? input.media_urls : null,
          media_type: input.media_type || null,
          location_lat: input.location_lat || null,
          location_lng: input.location_lng || null,
          location_name: input.location_name || null,
          tags: input.tags || null,
        })
        .select(`
          *,
          user:user_profiles!posts_user_id_fkey(*)
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
