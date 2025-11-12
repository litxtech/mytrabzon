import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const sharePostProcedure = protectedProcedure
  .input(
    z.object({
      post_id: z.string().uuid(),
      share_to: z.enum(["feed", "story", "external"]).default("feed"),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      const { data, error } = await supabase
        .from("post_shares")
        .insert({
          post_id: input.post_id,
          user_id: user.id,
          share_to: input.share_to,
        })
        .select()
        .single();

      if (error) {
        console.error("Share post error:", error);
        throw new Error(`Failed to share post: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Share post procedure error:", error);
      if (error instanceof Error) {
        throw new Error(`Post share failed: ${error.message}`);
      }
      throw new Error("Post share failed: Unknown error");
    }
  });
