import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../../create-context";

/**
 * Get signed upload URL for direct upload to Supabase Storage
 * This bypasses Edge Functions to avoid WORKER_LIMIT errors
 */
export const getUploadUrlProcedure = protectedProcedure
  .input(
    z.object({
      fileExtension: z.string().min(1),
      contentType: z.string().min(1),
      mediaType: z.enum(["video", "image"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const fileName = `${input.mediaType}-${timestamp}-${random}.${input.fileExtension}`;
      const filePath = `${user.id}/${fileName}`;

      // Create signed upload URL (valid for 60 seconds - TikTok/Instagram style)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("posts")
        .createSignedUploadUrl(filePath, 60);

      if (uploadError) {
        console.error("Error creating signed upload URL:", uploadError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Signed URL oluşturulamadı: ${uploadError.message}`,
        });
      }

      if (!uploadData) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Signed URL verisi alınamadı",
        });
      }

      // Get public URL for the file path
      const { data: urlData } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl || '';

      return {
        uploadUrl: uploadData.signedUrl,
        path: filePath,
        publicUrl,
      };
    } catch (error: any) {
      console.error("getUploadUrl error:", error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message || "Upload URL alınamadı",
      });
    }
  });

