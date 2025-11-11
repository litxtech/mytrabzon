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

    try {
      console.log('Uploading media for user:', user.id);
      console.log('File type:', input.fileType, 'File name:', input.fileName);

      const buffer = Buffer.from(input.base64Data, "base64");
      
      const filePath = `${user.id}/${Date.now()}-${input.fileName}`;

      const { data, error } = await supabase.storage
        .from("posts")
        .upload(filePath, buffer, {
          contentType: input.fileType,
          upsert: false,
        });

      if (error) {
        console.error("Storage upload error:", error);
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      if (!data) {
        throw new Error("No data returned from storage upload");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(data.path);

      console.log('Upload successful:', publicUrl);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error("Upload procedure error:", error);
      if (error instanceof Error) {
        throw new Error(`Media upload failed: ${error.message}`);
      }
      throw new Error("Media upload failed: Unknown error");
    }
  });
