import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const getRideDetailProcedure = protectedProcedure
  .input(
    z.object({
      rideId: z.string().uuid(),
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
      .eq('id', input.rideId)
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
        .eq('ride_offer_id', input.rideId)
        .eq('passenger_id', user.id)
        .maybeSingle();
      
      userBooking = booking;
    }

    return {
      ride: data,
      userBooking,
    };
  });

