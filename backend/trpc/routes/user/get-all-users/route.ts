import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export const getAllUsersProcedure = protectedProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      search: z.string().optional(),
      gender: z.enum(['male', 'female', 'other', 'all']).optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;
    const { page, limit, search, gender } = input;
    const offset = (page - 1) * limit;

    console.log('Getting all users:', { page, limit, search, gender });

    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, city, district, created_at, verified, gender, public_id', { count: 'exact' })
      .eq('show_in_directory', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
    }

    if (gender && gender !== 'all') {
      query = query.eq('gender', gender);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error('Kullanıcılar yüklenirken bir hata oluştu');
    }

    console.log('Users fetched:', { count: data?.length, total: count });

    return {
      users: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: count ? offset + limit < count : false,
    };
  });
