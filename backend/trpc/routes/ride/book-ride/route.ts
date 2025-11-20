import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const bookRideProcedure = protectedProcedure
  .input(
    z.object({
      ride_offer_id: z.string().uuid(),
      seats_requested: z.number().int().min(1).max(5).default(1),
      notes: z.string().optional().nullable(),
      passenger_phone: z.string().min(10).max(20),
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
        passenger_phone: input.passenger_phone.trim(),
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Book ride error:', error);
      throw new Error(error.message || 'Rezervasyon oluşturulamadı');
    }

    // Get passenger profile
    const { data: passengerProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, verified')
      .eq('id', user.id)
      .single();

    const passengerName = passengerProfile?.full_name || 'Bir kullanıcı';

    // Create notification for driver
    try {
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          user_id: ride.driver_id,
          type: 'RESERVATION',
          title: 'Yeni Yolculuk Rezervasyonu',
          body: `${passengerName} yolculuğunuza ${input.seats_requested} koltuk için rezervasyon yaptı`,
          message: `${passengerName} yolculuğunuza ${input.seats_requested} koltuk için rezervasyon yaptı`,
          data: {
            type: 'RIDE_BOOKING',
            ride_offer_id: input.ride_offer_id,
            booking_id: data.id,
            passenger_id: user.id,
            passenger_name: passengerName,
            seats_requested: input.seats_requested,
            status: 'pending',
          },
          push_sent: false,
          is_deleted: false,
        })
        .select()
        .single();

      // Send push notification to driver
      if (notification) {
        const { data: driverProfile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', ride.driver_id)
          .maybeSingle();

        if (driverProfile?.push_token) {
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
                to: driverProfile.push_token,
                sound: 'default',
                title: 'Yeni Yolculuk Rezervasyonu',
                body: `${passengerName} yolculuğunuza ${input.seats_requested} koltuk için rezervasyon yaptı`,
                data: {
                  type: 'RESERVATION',
                  booking_id: data.id,
                  ride_offer_id: input.ride_offer_id,
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
      // Bildirim hatası olsa bile rezervasyon oluşturuldu, devam et
    }

    // Create or get direct chat room between driver and passenger
    try {
      // Check if direct chat room exists
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
            memberUserIds.includes(ride.driver_id)
          ) {
            roomId = room.room_id;
            break;
          }
        }
      }

      // Create new room if doesn't exist
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
          // Add both users as members
          await supabase.from('chat_members').insert([
            { room_id: roomId, user_id: user.id, role: 'member' },
            { room_id: roomId, user_id: ride.driver_id, role: 'member' },
          ]);
        }
      }

      // Send reservation message if room exists
      if (roomId) {
        const rideRoute = `${ride.departure_title} → ${ride.destination_title}`;
        const messageContent = `Merhaba! ${rideRoute} yolculuğunuza ${input.seats_requested} koltuk için rezervasyon yaptım.${input.notes ? ` Not: ${input.notes}` : ''}`;

        await supabase.from('messages').insert({
          room_id: roomId,
          user_id: user.id,
          content: messageContent,
          data: {
            type: 'RIDE_BOOKING',
            booking_id: data.id,
            ride_offer_id: input.ride_offer_id,
            seats_requested: input.seats_requested,
            status: 'pending',
          },
        });

        // Update room last_message_at
        await supabase
          .from('chat_rooms')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', roomId);
      }
    } catch (chatError) {
      console.error('Chat creation error:', chatError);
      // Chat hatası olsa bile rezervasyon oluşturuldu, devam et
    }

    return data;
  });

