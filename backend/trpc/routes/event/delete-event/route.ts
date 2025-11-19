import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '../../../create-context';

export const deleteEventProcedure = protectedProcedure
  .input(
    z.object({
      event_id: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, user } = ctx;

    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id, user_id')
      .eq('id', input.event_id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !event) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Olay bulunamadı veya silinmiş' });
    }

    if (event.user_id !== user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Bu olayı silme yetkiniz yok' });
    }

    const { error: deleteError } = await supabase
      .from('events')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.event_id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: deleteError.message });
    }

    return { success: true };
  });

