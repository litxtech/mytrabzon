import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const trackReelViewProcedure = protectedProcedure
  .input(
    z.object({
      reel_id: z.string().uuid(),
      watch_start: z.string().optional(),
      watch_end: z.string().optional(),
      completed: z.boolean().default(false),
      duration_watched: z.number().int().min(0).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    return { success: true, view_id: '' };
  });

