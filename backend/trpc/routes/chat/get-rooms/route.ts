import { z } from 'zod';
import { protectedProcedure } from '@/backend/trpc/create-context';

export const getRoomsProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.user.id;

    const { data: rooms, error } = await ctx.supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_members!inner(
          id,
          user_id,
          role,
          unread_count,
          last_read_at
        )
      `)
      .eq('chat_members.user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (error) {
      console.error('Error fetching chat rooms:', error);
      throw new Error('Failed to fetch chat rooms');
    }

    const roomsWithLastMessage = await Promise.all(
      (rooms || []).map(async (room) => {
        const { data: lastMessage } = await ctx.supabase
          .from('messages')
          .select('*, user:user_profiles(*)')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { data: members } = await ctx.supabase
          .from('chat_members')
          .select('*, user:user_profiles(*)')
          .eq('room_id', room.id);

        let otherUser = null;
        if (room.type === 'direct' && members && members.length === 2) {
          otherUser = members.find((m: any) => m.user_id !== userId)?.user || null;
        }

        const currentMember = room.chat_members.find((m: any) => m.user_id === userId);

        return {
          ...room,
          last_message: lastMessage || null,
          members: members || [],
          other_user: otherUser,
          unread_count: currentMember?.unread_count || 0,
        };
      })
    );

    return roomsWithLastMessage;
  });
