import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const approveBookingProcedure = protectedProcedure
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
      throw new Error('Bu rezervasyonu onaylama yetkiniz yok');
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from('ride_bookings')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', input.booking_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Available seats will be updated automatically by trigger

    // Get driver profile
    const { data: driverProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, verified')
      .eq('id', user.id)
      .single();

    const driverName = driverProfile?.full_name || 'Sürücü';
    const rideRoute = `${booking.ride.departure_title} → ${booking.ride.destination_title}`;

    // Create notification for passenger
    try {
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          user_id: booking.passenger_id,
          type: 'RESERVATION',
          title: 'Rezervasyon Onaylandı',
          body: `${driverName} yolculuk rezervasyonunuzu onayladı`,
          message: `${driverName} ${rideRoute} yolculuk rezervasyonunuzu onayladı`,
          data: {
            type: 'RIDE_BOOKING_APPROVED',
            ride_offer_id: booking.ride_offer_id,
            booking_id: input.booking_id,
            driver_id: user.id,
            driver_name: driverName,
            status: 'approved',
          },
          push_sent: false,
          is_deleted: false,
        })
        .select()
        .single();

      // Send push notification to passenger
      if (notification) {
        const { data: passengerProfile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', booking.passenger_id)
          .maybeSingle();

        if (passengerProfile?.push_token) {
          try {
            const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
            await fetch(expoPushUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
              },
              body: JSON.stringify({
                to: passengerProfile.push_token,
                sound: 'default',
                title: 'Rezervasyon Onaylandı',
                body: `${driverName} yolculuk rezervasyonunuzu onayladı`,
                data: {
                  type: 'RESERVATION',
                  booking_id: input.booking_id,
                  ride_offer_id: booking.ride_offer_id,
                },
                badge: 1,
              }),
            });

            await supabase
              .from('notifications')
              .update({ push_sent: true })
              .eq('id', notification.id);
          } catch (pushError) {
            console.error('Push notification error:', pushError);
          }
        }
      }
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
    }

    // Send message to passenger in chat
    try {
      // Find or create direct chat room
      const { data: existingRooms } = await supabase
        .from('chat_members')
        .select('room_id, chat_rooms!inner(*)')
        .eq('user_id', user.id)
        .eq('chat_rooms.type', 'direct');

      let roomId: string | null = null;

      if (existingRooms) {
        for (const room of existingRooms) {
          const { data: members } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('room_id', room.room_id);

          const memberUserIds = (members || []).map((m: any) => m.user_id);
          if (
            memberUserIds.length === 2 &&
            memberUserIds.includes(user.id) &&
            memberUserIds.includes(booking.passenger_id)
          ) {
            roomId = room.room_id;
            break;
          }
        }
      }

      if (!roomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            type: 'direct',
            created_by: user.id,
          })
          .select('id')
          .single();

        if (!roomError && newRoom) {
          roomId = newRoom.id;
          await supabase.from('chat_members').insert([
            { room_id: roomId, user_id: user.id, role: 'member' },
            { room_id: roomId, user_id: booking.passenger_id, role: 'member' },
          ]);
        }
      }

      if (roomId) {
        await supabase.from('messages').insert({
          room_id: roomId,
          user_id: user.id,
          content: `Rezervasyonunuz onaylandı! ${rideRoute} yolculuğunda görüşmek üzere.`,
          data: {
            type: 'RIDE_BOOKING_APPROVED',
            booking_id: input.booking_id,
            ride_offer_id: booking.ride_offer_id,
            status: 'approved',
          },
        });

        await supabase
          .from('chat_rooms')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', roomId);
      }
    } catch (chatError) {
      console.error('Chat message error:', chatError);
    }

    return updatedBooking;
  });

