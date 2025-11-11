import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const uploadPostMediaProcedure = protectedProcedure
  .input(
    z.object({
      base64Data: z.string(),
      fileType: z.string(),
      fileName: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const buffer = Buffer.from(input.base64Data, "base64");
    
    const filePath = `${user.id}/${Date.now()}-${input.fileName}`;

    const { data, error } = await supabase.storage
      .from("posts")
      .upload(filePath, buffer, {
        contentType: input.fileType,
        upsert: false,
      });

    if (error) {
      console.error("Upload hatası:", error);
      throw new Error(error.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("posts").getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  });
