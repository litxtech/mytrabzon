import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const createReviewProcedure = protectedProcedure
  .input(
    z.object({
      booking_id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional().nullable(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    const { data: booking, error: bookingError } = await supabase
      .from('ride_bookings')
      .select(`
        *,
        ride:ride_offers(id, driver_id, departure_time)
      `)
      .eq('id', input.booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Rezervasyon bulunamadı');
    }

    // Passenger can review driver, driver can review passenger
    const isPassenger = booking.passenger_id === user.id;
    const isDriver = booking.ride.driver_id === user.id;

    if (!isPassenger && !isDriver) {
      throw new Error('Bu rezervasyon size ait değil');
    }

    if (booking.status !== 'approved') {
      throw new Error('Sadece onaylanan rezervasyonlar değerlendirilebilir');
    }

    if (!booking.completed_at) {
      throw new Error('Yolculuk tamamlanmadan değerlendirme bırakılamaz');
    }

    // Check if already reviewed
    const { data: existingReview } = await supabase
      .from('ride_reviews')
      .select('id')
      .eq('booking_id', input.booking_id)
      .eq('reviewed_by', user.id)
      .maybeSingle();

    if (existingReview) {
      throw new Error('Bu yolculuk için zaten bir yorum bıraktınız');
    }

    // Determine who is being reviewed
    const reviewedUserId = isPassenger ? booking.ride.driver_id : booking.passenger_id;

    const { data: review, error } = await supabase
      .from('ride_reviews')
      .insert({
        ride_offer_id: booking.ride_offer_id,
        booking_id: booking.id,
        passenger_id: booking.passenger_id,
        driver_id: booking.ride.driver_id,
        reviewed_by: user.id,
        reviewed_user_id: reviewedUserId,
        rating: input.rating,
        comment: input.comment || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create review error:', error);
      throw new Error(error.message || 'Yorum kaydedilemedi');
    }

    // Update reviewed_at
    await supabase
      .from('ride_bookings')
      .update({ reviewed_at: new Date().toISOString() })
      .eq('id', input.booking_id);

    return review;
  });

