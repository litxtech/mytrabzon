import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

const UPCOMING_BUFFER_MINUTES = 5;

export const searchRidesProcedure = protectedProcedure
  .input(
    z.object({
      from_text: z.string().optional().nullable(),
      to_text: z.string().optional().nullable(),
      date: z.string().datetime().optional().nullable(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;

    const upcomingThreshold = new Date(Date.now() - UPCOMING_BUFFER_MINUTES * 60 * 1000).toISOString();

    let query = supabase
      .from('ride_offers')
      .select(`
        *,
        driver:profiles(id, full_name, avatar_url, verified)
      `)
      .eq('status', 'active')
      .gt('expires_at', upcomingThreshold)
      .gte('departure_time', upcomingThreshold) // Yolculuk tarihi geçmemiş olanlar
      .gt('available_seats', 0);

    // Date filter
    if (input.date) {
      const selectedDate = new Date(input.date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('departure_time', startOfDay.toISOString())
        .lte('departure_time', endOfDay.toISOString());
    }

    // From filter (departure or stops)
    if (input.from_text && input.from_text.trim()) {
      const fromText = `%${input.from_text.trim()}%`;
      query = query.or(`departure_raw.ilike.${fromText},stops_raw.ilike.${fromText}`);
    }

    // To filter (destination or stops)
    if (input.to_text && input.to_text.trim()) {
      const toText = `%${input.to_text.trim()}%`;
      query = query.or(`destination_raw.ilike.${toText},stops_raw.ilike.${toText}`);
    }

    // Order by departure_time ascending
    query = query.order('departure_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Search rides error:', error);
      throw new Error(error.message || 'Yolculuklar aranırken bir hata oluştu');
    }

    const rides = (data || []).map((ride: any) => {
      const { driver_phone, ...rest } = ride;
      return rest;
    });

    return { rides };
  });

