import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const bookRideProcedure = protectedProcedure
  .input(
    z.object({
      ride_offer_id: z.string().uuid(),
      seats_requested: z.number().int().min(1).max(5).default(1),
      notes: z.string().optional().nullable(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    // Check if ride exists and has available seats
    const { data: ride, error: rideError } = await supabase
      .from('ride_offers')
      .select('*')
      .eq('id', input.ride_offer_id)
      .eq('status', 'active')
      .single();

    if (rideError || !ride) {
      throw new Error('Yolculuk bulunamadı veya aktif değil');
    }

    // Check if user is the driver
    if (ride.driver_id === user.id) {
      throw new Error('Kendi yolculuğunuza rezervasyon yapamazsınız');
    }

    // Check available seats
    if (ride.available_seats < input.seats_requested) {
      throw new Error(`Sadece ${ride.available_seats} boş koltuk var`);
    }

    // Check if user already has a booking
    const { data: existingBooking } = await supabase
      .from('ride_bookings')
      .select('*')
      .eq('ride_offer_id', input.ride_offer_id)
      .eq('passenger_id', user.id)
      .maybeSingle();

    if (existingBooking) {
      if (existingBooking.status === 'pending') {
        throw new Error('Bu yolculuk için zaten bekleyen bir rezervasyonunuz var');
      }
      if (existingBooking.status === 'approved') {
        throw new Error('Bu yolculuk için zaten onaylanmış bir rezervasyonunuz var');
      }
    }

    // Create booking
    const { data, error } = await supabase
      .from('ride_bookings')
      .insert({
        ride_offer_id: input.ride_offer_id,
        passenger_id: user.id,
        seats_requested: input.seats_requested,
        notes: input.notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Book ride error:', error);
      throw new Error(error.message || 'Rezervasyon oluşturulamadı');
    }

    // Send notification to driver (optional - can be implemented later)
    // TODO: Send push notification to driver

    return data;
  });

