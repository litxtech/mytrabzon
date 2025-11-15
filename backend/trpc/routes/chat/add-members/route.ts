import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';
import { TRPCError } from '@trpc/server';

export const addMembersProcedure = protectedProcedure
  .input(
    z.object({
      roomId: z.string().uuid(),
      memberIds: z.array(z.string().uuid()).min(1),
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
        message: 'Sadece gruplara üye eklenebilir',
      });
    }

    const { data: membership, error: membershipError } = await ctx.supabase
      .from('chat_members')
      .select('role')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Üye eklemek için yetkiniz yok',
      });
    }

    const { data: existingMembers } = await ctx.supabase
      .from('chat_members')
      .select('user_id')
      .eq('room_id', room.id);

    const existingIds = new Set((existingMembers || []).map((m) => m.user_id));

    const inserts = input.memberIds
      .filter((memberId) => memberId !== userId && !existingIds.has(memberId))
      .map((memberId) => ({
        room_id: room.id,
        user_id: memberId,
        role: 'member' as const,
      }));

    if (inserts.length === 0) {
      return { addedCount: 0 };
    }

    const { error: insertError } = await ctx.supabase.from('chat_members').insert(inserts);

    if (insertError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Üyeler eklenemedi',
      });
    }

    return { addedCount: inserts.length };
  });


