import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

export const getEventsProcedure = publicProcedure
    .input(
      z.object({
        district: z.string().optional(),
        city: z.enum(['Trabzon', 'Giresun']).optional(),
        category: z.string().optional(),
        severity: z.enum(['CRITICAL', 'HIGH', 'NORMAL', 'LOW']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      console.log('📢 getEvents called with:', input);
      
      let query = supabase
        .from('events')
        .select(`*`, { count: 'exact' })
        .eq('is_active', true)
        .eq('is_deleted', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (input.district) {
        query = query.eq('district', input.district);
      }
      if (input.city) {
        query = query.eq('city', input.city);
      }
      if (input.category) {
        query = query.eq('category', input.category);
      }
      if (input.severity) {
        query = query.eq('severity', input.severity);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ getEvents error:', error);
        throw new Error(error.message);
      }

      let events = data || [];

      if (events.length > 0) {
        const userIds = [...new Set(events.map((event: any) => event.user_id).filter(Boolean))];

        if (userIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, username')
            .in('id', userIds);

          if (profileError) {
            console.error('❌ getEvents profile load error:', profileError);
          } else if (profileData) {
            const profileMap = new Map(profileData.map((profile: any) => [profile.id, profile]));
            events = events.map((event: any) => ({
              ...event,
              user: profileMap.get(event.user_id) || null,
            }));
          }
        }
      }

      console.log('✅ getEvents returned:', events.length, 'events');

      return {
        events,
        total: count || 0,
        hasMore: count ? input.offset + input.limit < count : false,
      };
    });

