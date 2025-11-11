import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const uploadAvatarProcedure = protectedProcedure
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

    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((file) => `${user.id}/${file.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: input.fileType,
        upsert: false,
      });

    if (error) {
      console.error("Avatar upload hatası:", error);
      throw new Error(error.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(data.path);

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      url: publicUrl,
      path: data.path,
    };
  });
