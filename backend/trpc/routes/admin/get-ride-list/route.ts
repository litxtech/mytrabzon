import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { ensureAdmin } from '../utils';

export const getRideListProcedure = protectedProcedure
  .input(
    z
      .object({
        limit: z.number().int().min(1).max(200).optional().default(50),
        status: z.enum(['active', 'full', 'cancelled', 'finished', 'expired']).optional(),
      })
      .optional()
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    await ensureAdmin(supabase, user.id);

    let query = supabase
      .from('ride_offers')
      .select(`
        *,
        driver:profiles(id, full_name, phone, avatar_url),
        bookings:ride_bookings(id, status)
      `)
      .order('created_at', { ascending: false })
      .limit(input?.limit ?? 50);

    if (input?.status) {
      query = query.eq('status', input.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Admin get ride list error:', error);
      throw new Error(error.message || 'Yolculuklar alınamadı');
    }

    return (data || []).map((ride: any) => ({
      id: ride.id,
      departure_title: ride.departure_title,
      destination_title: ride.destination_title,
      departure_time: ride.departure_time,
      status: ride.status,
      price_per_seat: ride.price_per_seat,
      total_seats: ride.total_seats,
      available_seats: ride.available_seats,
      driver_full_name: ride.driver_full_name,
      driver_phone: ride.driver_phone,
      vehicle_brand: ride.vehicle_brand,
      vehicle_model: ride.vehicle_model,
      vehicle_plate: ride.vehicle_plate,
      driver: ride.driver
        ? {
            id: ride.driver.id,
            full_name: ride.driver.full_name,
            phone: ride.driver.phone,
            avatar_url: ride.driver.avatar_url,
          }
        : null,
      bookings_count: ride.bookings?.length || 0,
      created_at: ride.created_at,
    }));
  });

