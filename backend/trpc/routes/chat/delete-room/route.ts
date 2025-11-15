import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { TRPCError } from '@trpc/server';

export const deleteRoomProcedure = protectedProcedure
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

    if (room.created_by !== userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Sadece grubu kuran kişi silebilir',
      });
    }

    const { error: deleteMessagesError } = await ctx.supabase
      .from('messages')
      .delete()
      .eq('room_id', room.id);

    if (deleteMessagesError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Mesajlar silinemedi',
      });
    }

    const { error: deleteMembersError } = await ctx.supabase
      .from('chat_members')
      .delete()
      .eq('room_id', room.id);

    if (deleteMembersError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Üyeler silinemedi',
      });
    }

    const { error: deleteRoomError } = await ctx.supabase
      .from('chat_rooms')
      .delete()
      .eq('id', room.id);

    if (deleteRoomError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Grup silinemedi',
      });
    }

    return { success: true };
  });


