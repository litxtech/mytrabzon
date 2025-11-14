import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const uploadReelProcedure = protectedProcedure
  .input(
    z.object({
      content: z.string().min(1).max(2000),
      video_url: z.string().url(),
      thumbnail_url: z.string().url().optional(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      duration_seconds: z.number().int().positive().max(60),
      tags: z.array(z.string()).optional(),
      district: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    return {} as any;
  });

