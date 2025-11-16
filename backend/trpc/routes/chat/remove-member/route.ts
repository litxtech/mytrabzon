import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { TRPCError } from '@trpc/server';

export const removeMemberProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string().uuid(),
      memberId: z.string().uuid(),
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
        message: 'Sadece gruplardan üye çıkarabilirsiniz',
      });
    }

    // Admin rolü kontrolü - add-members ile tutarlı olması için
    const { data: membership, error: membershipError } = await ctx.supabase
      .from('chat_members')
      .select('role')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Üyeleri çıkarmak için yetkiniz yok',
      });
    }

    if (input.memberId === room.created_by) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Grup kurucusu çıkarılamaz',
      });
    }

    const { data: member, error: memberError } = await ctx.supabase
      .from('chat_members')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', input.memberId)
      .single();

    if (memberError || !member) {
      return { removed: false };
    }

    const { error: deleteError } = await ctx.supabase
      .from('chat_members')
      .delete()
      .eq('id', member.id);

    if (deleteError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Üye çıkarılamadı',
      });
    }

    return { removed: true };
  });


