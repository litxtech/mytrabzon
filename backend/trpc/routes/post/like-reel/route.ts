import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const likeReelProcedure = protectedProcedure
  .input(z.object({ reel_id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    return { liked: true };
  });

