import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';
import { ensureAdmin } from '../utils';

export const getRideDetailProcedure = protectedProcedure
  .input(z.object({ ride_id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    await ensureAdmin(supabase, user.id);

    const { data, error } = await supabase
      .from('ride_offers')
      .select(`
        *,
        driver:profiles(id, full_name, phone, avatar_url),
        bookings:ride_bookings(
          *,
          passenger:profiles(id, full_name, phone, avatar_url)
        )
      `)
      .eq('id', input.ride_id)
      .single();

    if (error || !data) {
      console.error('Admin get ride detail error:', error);
      throw new Error(error?.message || 'Yolculuk bulunamadı');
    }

    const bookings = (data.bookings || []).map((booking: any) => ({
      id: booking.id,
      passenger_id: booking.passenger_id,
      passenger_name: booking.passenger?.full_name || 'Bilinmiyor',
      passenger_phone: booking.passenger_phone,
      seats_requested: booking.seats_requested,
      status: booking.status,
      notes: booking.notes,
      created_at: booking.created_at,
    }));

    return {
      ride: {
        id: data.id,
        departure_title: data.departure_title,
        departure_description: data.departure_description,
        destination_title: data.destination_title,
        destination_description: data.destination_description,
        departure_time: data.departure_time,
        total_seats: data.total_seats,
        available_seats: data.available_seats,
        price_per_seat: data.price_per_seat,
        status: data.status,
        vehicle_brand: data.vehicle_brand,
        vehicle_model: data.vehicle_model,
        vehicle_color: data.vehicle_color,
        vehicle_plate: data.vehicle_plate,
        driver_full_name: data.driver_full_name,
        driver_phone: data.driver_phone,
        notes: data.notes,
        created_at: data.created_at,
      },
      driver: data.driver
        ? {
            id: data.driver.id,
            full_name: data.driver.full_name,
            phone: data.driver.phone,
            avatar_url: data.driver.avatar_url,
          }
        : null,
      bookings,
    };
  });

