import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { TRPCError } from '@trpc/server';

export const leaveRoomProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { data: room, error: roomError } = await ctx.supabase
      .from('chat_rooms')
      .select('id, type, created_by')
      .eq('id', input.roomId)
      .single();

    if (roomError || !room) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Grup bulunamadı' });
    }

    if (room.type !== 'group') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sadece gruplardan ayrılabilirsiniz',
      });
    }

    if (room.created_by === userId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Grup kurucusu ayrılmak yerine grubu silebilir',
      });
    }

    const { error: deleteError } = await ctx.supabase
      .from('chat_members')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', userId);

    if (deleteError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Gruptan ayrılamadınız',
      });
    }

    return { success: true };
  });


