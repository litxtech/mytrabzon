import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const getNotificationsProcedure = protectedProcedure
    .input(
      z.object({
        type: z.enum(['EVENT', 'SYSTEM', 'MESSAGE', 'RESERVATION', 'FOOTBALL']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      if (!user) throw new Error('Unauthorized');

      let query = supabase
        .from('notifications')
        .select(`
          *,
          event:events(id, title, category, severity, district, media_urls, description)
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.type) {
        query = query.eq('type', input.type);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        notifications: data || [],
        total: count || 0,
        hasMore: count ? input.offset + input.limit < count : false,
      };
    });

export const getUnreadCountProcedure = protectedProcedure
    .query(async ({ ctx }) => {
      const { supabase, user } = ctx;
      if (!user) throw new Error('Unauthorized');

      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .is('read_at', null);

      if (error) {
        throw new Error(error.message);
      }

      return { count: data?.length || 0 };
    });

