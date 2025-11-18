import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const getRideDetailProcedure = protectedProcedure
  .input(
    z.object({
      ride_id: z.string().uuid(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    const { data, error } = await supabase
      .from('ride_offers')
      .select(`
        *,
        driver:profiles(id, full_name, avatar_url, verified, phone, bio)
      `)
      .eq('id', input.ride_id)
      .single();

    if (error) {
      console.error('Get ride detail error:', error);
      throw new Error(error.message || 'Yolculuk bulunamadı');
    }

    if (!data) {
      throw new Error('Yolculuk bulunamadı');
    }

    // Check if user has pending booking
    let userBooking = null;
    if (user) {
      const { data: booking } = await supabase
        .from('ride_bookings')
        .select('*')
        .eq('ride_offer_id', input.ride_id)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      userBooking = booking;
    }

    // If driver, load all bookings
    let driverBookings: any[] = [];
    if (user && data.driver_id === user.id) {
      const { data: bookingRows } = await supabase
        .from('ride_bookings')
        .select(`
          *,
          passenger:profiles(id, full_name, avatar_url, verified, phone)
        `)
        .eq('ride_offer_id', input.ride_id)
        .order('created_at', { ascending: true });

      driverBookings = bookingRows ?? [];
    }

    const { driver_phone, ...rideData } = data as any;
    const sanitizedUserBooking = userBooking
      ? (({ passenger_phone, ...rest }) => rest)(userBooking)
      : null;
    const sanitizedDriverBookings = driverBookings.map((booking) => {
      const { passenger_phone, ...rest } = booking;
      return rest;
    });

    return {
      ride: rideData,
      userBooking: sanitizedUserBooking,
      bookings: sanitizedDriverBookings,
      isDriver: user ? data.driver_id === user.id : false,
    };
  });

