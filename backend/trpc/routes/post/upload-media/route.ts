import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
        
        // WORKER_LIMIT veya compute resources hatası kontrolü
        const errorMessage = error.message || '';
        const isWorkerLimitError = 
          errorMessage.includes('WORKER_LIMIT') ||
          errorMessage.includes('compute resources') ||
          errorMessage.includes('not having enough compute') ||
          error.code === 'WORKER_LIMIT';
        
        if (isWorkerLimitError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'WORKER_LIMIT',
            cause: error,
          });
        }
        
        // Storage quota hatası
        if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
          throw new TRPCError({
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Storage quota exceeded. Please try again later.',
            cause: error,
          });
        }
        
        // Generic storage error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Storage upload failed: ${error.message}`,
          cause: error,
        });
      }

      if (!data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No data returned from storage upload',
        });
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
      
      // TRPCError ise direkt fırlat
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Diğer hatalar için generic error
      if (error instanceof Error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Media upload failed: ${error.message}`,
          cause: error,
        });
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Media upload failed: Unknown error',
      });
    }
  });
