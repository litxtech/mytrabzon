import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const shareReelProcedure = protectedProcedure
  .input(
    z.object({
      reel_id: z.string().uuid(),
      platform: z.enum(['internal', 'instagram', 'whatsapp', 'external']).default('internal'),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    return {} as any;
  });

