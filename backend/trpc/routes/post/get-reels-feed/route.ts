import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const getReelsFeedProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    // Return type: { reels: Post[], total: number }
    return {
      reels: [] as any[],
      total: 0,
    };
  });

