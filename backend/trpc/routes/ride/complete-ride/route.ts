import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const completeRideProcedure = protectedProcedure
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
      throw new Error('Bu yolculuğu tamamlama yetkiniz yok');
    }

    // Check if booking is approved
    if (booking.status !== 'approved') {
      throw new Error('Sadece onaylanmış rezervasyonlar tamamlanabilir');
    }

    // Check if already completed
    if (booking.completed_at) {
      throw new Error('Bu yolculuk zaten tamamlanmış');
    }

    // Update booking with completed_at
    const { data: updatedBooking, error: updateError } = await supabase
      .from('ride_bookings')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', input.booking_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Trigger will send notification automatically

    return updatedBooking;
  });

