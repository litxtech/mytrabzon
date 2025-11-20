import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const createRideProcedure = protectedProcedure
  .input(
    z.object({
      departure_title: z.string().min(1).max(200),
      departure_description: z.string().optional().nullable(),
      destination_title: z.string().min(1).max(200),
      destination_description: z.string().optional().nullable(),
      stops: z.array(z.string()).default([]),
      departure_time: z.string().datetime(),
      total_seats: z.number().int().min(1).max(10),
      price_per_seat: z.number().int().min(0).max(5000).nullable().optional(),
      notes: z.string().optional().nullable(),
      allow_pets: z.boolean().default(false),
      allow_smoking: z.boolean().default(false),
      vehicle_brand: z.string().min(2).max(120),
      vehicle_model: z.string().min(1).max(120),
      vehicle_color: z.string().min(2).max(60),
      vehicle_plate: z.string().min(4).max(20),
      driver_full_name: z.string().min(3).max(160),
      driver_phone: z.string().min(10).max(20),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;
    if (!user) throw new Error('Unauthorized');

    // Build raw fields
    const departure_raw = `${input.departure_title}${input.departure_description ? ' - ' + input.departure_description : ''}`.trim();
    const destination_raw = `${input.destination_title}${input.destination_description ? ' - ' + input.destination_description : ''}`.trim();
    const stops_raw = input.stops.length > 0 ? input.stops.join(' | ') : null;

    // Calculate expires_at (departure_time + 1 hour)
    const departureTime = new Date(input.departure_time);
    const expiresAt = new Date(departureTime.getTime() + 60 * 60 * 1000); // +1 hour

    // Insert ride offer
    const { data, error } = await supabase
      .from('ride_offers')
      .insert({
        driver_id: user.id,
        departure_title: input.departure_title,
        departure_description: input.departure_description || null,
        departure_raw,
        destination_title: input.destination_title,
        destination_description: input.destination_description || null,
        destination_raw,
        stops_text: input.stops,
        stops_raw,
        departure_time: departureTime.toISOString(),
        total_seats: input.total_seats,
        available_seats: input.total_seats,
        price_per_seat: input.price_per_seat && input.price_per_seat > 0 ? input.price_per_seat : null,
        currency: 'TL',
        notes: input.notes || null,
        allow_pets: input.allow_pets,
        allow_smoking: input.allow_smoking,
        vehicle_brand: input.vehicle_brand,
        vehicle_model: input.vehicle_model,
        vehicle_color: input.vehicle_color,
        vehicle_plate: input.vehicle_plate,
        driver_full_name: input.driver_full_name,
        driver_phone: input.driver_phone.trim(),
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Create ride error:', error);
      throw new Error(error.message || 'Yolculuk oluşturulamadı');
    }

    return data;
  });

