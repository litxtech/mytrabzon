import { protectedProcedure } from "../../../create-context";
import { z } from "zod";

// Placeholder procedure - Gerçek implementasyon Supabase Edge Function'da
export const getPersonalizedFeedProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    // Bu procedure sadece type için kullanılıyor
    // Gerçek implementasyon Supabase Edge Function'da
    // Return type: { posts: Post[], total: number }
    return {
      posts: [] as any[],
      total: 0,
    };
  });

