import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const trackPostViewProcedure = protectedProcedure
  .input(
    z.object({
      post_id: z.string().uuid(),
      view_started_at: z.string().optional(),
      view_completed_at: z.string().optional(),
      view_duration_seconds: z.number().optional(),
      completion_rate: z.number().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    throw new Error("Not implemented - Use Supabase Edge Function");
  });

