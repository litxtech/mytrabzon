import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const rejectBookingProcedure = protectedProcedure
  .input(
    z.object({
      booking_id: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    // Get booking with ride info
    const { data: booking, error: bookingError } = await supabase
      .from('ride_bookings')
      .select('*, ride:ride_offers(driver_id, departure_title, destination_title)')
      .eq('id', input.booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Rezervasyon bulunamadı');
    }

    // Check if user is the driver
    if (booking.ride.driver_id !== user.id) {
      throw new Error('Bu rezervasyonu reddetme yetkiniz yok');
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('ride_bookings')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', input.booking_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // TODO: Create notification and send push notification to passenger

    return updatedBooking;
  });

