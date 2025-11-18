import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

const CLEANUP_OFFSET_MINUTES = 10;
const UPCOMING_BUFFER_MINUTES = 5;

const maskPlate = (plate?: string | null) => {
  if (!plate) return plate;
  const trimmed = plate.trim();
  if (trimmed.length <= 2) return '*'.repeat(trimmed.length);
  const visibleLength = Math.max(2, trimmed.length - 3);
  const visible = trimmed.slice(0, visibleLength);
  const hidden = '*'.repeat(trimmed.length - visibleLength);
  return `${visible}${hidden}`;
};

export const getDriverRidesProcedure = protectedProcedure
  .input(
    z.object({
      driver_id: z.string().uuid(),
      includePast: z.boolean().optional().default(true),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase } = ctx;

    const cleanupThreshold = new Date(Date.now() - CLEANUP_OFFSET_MINUTES * 60 * 1000).toISOString();

    // Güncel olmayan ilanları temizle (yalnızca belirli bir toleranstan sonra)
    await supabase
      .from('ride_offers')
      .update({ status: 'expired' })
      .lt('departure_time', cleanupThreshold)
      .eq('status', 'active');

    const { data, error } = await supabase
      .from('ride_offers')
      .select('*')
      .eq('driver_id', input.driver_id)
      .order('departure_time', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Yolculuklar getirilemedi');
    }

    const upcomingThreshold = new Date(Date.now() - UPCOMING_BUFFER_MINUTES * 60 * 1000);

    const rides = (data || []).map((ride) => {
      const { driver_phone, ...rest } = ride;
      return {
        ...rest,
        vehicle_plate: maskPlate(rest.vehicle_plate),
        is_past: new Date(ride.departure_time) < upcomingThreshold,
      };
    });

    const upcoming = rides.filter((ride) => !ride.is_past && ride.status === 'active');
    const past = input.includePast ? rides.filter((ride) => ride.is_past || ride.status !== 'active') : [];

    return { upcoming, past };
  });

