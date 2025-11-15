import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { TRPCError } from '@trpc/server';

export const deleteAllMessagesProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string().uuid(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    // Check if user is a member of the room
    const { data: member, error: memberError } = await ctx.supabase
      .from('chat_members')
      .select('room_id, role')
      .eq('room_id', input.roomId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Bu odaya erişim yetkiniz yok',
      });
    }

    // Check if user is the room creator or has admin role
    const { data: room, error: roomError } = await ctx.supabase
      .from('chat_rooms')
      .select('created_by, type')
      .eq('id', input.roomId)
      .single();

    if (roomError || !room) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Oda bulunamadı',
      });
    }

    // Only room creator or admin can delete all messages
    if (room.created_by !== userId && member.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Sadece oda kurucusu veya admin tüm mesajları silebilir',
      });
    }

    // Delete all messages in the room
    const { error: deleteError } = await ctx.supabase
      .from('messages')
      .delete()
      .eq('room_id', input.roomId);

    if (deleteError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Mesajlar silinemedi',
      });
    }

    return { success: true, deletedCount: 'all' };
  });

