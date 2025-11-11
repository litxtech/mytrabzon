import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const getPostsProcedure = protectedProcedure
  .input(
    z.object({
      district: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;

    let query = supabase
      .from("posts")
      .select(
        `
        *,
        user:user_profiles(*)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.district && input.district !== "all") {
      query = query.eq("district", input.district);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Posts getirme hatası:", error);
      throw new Error(error.message);
    }

    return {
      posts: data || [],
      total: count || 0,
    };
  });
